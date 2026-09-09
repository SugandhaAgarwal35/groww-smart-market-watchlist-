import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ApiClient,
  isHtmlContent,
  isTemporaryFailure,
} from "../../web/src/lib/api.js";

describe("Cold-Start Resilience & Retry Audit Tests", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("HTML & Non-JSON Detection & Sanitization", () => {
    it("identifies Render edge HTML spin-up/502 error pages", () => {
      const renderHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><style>:root { --text-strong: #0d0d0d; }</style></head><body>Service Unavailable</body></html>`;
      expect(isHtmlContent(renderHtml, "text/html")).toBe(true);
      expect(isHtmlContent(renderHtml, null)).toBe(true);
    });

    it("identifies Nginx HTML error pages", () => {
      const nginxHtml = `<html><head><title>504 Gateway Time-out</title></head><body><center><h1>504 Gateway Time-out</h1></center><hr><center>nginx</center></body></html>`;
      expect(isHtmlContent(nginxHtml, "text/html; charset=utf-8")).toBe(true);
      expect(isHtmlContent(nginxHtml, null)).toBe(true);
    });

    it("does not falsely identify valid JSON as HTML", () => {
      const validJson = JSON.stringify([{ id: "1", symbol: "PCJEWELLER", name: "PC Jeweller" }]);
      expect(isHtmlContent(validJson, "application/json")).toBe(false);
      expect(isHtmlContent(validJson, null)).toBe(false);
    });
  });

  describe("Temporary vs Permanent Failure Classification", () => {
    it("classifies 502, 503, and 504 as temporary retryable failures", () => {
      expect(isTemporaryFailure(502, false)).toBe(true);
      expect(isTemporaryFailure(503, false)).toBe(true);
      expect(isTemporaryFailure(504, false)).toBe(true);
      expect(isTemporaryFailure(500, true)).toBe(true);
    });

    it("does NOT classify 400, 401, 403, 404 as temporary retryable failures", () => {
      expect(isTemporaryFailure(400, false)).toBe(false);
      expect(isTemporaryFailure(401, false)).toBe(false);
      expect(isTemporaryFailure(403, false)).toBe(false);
      expect(isTemporaryFailure(404, false)).toBe(false);
    });
  });

  describe("API Client Cold-Start Retry Execution", () => {
    it("Test A: succeeds immediately on attempt 1 when backend is awake", async () => {
      const client = new ApiClient();
      const mockData = [{ id: "sec-1", symbol: "PCJEWELLER", name: "PC Jeweller Limited" }];

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => JSON.stringify(mockData),
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const results = await client.searchSecurities("pc");
      expect(results).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("Test B & E: retries on 503 Service Unavailable and succeeds when backend wakes up", async () => {
      const client = new ApiClient();
      const mockData = [{ id: "sec-1", symbol: "PCJEWELLER", name: "PC Jeweller Limited" }];
      const retryAttempts: number[] = [];

      let callCount = 0;
      const fetchMock = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // Render backend sleeping / cold start
          return {
            ok: false,
            status: 503,
            headers: new Headers({ "content-type": "text/html" }),
            text: async () => "<!DOCTYPE html><html><body>Starting service...</body></html>",
          };
        }
        // Backend awake on retry
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: async () => JSON.stringify(mockData),
        };
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const results = await client.searchSecurities("pc", {
        maxRetries: 2,
        onRetry: (attempt) => retryAttempts.push(attempt),
      });

      expect(results).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(retryAttempts).toContain(1);
    });

    it("Test C & E: retries on 502 Bad Gateway and succeeds when backend recovers", async () => {
      const client = new ApiClient();
      const mockData = [{ id: "sec-1", symbol: "PCJEWELLER", name: "PC Jeweller Limited" }];
      let callCount = 0;

      const fetchMock = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: false,
            status: 502,
            headers: new Headers({ "content-type": "text/html" }),
            text: async () => "<!DOCTYPE html><html><body>502 Bad Gateway</body></html>",
          };
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: async () => JSON.stringify(mockData),
        };
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const results = await client.searchSecurities("pc");
      expect(results).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("Test D & E: retries on 504 Gateway Timeout and succeeds", async () => {
      const client = new ApiClient();
      const mockData = [{ id: "sec-1", symbol: "PCJEWELLER", name: "PC Jeweller Limited" }];
      let callCount = 0;

      const fetchMock = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: false,
            status: 504,
            headers: new Headers({ "content-type": "text/html" }),
            text: async () => "<html>504 Gateway Timeout</html>",
          };
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: async () => JSON.stringify(mockData),
        };
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const results = await client.searchSecurities("pc");
      expect(results).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("Test F & G: converts HTML response into clean error message and NEVER leaks raw HTML", async () => {
      const client = new ApiClient();
      const renderHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><style>:root { --text-strong: #0d0d0d; }</style></head><body>Render Service Unavailable</body></html>`;

      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => renderHtml,
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await expect(client.searchSecurities("pc", { maxRetries: 0 })).rejects.toThrow(
        "Service is waking up. Please try again in a few seconds."
      );

      try {
        await client.searchSecurities("pc", { maxRetries: 0 });
      } catch (err: unknown) {
        const msg = (err as Error).message;
        expect(msg).not.toContain("<!DOCTYPE");
        expect(msg).not.toContain("<html");
        expect(msg).not.toContain("--text-strong");
        expect(msg).toBe("Service is waking up. Please try again in a few seconds.");
      }
    });

    it("Test H: normal 404 does NOT trigger retry", async () => {
      const client = new ApiClient();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => JSON.stringify({ message: "Not found" }),
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await expect(client.searchSecurities("unknown")).rejects.toThrow("Not found");
      // Must NOT retry
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});

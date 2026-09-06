import React, { useState, useEffect } from "react";
import type { SecuritySearchResult } from "@watchlist/contracts";
import { api } from "../lib/api.js";

interface SecuritySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlistId: string;
  existingSecurityIds?: string[];
  onAdded: (security: SecuritySearchResult, status?: string) => void;
}

export const SecuritySearchModal: React.FC<SecuritySearchModalProps> = ({
  isOpen,
  onClose,
  watchlistId,
  existingSecurityIds = [],
  onAdded,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SecuritySearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setErrorMsg(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const data = await api.searchSecurities(query);
        setResults(data);
      } catch (err) {
        console.error("Search error:", err);
        setErrorMsg((err as Error).message || "Failed to search securities");
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const handleAdd = async (sec: SecuritySearchResult) => {
    setAddingId(sec.id);
    setErrorMsg(null);
    try {
      const res = await api.addSecurity(watchlistId, sec.id);
      onAdded(sec, res?.status);
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to add security");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#EAECF0] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
        {/* Search Input Header */}
        <div className="p-4 border-b border-[#EAECF0] flex items-center justify-between gap-3">
          <div className="relative w-full">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7E8C]"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search stocks by name or symbol (e.g. PC Jeweller, INFY, HDFC Bank)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full bg-[#F4F6F8] border border-[#EAECF0] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#1E222D] placeholder-[#7C7E8C] focus:outline-none focus:border-[#00B386] focus:bg-white transition-all"
            />
          </div>
          <button
            onClick={onClose}
            className="text-[#7C7E8C] hover:text-[#1E222D] text-lg font-bold p-1 rounded-md transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Inline Error if any */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-3 bg-[#FDF2F2] border border-[#EB5757]/30 rounded-xl text-xs text-[#EB5757] flex items-center justify-between">
            <span>{errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-[#EB5757] font-bold text-xs hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Results List */}
        <div className="p-3 max-h-80 overflow-y-auto space-y-1 divide-y divide-[#EAECF0]/60">
          {isLoading && (
            <div className="text-center py-8 text-xs text-[#7C7E8C]">
              Searching securities universe...
            </div>
          )}

          {!isLoading && results.length === 0 && (
            <div className="text-center py-8 text-xs text-[#7C7E8C]">
              {query ? `No securities found matching "${query}".` : "Type a symbol or company name to search."}
            </div>
          )}

          {results.map((sec) => {
            const isAlreadyAdded = existingSecurityIds.includes(sec.id);
            const isAdding = addingId === sec.id;

            return (
              <div
                key={sec.id}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-[#F9FAFB] transition-colors"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[#1E222D] text-sm">
                      {sec.symbol}
                    </span>
                    <span className="text-[10px] bg-[#F4F6F8] border border-[#EAECF0] text-[#7C7E8C] px-1.5 py-0.5 rounded font-mono">
                      {sec.exchange}
                    </span>
                    {sec.sectorName && (
                      <span className="text-[11px] text-[#00B386] font-medium truncate max-w-[160px]">
                        {sec.sectorName}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#7C7E8C] mt-0.5 truncate">{sec.name}</div>
                </div>

                {isAlreadyAdded ? (
                  <span className="text-[11px] font-semibold text-[#7C7E8C] bg-[#F4F6F8] border border-[#EAECF0] px-3 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0">
                    <span>✓</span> In Watchlist
                  </span>
                ) : (
                  <button
                    onClick={() => handleAdd(sec)}
                    disabled={isAdding}
                    className="bg-[#00B386] text-white hover:bg-[#009E77] text-xs font-semibold py-1.5 px-3.5 rounded-lg shadow-sm transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {isAdding ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Adding...</span>
                      </>
                    ) : (
                      <span>+ Add</span>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

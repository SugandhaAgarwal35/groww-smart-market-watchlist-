# ──────────────────────────────────────────────────────────────
# Build Stage
# ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY apps/api/package.json ./apps/api/

# Install all dependencies (including dev)
RUN npm install --ignore-scripts=false --force

# Copy source code
COPY packages/contracts ./packages/contracts
COPY apps/api ./apps/api

# Build contracts and api
RUN npm run build -w packages/contracts && npm run build -w apps/api

# ──────────────────────────────────────────────────────────────
# Production Stage
# ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy root workspace files for production install
COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY apps/api/package.json ./apps/api/

# Install production dependencies only
RUN npm install --omit=dev --ignore-scripts=false --force

# Copy built artifacts from builder
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/migrations ./apps/api/migrations

EXPOSE 3000

WORKDIR /app/apps/api
CMD ["node", "dist/server.js"]

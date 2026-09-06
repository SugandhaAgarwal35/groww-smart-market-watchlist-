# ──────────────────────────────────────────────────────────────
# Build Stage
# ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm install --ignore-scripts=false --force

# Copy source code
COPY packages/contracts ./packages/contracts
COPY apps/web ./apps/web

# Build contracts and web app
RUN npm run build -w packages/contracts && npm run build -w apps/web

# ──────────────────────────────────────────────────────────────
# Nginx Runtime Stage
# ──────────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

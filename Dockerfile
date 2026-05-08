FROM node:20-slim AS builder

WORKDIR /app

# Install build deps for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

# Build Next.js (exclude data dir — mounted as volume at runtime)
RUN npm run build

# ---- Production image ----
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update && apt-get install -y python3 curl && rm -rf /var/lib/apt/lists/*

# Copy built app and production deps
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

# Scripts for scraping (run via cron on host, not inside app container)
COPY scripts ./scripts

# Data directory is mounted as a volume at runtime
RUN mkdir -p data

EXPOSE 3000

CMD ["node_modules/.bin/next", "start", "-p", "3000"]

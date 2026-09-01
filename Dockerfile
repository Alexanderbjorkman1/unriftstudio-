# syntax=docker/dockerfile:1

# --- dependencies -----------------------------------------------------------
FROM node:22-slim AS deps
WORKDIR /app
# better-sqlite3 ships prebuilt binaries; the toolchain is only a fallback in
# case the prebuild for this platform cannot be fetched.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# --- build ------------------------------------------------------------------
FROM node:22-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- run --------------------------------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/data/detailflow.db

# The database and uploaded photos live on a mounted volume so they survive
# redeploys. The app creates and seeds the database on first boot.
RUN useradd --create-home --uid 1001 detailflow \
    && mkdir -p /data \
    && chown -R detailflow:detailflow /data

COPY --from=builder --chown=detailflow:detailflow /app/.next/standalone ./
COPY --from=builder --chown=detailflow:detailflow /app/.next/static ./.next/static
COPY --from=builder --chown=detailflow:detailflow /app/public ./public

USER detailflow
VOLUME ["/data"]
EXPOSE 3000

CMD ["node", "server.js"]

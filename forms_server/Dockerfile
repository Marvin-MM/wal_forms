# syntax=docker/dockerfile:1
# =============================================================================
# Multi-stage Dockerfile for WalrusForms Server
# Stage 1: builder — installs deps
# Stage 2: runner  — minimal prod image
# =============================================================================

FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY . .

FROM oven/bun:1-slim AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 walrus && \
    adduser --system --uid 1001 --ingroup walrus walrus
COPY --from=builder --chown=walrus:walrus /app /app
USER walrus
EXPOSE 3000
ENV NODE_ENV=production
CMD ["bun", "run", "src/index.ts"]

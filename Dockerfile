# =========================================================================
# revert.wtf — production image for Coolify (Dockerfile target).
#
# Builds every workspace package, builds the Next.js standalone output, and
# ships a minimal runner. Expose port 3000.
#
# Coolify: choose "Dockerfile" build pack. No build args required.
# =========================================================================

ARG NODE_VERSION=20-bookworm-slim

# -----------------------------------------------------------------------------
# Stage 1: base (pnpm + corepack)
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates python3 make g++ && \
    rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# -----------------------------------------------------------------------------
# Stage 2: dependencies (cacheable layer)
# -----------------------------------------------------------------------------
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/catalog/package.json packages/catalog/package.json
COPY packages/selectors/package.json packages/selectors/package.json
COPY packages/parser/package.json packages/parser/package.json
COPY packages/aa/package.json packages/aa/package.json
COPY packages/client/package.json packages/client/package.json
COPY packages/search/package.json packages/search/package.json
COPY packages/cli/package.json packages/cli/package.json
COPY packages/mcp/package.json packages/mcp/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 2b: production runtime deps for native modules externalized from Next.js
# -----------------------------------------------------------------------------
FROM base AS native-deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/catalog/package.json packages/catalog/package.json
COPY packages/selectors/package.json packages/selectors/package.json
COPY packages/parser/package.json packages/parser/package.json
COPY packages/aa/package.json packages/aa/package.json
COPY packages/client/package.json packages/client/package.json
COPY packages/search/package.json packages/search/package.json
COPY packages/cli/package.json packages/cli/package.json
COPY packages/mcp/package.json packages/mcp/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile --filter @revertwtf/search...

# -----------------------------------------------------------------------------
# Stage 3: build (compile packages + Next.js)
# -----------------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
# Re-link workspace packages after full source copy
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter "./packages/*" build
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @revertwtf/web build

# -----------------------------------------------------------------------------
# Stage 4: runner (small image)
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV RATE_LIMIT_DB_PATH=/data/revertwtf/ratelimit.sqlite
ENV REVERTWTF_CATALOG_DB_PATH=/app/catalog/catalog.sqlite

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates wget && \
    rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /data/revertwtf && \
    mkdir -p /app/catalog && \
    chown -R nextjs:nodejs /data /app/catalog

# Next.js standalone output bundles the server + minimal deps.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/packages/search/dist/data/catalog.sqlite ./catalog/catalog.sqlite
# @revertwtf/catalog requires its shard JSON at runtime via createRequire, which
# Next's standalone tracer does not copy. The bundled chunk resolves them at
# /app/packages/catalog/dist/data/shards, so place them there explicitly.
COPY --from=builder --chown=nextjs:nodejs /app/packages/catalog/dist/data/shards ./packages/catalog/dist/data/shards
COPY --from=native-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=native-deps --chown=nextjs:nodejs /app/packages/search/node_modules ./packages/search/node_modules

USER nextjs
EXPOSE 3000

# Coolify health check — /errors is fast, fully static.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/errors" >/dev/null 2>&1 || exit 1

CMD ["node", "apps/web/server.js"]

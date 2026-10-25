# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN DIRECT_URL=postgresql://build:build@127.0.0.1:5432/build npm ci

FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_SITE_URL
ARG DATABASE_SSL_MODE=verify-full

RUN --mount=type=secret,id=DATABASE_URL,required=true \
    --mount=type=secret,id=DIRECT_URL,required=true \
    DATABASE_URL="$(cat /run/secrets/DATABASE_URL)" \
    DIRECT_URL="$(cat /run/secrets/DIRECT_URL)" \
    NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL}" \
    DATABASE_SSL_MODE="${DATABASE_SSL_MODE}" \
    npm run build

# Run this target as a one-off release job before switching traffic:
# docker build --target migrator -t eloria-migrator .
# docker run --rm --env-file .env eloria-migrator
FROM base AS migrator
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

# Optional independent backup/readiness worker (enable compose profile operations).
FROM base AS operations
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json .npmrc ./
RUN npm prune --omit=dev --ignore-scripts --no-audit --no-fund
COPY scripts/operations-agent.mjs scripts/backup-database.mjs ./scripts/
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs && mkdir -p /var/lib/eloria/backups /var/lib/eloria/operations && chown -R nextjs:nodejs /var/lib/eloria
USER nextjs
CMD ["node", "scripts/operations-agent.mjs"]

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV ELORIA_STANDALONE=true
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/scripts/start-production.mjs ./scripts/start-production.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/seo-scheduler.mjs ./scripts/seo-scheduler.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/maintenance-scheduler.mjs ./scripts/maintenance-scheduler.mjs
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health?mode=ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "scripts/start-production.mjs"]

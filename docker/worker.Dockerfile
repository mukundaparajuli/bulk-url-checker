FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/db/package.json packages/db/
RUN npm ci --omit=dev

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=@repo/worker
RUN npm run build --workspace=@repo/db

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/packages/db/src/prisma/contract.json ./node_modules/@repo/db/src/prisma/contract.json
COPY --from=builder /app/packages/db/src/prisma/contract.d.ts ./node_modules/@repo/db/src/prisma/contract.d.ts
COPY --from=builder /app/apps/worker/package.json ./package.json

USER appuser
CMD ["node", "dist/worker.js"]

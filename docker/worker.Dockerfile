FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/eslint-config/package.json packages/eslint-config/
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
COPY --from=builder /app/apps/worker/package.json ./package.json

COPY --from=builder /app/packages/db/package.json ./node_modules/@repo/db/package.json
COPY --from=builder /app/packages/db/dist ./node_modules/@repo/db/dist
COPY --from=builder /app/packages/db/src/prisma/contract.json ./node_modules/@repo/db/src/prisma/contract.json
COPY --from=builder /app/packages/db/src/prisma/contract.d.ts ./node_modules/@repo/db/src/prisma/contract.d.ts

USER appuser
CMD ["node", "dist/worker.js"]

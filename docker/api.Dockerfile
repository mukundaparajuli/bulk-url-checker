FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/eslint-config/package.json packages/eslint-config/
RUN npm ci --omit=dev

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=@repo/db
RUN npm run build --workspace=@repo/api

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json

COPY --from=builder /app/packages/db/package.json ./node_modules/@repo/db/package.json
COPY --from=builder /app/packages/db/dist ./node_modules/@repo/db/dist
COPY --from=builder /app/packages/db/src/prisma/contract.json ./node_modules/@repo/db/src/prisma/contract.json
COPY --from=builder /app/packages/db/src/prisma/contract.d.ts ./node_modules/@repo/db/src/prisma/contract.d.ts

USER appuser
EXPOSE 4000
CMD ["node", "dist/server.js"]

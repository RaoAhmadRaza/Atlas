FROM node:20-alpine AS builder
RUN npm install -g pnpm
WORKDIR /build
COPY pnpm-workspace.yaml package.json* pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
COPY packages/atlas-schemas/package.json ./packages/atlas-schemas/
RUN pnpm install --frozen-lockfile
COPY apps/web/ ./apps/web/
COPY packages/atlas-schemas/ ./packages/atlas-schemas/
RUN pnpm --filter web build

FROM node:20-alpine
RUN addgroup -S atlas && adduser -S atlas -G atlas
WORKDIR /app
COPY --from=builder /build/apps/web/.next/standalone ./
COPY --from=builder /build/apps/web/.next/static ./.next/static
USER atlas
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --retries=3   CMD wget -qO- http://localhost:3000/ || exit 1
CMD ["node", "server.js"]

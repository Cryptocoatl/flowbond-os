# ClaudIA always-on node — standalone image (decoupled from the monorepo build).
FROM node:20-slim

WORKDIR /app

# install deps from this service's own package.json (not the pnpm workspace)
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm install tsx

COPY tsconfig.json ./
COPY src ./src

# persistent state (Matrix sync token / device store) lives on a mounted volume
RUN mkdir -p /app/data
VOLUME ["/app/data"]

ENV NODE_ENV=production
CMD ["npx", "tsx", "src/index.ts"]

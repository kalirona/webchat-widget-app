FROM node:20-bookworm-slim AS builder

RUN apt-get update && apt-get install -y openssl libssl-dev ca-certificates

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm install -g wasp@0.24.0
RUN wasp build

FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/.wasp/build ./
RUN (cd server && npm ci --production) 2>/dev/null; (cd web-app && npm ci --production) 2>/dev/null; true

EXPOSE 3001

ENV NODE_ENV=production

CMD sh -c "cd server && npx prisma migrate deploy 2>/dev/null; node server.js"

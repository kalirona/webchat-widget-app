FROM node:24-bookworm-slim AS builder

RUN apt-get update && apt-get install -y openssl libssl-dev ca-certificates curl

# Install Wasp CLI v0.24.0
RUN curl -sSL "https://github.com/wasp-lang/wasp/releases/download/v0.24.0/wasp-linux-x86_64.tar.gz" -o /tmp/wasp.tar.gz && \
    cd /tmp && tar -xzf wasp.tar.gz && \
    mkdir -p /github/home/.cabal/share/x86_64-linux-ghc-9.6.7/waspc-0.24.0 && \
    cp -r data/* /github/home/.cabal/share/x86_64-linux-ghc-9.6.7/waspc-0.24.0/ && \
    cp wasp-bin /usr/local/bin/wasp && chmod +x /usr/local/bin/wasp && \
    rm -rf /tmp/wasp.tar.gz /tmp/wasp-bin /tmp/data && \
    wasp version

WORKDIR /app
COPY package.json ./
RUN npm install

COPY . .
RUN wasp install
RUN wasp build

FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/.wasp/out ./
RUN (cd server && npm ci --production) 2>/dev/null; true
RUN npx prisma generate --schema=db/schema.prisma 2>/dev/null; true

EXPOSE 3001

ENV NODE_ENV=production

# wasp v0.24 bundles server into server/bundle/server.js
CMD ["sh", "-c", "cd server && npx prisma migrate deploy 2>/dev/null; node bundle/server.js"]
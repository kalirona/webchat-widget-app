FROM node:24-bookworm-slim AS builder

RUN apt-get update && apt-get install -y openssl libssl-dev ca-certificates curl

# Install Wasp CLI v0.24.0
RUN curl -sSL "https://github.com/wasp-lang/wasp/releases/download/v0.24.0/wasp-linux-x86_64.tar.gz" -o /tmp/wasp.tar.gz && \
    cd /tmp && mkdir waspextract && cd waspextract && tar -xzf ../wasp.tar.gz && \
    cp wasp-bin /usr/local/bin/wasp && chmod +x /usr/local/bin/wasp && \
    cd / && rm -rf /tmp/wasp.tar.gz /tmp/waspextract && \
    wasp version

WORKDIR /app
COPY package.json ./
RUN npm install

COPY . .
RUN wasp build

FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/.wasp/build ./
RUN (cd server && npm ci --production) 2>/dev/null; (cd web-app && npm ci --production) 2>/dev/null; true

RUN npx prisma generate 2>/dev/null; true

EXPOSE 3001

ENV NODE_ENV=production

CMD ["sh", "-c", "cd server && npx prisma migrate deploy 2>/dev/null; node server.js"]

# Aarogya360 / MediLifecycle API — Railway-ready image
FROM node:20-bookworm-slim AS base

WORKDIR /app

# Prisma needs OpenSSL on Debian slim
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install deps first (better layer cache)
COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci

# App source
COPY . .

# Generate client + compile NestJS
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
# Railway injects PORT at runtime; this is only a local default
ENV PORT=3100

EXPOSE 3100

# Apply migrations, then start API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]

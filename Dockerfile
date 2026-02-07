# -----------------------------------------------------------------------------
# Stage 1: Build
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies for build)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and Prisma
COPY . .

# Generate Prisma client and build NestJS + seed script (JS for container runtime)
RUN npx prisma generate && npm run build && npx tsc -p tsconfig.seed.json

# -----------------------------------------------------------------------------
# Stage 2: Production (Debian for Prisma engine + OpenSSL compatibility)
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# OpenSSL for Prisma (required for schema engine / PostgreSQL)
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Prisma schema and migrations (seed runs from compiled JS)
COPY prisma ./prisma

# Regenerate Prisma client in runner
RUN npx prisma generate

# Built app and compiled seed from builder
COPY --from=builder /app/dist ./dist

# Start script (avoids Railway parsing issues with inline shell)
COPY start.sh ./start.sh
RUN chmod +x start.sh

# Expose port (Railway sets PORT; default 3000)
ENV NODE_ENV=production
EXPOSE 3000

# Run migrate+seed in background, server in foreground
CMD ["./start.sh"]

# syntax=docker/dockerfile:1

# ---------- Builder ----------
# Debian slim trae glibc + OpenSSL 3 (lo que necesita el query engine de Prisma 7).
# No usamos Alpine para evitar problemas de musl/openssl con Prisma.
FROM node:22-slim AS builder
WORKDIR /app

# OpenSSL para el engine de Prisma + toolchain por si bcrypt necesita compilar.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Instalar dependencias con cache de capas
COPY package*.json ./
RUN npm ci

# Generar cliente Prisma y compilar Nest
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- Runner ----------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Solo dependencias de producción (incluye @prisma/client y el CLI de prisma)
COPY package*.json ./
RUN npm ci --omit=dev

# Schema + config para poder correr `prisma db push` en el arranque
COPY prisma ./prisma
COPY prisma.config.ts ./

# Artefactos compilados desde el builder
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/dist ./dist

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]

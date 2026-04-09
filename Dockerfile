# =================================================================
# STAGE 1: Build & Dependencies
# =================================================================
FROM cgr.dev/chainguard/node:latest-dev AS builder

WORKDIR /app

# ✅ Layer Caching: Hanya install jika package.json berubah
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copy source code dan jalankan build/test jika diperlukan
COPY . .
# RUN npm test # Opsional: Jalankan test di dalam container build

# Hapus devDependencies untuk production
RUN npm prune --production

# =================================================================
# STAGE 2: Hardened Runtime
# =================================================================
FROM cgr.dev/chainguard/node:latest

LABEL maintainer="Nova Ferrydianto <novaferrydianto@gmail.com>"
LABEL org.opencontainers.image.source="https://github.com/novaferrydianto/devsecops-with-github-actions-end-to-end-nodejs-project"

WORKDIR /app

# Copy hanya yang dibutuhkan dari builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/app.js ./
COPY --from=builder /app/fetch-weather.js ./
COPY --from=builder /app/prepared-for-the-weather.js ./
COPY --from=builder /app/package.json ./

# Environment Variables
ENV NODE_ENV=production
ENV AIKIDO_BLOCK=true

# Port aplikasi
EXPOSE 3000

# Jalankan dengan Node langsung (Chainguard menggunakan user 'node' secara default)
CMD ["app.js"]

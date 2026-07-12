# =================================================================
# STAGE 1: Build & Dependencies
# =================================================================
FROM cgr.dev/chainguard/node:latest-dev@sha256:7137fadb43a7cee4a01495749973f3c8c44a1d02319d9beb543bdb21cb6e874e AS builder

# Set context ke user node sejak awal
WORKDIR /app

# ✅ FIX: Tambahkan --chown=node:node agar npm punya izin akses
COPY --chown=node:node package.json package-lock.json ./

RUN npm ci --include=dev

# ✅ FIX: Pastikan source code juga dimiliki oleh user node
COPY --chown=node:node . .

# Sekarang npm prune tidak akan kena EACCES
RUN npm prune --production

# =================================================================
# STAGE 2: Hardened Runtime
# =================================================================
FROM cgr.dev/chainguard/node:latest@sha256:30bac16e19a580ed7feb991876e89d45f96eead87518df4bce46e597336c6a18

WORKDIR /app

# ✅ Salin file dengan user node
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/*.js ./
COPY --chown=node:node --from=builder /app/package.json ./

# ✅ FIX UNTUK COPILOT: Hilangkan izin tulis (Write) untuk user node
# Ini memastikan file tidak bisa diubah jika container disusupi
USER root
RUN chmod -R 550 /app && chmod -R 440 /app/package.json
USER node

ENV NODE_ENV=production
EXPOSE 3000
CMD ["app.js"]

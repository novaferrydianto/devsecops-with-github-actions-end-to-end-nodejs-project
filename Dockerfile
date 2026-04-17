# =================================================================
# STAGE 1: Build & Dependencies
# =================================================================
FROM cgr.dev/chainguard/node:latest-dev@sha256:ffacf5b924201ec417c94d04c471d0f994d600e5ed9a21bd0b969a5941a5435a AS builder

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
FROM cgr.dev/chainguard/node:latest@sha256:47ff69677e65c45de946df5ef4107e3c4cccf0bee4ed4aacf89a4c6c5ec93d55

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

# =================================================================
# STAGE 1: Build & Dependencies
# =================================================================
FROM cgr.dev/chainguard/node:latest-dev AS builder

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
FROM cgr.dev/chainguard/node:latest

WORKDIR /app

# ✅ Tetap gunakan chown saat menyalin dari stage builder
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/app.js ./
COPY --chown=node:node --from=builder /app/fetch-weather.js ./
COPY --chown=node:node --from=builder /app/prepared-for-the-weather.js ./
COPY --chown=node:node --from=builder /app/package.json ./

ENV NODE_ENV=production
ENV AIKIDO_BLOCK=true

EXPOSE 3000

CMD ["app.js"]

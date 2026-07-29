# =================================================================
# STAGE 1: Build & Dependencies
# =================================================================
# cgr.dev/chainguard/node:latest-dev
FROM cgr.dev/chainguard/node@sha256:5ca3303bfbcd7eeec7e71466d56a334c8f40323b59a92e174131bf038bdd81ca AS builder

# Set context ke user node sejak awal
WORKDIR /app

# ✅ FIX: Tambahkan --chown=node:node agar npm punya izin akses
COPY --chown=node:node package.json package-lock.json ./

RUN npm ci --include=dev --ignore-scripts

# ✅ FIX: Pastikan source code juga dimiliki oleh user node
COPY --chown=node:node . .

# Sekarang npm prune tidak akan kena EACCES
RUN npm prune --production

# =================================================================
# STAGE 2: Hardened Runtime
# =================================================================
# cgr.dev/chainguard/node:latest
FROM cgr.dev/chainguard/node@sha256:2b9627fec21321fad828adf6c5ceb91c6f377b772b48a738533a1225c0145a90

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

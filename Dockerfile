# =================================================================
# STAGE 1: Build & Dependencies
# =================================================================
FROM cgr.dev/chainguard/node:latest-dev@sha256:c9558c9f98f50207fa5cd24366a84d788b1e82d2d54bbb8c50b21324b55649ed AS builder

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
FROM cgr.dev/chainguard/node:latest@sha256:93f09480a25e5e3c25f70856bacf4c35572522faed0182a4cbff5032958c65ef

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

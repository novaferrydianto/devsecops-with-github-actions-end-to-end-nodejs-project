# =================================================================
# STAGE 1: Build & Dependencies
# =================================================================
# Tag kept alongside the digest (not just in a comment) so Dependabot's
# docker-ecosystem updater tracks *this* tag's digest, not a bare-digest
# reference which it resolves against "latest" regardless of which tag the
# pin actually came from. docker:S8431 is excluded for this file in
# sonar-project.properties for the same reason.
FROM cgr.dev/chainguard/node:latest-dev@sha256:1bd1aa2a03ffd28fff8f99f1330bbf3080e03d5c76e4758572a403dd71baa9e8 AS builder

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
FROM cgr.dev/chainguard/node:latest@sha256:8e1189525a80564e0df5cec59bc4aa5d859869e6e7c05b0a4290682fbd53563e

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

# TLS verification stays on: when TLS_CERT_PATH is set, the probe pins to
# that exact cert file (the same one the app itself serves) as its CA
# instead of disabling certificate checks.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "const fs=require('node:fs');const p=process.env.PORT||3000;const certPath=process.env.TLS_CERT_PATH;const mod=certPath?require('node:https'):require('node:http');const opts={host:'127.0.0.1',port:p,path:'/health',timeout:2000};if(certPath){opts.ca=fs.readFileSync(certPath)}const req=mod.get(opts,(r)=>{process.exit(r.statusCode===200?0:1)});req.on('error',()=>process.exit(1));req.on('timeout',()=>{req.destroy();process.exit(1)})"]

CMD ["app.js"]

######################
# STAGE 1: BUILDER
######################
# Gunakan 'latest-dev' untuk kompatibilitas registry publik Chainguard
FROM cgr.dev/chainguard/node:latest-dev AS builder

LABEL stage=builder
LABEL maintainer="Nova Ferry Dianto"

# Di Chainguard, user default adalah 'node'
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependensi (Chainguard node-dev sudah memiliki npm)
# Gunakan ci untuk reproduksibilitas build
RUN npm ci

# Copy source code
COPY . .

######################
# STAGE 2: RUNTIME (ZERO CVE)
######################
# Menggunakan static runtime image (Tanpa Shell, Tanpa Package Manager)
FROM cgr.dev/chainguard/node:latest AS runtime

# Metadata Image
LABEL org.opencontainers.image.source="https://github.com/novaferrydianto/devsecops-with-github-actions-end-to-end-nodejs-project"
LABEL security.provider="Chainguard"

WORKDIR /app

# Copy artifact dari builder
# Pastikan ownership berada di tangan user 'node' (UID 65532)
COPY --from=builder --chown=node:node /app /app

# Best Practice DevSecOps: Pastikan container berjalan sebagai non-root
USER node

# Ekspos port aplikasi
EXPOSE 3000

# Jalankan aplikasi
# Pastikan app.js berada di root direktori /app
CMD ["app.js"]

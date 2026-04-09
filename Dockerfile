######################
# STAGE 1: BUILDER
######################
# Chainguard menyediakan image dev untuk kebutuhan kompilasi/build
FROM cgr.dev/chainguard/node:24-dev AS builder

LABEL stage=builder
LABEL maintainer="Nova Ferry Dianto"

# Di Chainguard, user default adalah 'node', namun kita gunakan environment standard
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependensi (Chainguard node-dev sudah memiliki npm)
RUN npm ci --only=production

# Copy source code
COPY . .

######################
# STAGE 2: RUNTIME (ZERO CVE)
######################
# Menggunakan static runtime image (Tanpa Shell, Tanpa Package Manager)
FROM cgr.dev/chainguard/node:24 AS runtime

# Metadata Image
LABEL org.opencontainers.image.source="https://github.com/novaferrydianto/devsecops-with-github-actions-end-to-end-nodejs-project"
LABEL security.provider="Chainguard"

WORKDIR /app

# Copy artifact dari builder
# Chainguard secara default berjalan sebagai user 'node' (UID 65532)
COPY --from=builder --chown=node:node /app /app

# Ekspos port aplikasi
EXPOSE 3000

# Jalankan aplikasi
# Chainguard node image entrypoint secara default adalah 'node'
CMD ["app.js"]

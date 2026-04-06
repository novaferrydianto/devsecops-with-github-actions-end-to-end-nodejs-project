######################
# STAGE 1: BUILDER
######################
# Menggunakan Bookworm-slim agar konsisten dengan Debian di Distroless
FROM node:24-bookworm-slim AS builder

# Metadata untuk audit supply chain
LABEL stage=builder
LABEL maintainer="Nova Ferry Dianto"

# Setting DOCKERFILE_DATE forces a build cache refresh for the package upgrades
ENV DOCKERFILE_DATE=2026-04-06

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV NODE_ENV=production

WORKDIR /app

# Optimasi Layer Cache & Security Patch: Copy package files dan upgrade OS package dasar
COPY package*.json ./
COPY fix-mocha-exit.js ./

# Upgrade system library untuk mitigasi kerentanan (misal libc6) pada tahap builder
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

# Install hanya dependensi produksi secara bersih
RUN npm ci --only=production

# Copy sisa source code
COPY . .

######################
# STAGE 2: RUNTIME (HARDENED)
######################
# Menggunakan tag dinamis nonroot (tanpa hardcoded SHA) agar selalu mendapatkan security patch terbaru (seperti libc6 dsb)
FROM gcr.io/distroless/nodejs24-debian12:nonroot AS runtime

# Metadata Image
LABEL org.opencontainers.image.source="https://github.com/novaferrydianto/devsecops-with-github-actions-end-to-end-nodejs-project"
LABEL security.gate.java="21"
LABEL node.runtime.version="24"

WORKDIR /app

# Copy artifact dari builder dengan izin nonroot
COPY --chown=nonroot:nonroot --from=builder /app /app

# Ekspos port aplikasi
EXPOSE 3000

# Jalankan sebagai user non-privilese (sudah bawaan distroless nonroot)
USER nonroot

# Jalankan aplikasi (Distroless Nodejs langsung mengeksekusi file JS)
CMD ["app.js"]

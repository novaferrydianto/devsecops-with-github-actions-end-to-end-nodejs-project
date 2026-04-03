######################
# STAGE 1: BUILDER
######################
# Menggunakan Bookworm-slim agar konsisten dengan Debian di Distroless
FROM node:24-bookworm-slim AS builder

# Metadata untuk audit supply chain
LABEL stage=builder
LABEL maintainer="Nova Ferry Dianto"

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV NODE_ENV=production

WORKDIR /app

# Optimasi Layer Cache: Copy package files dulu
COPY package*.json ./
COPY fix-mocha-exit.js ./

# Install hanya dependensi produksi secara bersih
RUN npm ci --only=production

# Copy sisa source code
COPY . .

######################
# STAGE 2: RUNTIME (HARDENED)
######################
# Update ke nodejs24 untuk menghindari deprecation Node 20
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

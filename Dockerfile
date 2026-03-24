######################
# BUILD
######################
FROM node:25-alpine@sha256:5209bcaca9836eb3448b650396213dbe9d9a34d31840c2ae1f206cb2986a8543 AS builder

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

WORKDIR /app

COPY package*.json ./
COPY fix-mocha-exit.js ./

RUN npm ci --only=production

COPY . .

######################
# RUNTIME
######################
FROM gcr.io/distroless/nodejs20-debian12:nonroot AS runtime

WORKDIR /app

COPY --chown=nonroot:nonroot --from=builder /app /app

EXPOSE 3000

USER nonroot

CMD ["app.js"]

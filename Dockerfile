######################
# BUILD
######################
FROM node:20-alpine AS builder

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
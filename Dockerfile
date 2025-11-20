FROM node:20-alpine AS builder

WORKDIR /app

# Copy all app files first
COPY . .

# Install deps AFTER all files exist (required for fix-mocha-exit.js)
RUN npm ci --only=production

FROM node:20-alpine AS runtime
WORKDIR /app

COPY --from=builder /app /app

EXPOSE 3000

# non-root user
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs
USER nodeuser

CMD ["npm", "start"]

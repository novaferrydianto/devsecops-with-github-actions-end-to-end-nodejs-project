# =================================================================
# STAGE 1: Build & Dependencies  (has npm + shell)
# =================================================================
FROM cgr.dev/chainguard/node:latest-dev@sha256:c9558c9f98f50207fa5cd24366a84d788b1e82d2d54bbb8c50b21324b55649ed AS builder
# (Builder may carry a vulnerable npm — that's fine, it is DISCARDED and never
#  reaches the runtime image. Still, repull periodically for good hygiene.)
WORKDIR /app

# Install deps first (better layer caching). --chown so npm has write access.
COPY --chown=node:node package.json package-lock.json ./

# No build step here, so install production deps only and skip a separate prune.
# ⚠️ If you DO have a build step (tsc/webpack/etc.) that needs devDependencies,
#    revert to:  RUN npm ci --include=dev  ->  <your build>  ->  RUN npm prune --omit=dev
RUN npm ci --omit=dev

# App source
COPY --chown=node:node . .

# =================================================================
# STAGE 2: Hardened Runtime  (-slim => NO npm, NO shell)
# This is the fix for the 5 HIGH npm CVEs: the npm CLI simply isn't present.
# =================================================================
FROM cgr.dev/chainguard/node:latest-slim
# TODO: pin by digest AFTER you pull it, e.g.
#   cgr.dev/chainguard/node:latest-slim@sha256:<resolve in your env>
WORKDIR /app

# Distroless runtime has NO shell -> `RUN chmod` is impossible here.
# We bake read+execute-only permissions at copy time with BuildKit's --chmod
# (same hardening intent as your old `chmod -R 550`, no shell required).
COPY --from=builder --chown=node:node --chmod=550 /app/node_modules ./node_modules

# ⚠️ This copies ONLY root-level *.js. If your app has subfolders or assets
#    (views/, public/, routes/, src/, *.json configs, *.ejs, *.hbs ...),
#    ADD explicit COPY lines for them or they will be MISSING at runtime.
#    Example:
#      COPY --from=builder --chown=node:node --chmod=550 /app/views ./views
#      COPY --from=builder --chown=node:node --chmod=550 /app/public ./public
COPY --from=builder --chown=node:node --chmod=550 /app/*.js ./
COPY --from=builder --chown=node:node --chmod=440 /app/package.json ./

# No USER root needed: Chainguard node images already default to the nonroot
# `node` user, and permissions were set above at copy time.
USER node
ENV NODE_ENV=production
EXPOSE 3000

# The Chainguard node image ENTRYPOINT is `node`, so this runs: node app.js
CMD ["app.js"]

# --- Optional, defense-in-depth (uncomment if desired) ---
# Liveness without curl/wget (none exist in slim) — uses node itself:
# HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
#   CMD ["node","-e","require('http').get('http://127.0.0.1:3000',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"]
#
# Prefer enforcing immutability at RUNTIME instead of (or in addition to) the
# chmod above — it is more robust than baked file modes:
#   k8s:    securityContext.readOnlyRootFilesystem: true
#   docker: docker run --read-only --tmpfs /tmp ...

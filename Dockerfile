# =================================================================
# STAGE 1: Build & Dependencies
# =================================================================
# cgr.dev/chainguard/node:latest-dev
# Digest-only (no tag) to satisfy SonarCloud docker:S8431: the org is on the
# Free plan, which blocks assigning a custom Quality Profile to deactivate
# the rule, and the sonar.issue.ignore.multicriteria exclusion doesn't apply
# to PR analysis (confirmed: it was in sonar-project.properties yet the
# issue still showed OPEN on PR-analyzed commits). Trade-off accepted:
# Dependabot's docker-ecosystem updater compares a bare digest against the
# ":latest" tag regardless of which tag it came from, so bump PRs for this
# stage may read as coming from ":latest" instead of ":latest-dev" -- still
# correctly pins and updates by digest, just a less precise PR diff.
FROM cgr.dev/chainguard/node@sha256:5d749aee9d2711dd89d757de7bfe2674a9f924a119f2b354f2227e2e4711ea9b AS builder

# Set context ke user node sejak awal
WORKDIR /app

# ✅ FIX: Tambahkan --chown=node:node agar npm punya izin akses
COPY --chown=node:node package.json package-lock.json ./

RUN npm ci --include=dev --ignore-scripts

# Copy only runtime application sources (not tests/docs/CI)
COPY --chown=node:node app.js fetch-weather.js prepared-for-the-weather.js ./

# Sekarang npm prune tidak akan kena EACCES
RUN npm prune --production

# =================================================================
# STAGE 2: Hardened Runtime
# =================================================================
# cgr.dev/chainguard/node:latest
FROM cgr.dev/chainguard/node@sha256:5d749aee9d2711dd89d757de7bfe2674a9f924a119f2b354f2227e2e4711ea9b

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

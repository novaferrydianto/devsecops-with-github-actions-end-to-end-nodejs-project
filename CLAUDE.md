# CLAUDE.md

Guidance for Claude Code (and humans) working in this repository.

## What this is

A **DevSecOps reference implementation**: a small Node.js weather app whose real product is the *secure software-supply-chain pipeline* around it. When making changes, treat the security pipeline as a first-class part of the codebase — a change that breaks a security gate is a broken change, even if the app still runs.

- **Runtime:** Node.js `>=24`, **ESM only** (`"type": "module"`).
- **App:** a CLI + minimal HTTP/optional-HTTPS server (`/`, `/health`, `/weather`, `/robots.txt`) that fetches OpenWeather data and prints "what to prepare for" recommendations.

## Commands

```bash
npm ci             # install exactly from package-lock.json (what CI uses)
npm test           # mocha → xunit.xml (SonarQube reporter). Sets NODE_ENV + a dummy API key via cross-env
npm run cover      # c8 coverage (text/lcov/html) → coverage/ ; runs coverage-makeover.js after
npm run licenses   # fail-closed package-lock license inventory
npm start          # node app.js  (alias: npm run dev)
npm audit          # MUST stay clean of high/critical — see "Fail-closed gates" below
```

There is no lint script wired into npm; ESLint runs via `.pre-commit-config.yaml` (install [pre-commit](https://pre-commit.com) and run `pre-commit run --all-files`). Gitleaks also runs there.

## Layout

Source lives at the repo **root** (there is no `src/`):

| File | Role |
|---|---|
| `app.js` | Entry point. Exports `run`, `startServer`, `loadTlsOptions`, and `shutdown` for testability; only calls `server.listen` when `NODE_ENV !== 'test'`. Sets security headers on every response and enables TLS only when both certificate paths are present. |
| `fetch-weather.js` | OpenWeather fetch + pure helpers (`kelvinToCelsius`, `getVolume`, `processResults`). Prefers a global `fetch` stub (tests) and falls back to `node-fetch`. |
| `prepared-for-the-weather.js` | `doINeed.*` recommendation predicates (umbrella, suncream, etc.). |
| `scripts/coverage-makeover.js` | Post-coverage cosmetic step that restyles the HTML report. |
| `test/` | Mocha specs: `*-test.js` and `*.test.js` (Mocha, Chai, Sinon, `chai-as-promised`, plus `fuzz-test.js` using **fast-check** property testing). |
| `test-data/` | JSON/JS fixtures for the OpenWeather response shape. |

## Conventions

- **ESM everywhere.** Use `import`/`export` with explicit `.js` extensions. No `require`, no CommonJS.
- **Env-driven config, never hardcoded secrets.** `OPENWEATHER_API_KEY` is **required** — `fetch-weather.js` throws at import time if it is missing. Other vars: `OPENWEATHER_TIMEOUT_MS` (default `10000`), `DEFAULT_LOCATION`, `PORT` (default `3000`), and `NODE_ENV`. Optional TLS requires `TLS_CERT_PATH` and `TLS_KEY_PATH` together and fails closed if only one is set. `.env` is gitignored; tests inject a dummy key via `cross-env`.
- **Security headers** are set on every HTTP response in `startServer` (CSP, `X-Content-Type-Options`, HSTS, etc.). Keep them when touching the server.
- `// NOSONAR` comments on `console.*` lines are intentional SonarCloud suppressions — leave them.
- **Coverage is `c8`**, configured in the `c8` block of `package.json` (that block is authoritative). `test/mocha.opts` is a legacy leftover — don't rely on it.
- Commit messages follow **Conventional Commits** (`ci:`, `fix(docker):`, `fix:` …), matching the existing history.

## Fail-closed security gates — do not break these

The pipeline is designed to **fail closed**. Before committing dependency or Dockerfile changes, know that:

1. **`npm audit` must have zero high/critical.** The Trivy filesystem scan (`.github/workflows/devsecops-pipeline.yaml`) runs with `ignore-unfixed: true` + `exit-code: 1`, so any *fixable* HIGH/CRITICAL in `package-lock.json` fails the build. Prefer `npm audit fix`; use `overrides` in `package.json` for transitive pins that a direct bump can't reach.
2. **Trivy image scan is also enforcing** (same flags) on the built image. Keep base images patched.
3. **Dependency policy** runs `npm audit`, a deterministic full-lockfile license inventory, and Trivy on every event. Secret-backed Snyk and Sonar scans run on every ref that can actually see Actions secrets — that means same-repo PRs too, so the Quality Gate blocks *before* merge — and are skipped only for fork PRs and Dependabot (Dependabot PRs are same-repo but run with Dependabot secrets, so they cannot read `SONAR_TOKEN`/`SNYK_TOKEN`). Never expose those tokens to fork PR code. The `summary` job asserts the skip is deliberate in both directions.
4. **Artifact continuity is build-once:** image is built once, scanned, DAST-tested, staged by digest, then Cosign **keyless (OIDC)** signs/verifies it and attests/verifies the CycloneDX SBOM before a full-commit-SHA tag is promoted. Never rebuild an image between scan and ship, and never sign a mutable `:tag`.

## GitHub Actions rules

- **Every third-party action is pinned to a full commit SHA** with the human-readable version in a trailing comment, e.g. `uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1`. When bumping an action, update **both** the SHA and the comment. Dependabot (`.github/dependabot.yml`, `ci-actions` group) does this automatically — match its style in manual edits.
- **Least privilege:** top-level `permissions: contents: read`; grant extra scopes only on the specific job that needs them.
- **`step-security/harden-runner` is the first step of every job.** Keep it there. Default egress is `audit`; the one exception is `deliver_sign` in `devsecops-pipeline.yaml`, which runs `block` with an explicit `allowed-endpoints` allowlist because it is the only job holding both the OIDC signing identity and the registry push credential. When a step in that job legitimately needs a new destination, add it to the allowlist — never downgrade the job back to `audit`.
- Run `actionlint` before pushing workflow edits (CI runs it via `actionlint.yml`). It lints `run:` blocks with **shellcheck** when shellcheck is on `PATH`; the CI action bundles it, so a local run without shellcheck is a weaker check than CI's.

## Docker

- `Dockerfile` is a multi-stage build on **Chainguard** distroless images pinned **by digest**, runs as non-root (`USER node`), and makes the app read-only (`chmod 550/440`). Preserve these hardening properties.
- `Dockerfile.dev` (node-alpine, nodemon) is for local dev only.

## Gotchas

- **`xunit.xml` and `coverage/` are generated artifacts.** `npm test` or `npm run cover` rewrites `xunit.xml`; both paths are gitignored.
- Never commit `.env`, `*.pem`, `*.key`, `*.sig`, or `security-reports/` — all gitignored by design.

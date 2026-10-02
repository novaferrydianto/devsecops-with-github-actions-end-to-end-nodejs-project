# Security Policy

## Supported Versions

We prioritize security updates for the latest code on the main branch and active distributions.

| Version | Supported          | Notes                               |
| ------- | ------------------ | ----------------------------------- |
| `master`| :white_check_mark: | Latest production-ready code.      |
| `latest`| :white_check_mark: | Active Docker distribution tag.     |
| < 1.0.0 | :x:                | Deprecated versions; not supported. |

## Reporting a Vulnerability

We appreciate the efforts of security researchers and developers who help us improve the security posture of this project.

### 🛡️ Use GitHub Security Advisories
We strongly encourage reporters to use the **[GitHub Private Vulnerability Reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-publicizing-security-vulnerabilities/privately-reporting-a-security-vulnerability)** feature in the Security tab of this repository. This provides a secure, private environment to collaborate on a fix.

### ⛔ Do NOT open a public issue
Please **DO NOT** open a public GitHub Issue for security vulnerabilities. Public disclosure without a fix puts users at risk.

## Disclosure Policy

This project adheres to the **[Coordinated Vulnerability Disclosure (CVD)](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure)** model. 

### ⏳ Response Timeline
* **Acknowledgment:** We aim to respond within **48 hours** to any report.
* **Assessment:** We will perform an initial assessment and confirm the vulnerability within **7 business days**.
* **Remediation:** We will work to release a fix or mitigation as soon as possible.
* **Public Disclosure:** Vulnerabilities will be publicly disclosed via a GitHub Security Advisory once a patch is available.

### 🛡️ Scope
We are interested in vulnerabilities regarding:
* The Node.js Application logic and core dependencies.
* CI/CD Pipeline configuration (GitHub Actions workflows).
* Container Hardening (Docker/Chainguard configurations).
* Critical Supply Chain integrity.

## Application hardening (current)

Controls implemented in the application and container surface today:

* **Location allowlist validation** before OpenWeather API calls (`validateLocation` in `fetch-weather.js`)
* **HTTP method allowlist**: `GET` / `HEAD` only (non-allowlisted methods receive `405` with `Allow`)
* **Request path normalization** (`normalizeRequestPath`): strip query string, collapse `//`, reject `..` / NUL / bad percent-encoding with `400`, overlong URLs with `414`
* **Server timeouts** via `HEADERS_TIMEOUT_MS` / `REQUEST_TIMEOUT_MS` / `KEEP_ALIVE_TIMEOUT_MS` (defaults 15s / 30s / 5s)
* **Optional `WEATHER_API_TOKEN`** for `GET /weather` (`Authorization: Bearer` or `X-API-Key`, timing-safe compare); `/health` stays open. Leave unset for local DAST / ZAP open scans
* **In-app fixed-window rate limit** (`RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS`); `/health` is exempt. `0` disables
* **Security headers** on every response: CSP, HSTS, COOP/COEP/CORP, `X-Content-Type-Options: nosniff`, frame deny, `Referrer-Policy: no-referrer`, and related defaults
* **Configurable bind host** via `HOST` / `BIND_ADDRESS` (default `0.0.0.0`)
* **Optional TLS** when both `TLS_CERT_PATH` and `TLS_KEY_PATH` are set together; minimum TLSv1.2
* **Minimal production dependency surface** (`command-line-args` only) with Node native `fetch`
* **Multi-stage Chainguard image**, non-root runtime, pruned deps, tight `.dockerignore`
* See **`.env.example`** for the full variable template (copy to `.env` locally; never commit real secrets)

---
*Thank you for helping keep this project secure!*
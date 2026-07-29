# 🔐 DevSecOps-Ready Node.js Weather App

[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/novaferrydianto/devsecops-with-github-actions-end-to-end-nodejs-project/badge)](https://securityscorecards.dev/viewer/?uri=github.com/novaferrydianto/devsecops-with-github-actions-end-to-end-nodejs-project)
[![Security Policy](https://img.shields.io/badge/Security-Policy-brightgreen.svg)](https://github.com/novaferrydianto/devsecops-with-github-actions-end-to-end-nodejs-project/security/policy)
[![CI/CD Pipeline](https://github.com/novaferrydianto/devsecops-with-github-actions-end-to-end-nodejs-project/actions/workflows/devsecops-pipeline.yaml/badge.svg)](https://github.com/novaferrydianto/devsecops-with-github-actions-end-to-end-nodejs-project/actions)
[![Security: Snyk](https://img.shields.io/badge/Security-Snyk-orange?logo=snyk)](https://github.com/novaferrydianto/devsecops-with-github-actions-end-to-end-nodejs-project/security/code-scanning)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/12463/badge)](https://www.bestpractices.dev/projects/12463)
[![Signed with Cosign](https://img.shields.io/badge/Signed_with-Cosign-purple?logo=sigstore)](https://sigstore.dev)
[![Container: Podman](https://img.shields.io/badge/Container-Podman-892CA0?logo=podman)](https://podman.io)

> **EN:** A modern, secure-by-default Node.js weather application showcasing a complete DevSecOps pipeline.  
> **ID:** Aplikasi Weather Node.js yang sudah diamankan dengan pipeline DevSecOps end-to-end.

Modernized from Lissy93’s original project and upgraded into a **Secure Software Supply Chain** reference implementation.

---

## 🌟 Key Features

### Build & Quality
- Node.js 24
- Unit testing with Mocha, Chai, Sinon
- Enforced c8 coverage gate: 70% lines/functions/statements and 75% branches (80% target)
- Sonar test execution import and a Quality Gate on every secret-backed ref, including pre-merge same-repo PRs

### DevSecOps Security Pipeline
1. **Secret Scanning — Gitleaks**
   - Active protection against leaked tokens & credentials in commits.

2. **SAST — SonarCloud**  
   - Quality Gate berjalan pre-merge pada setiap ref yang bisa membaca Actions secrets (termasuk PR dari branch repo ini sendiri); di-skip untuk PR fork dan Dependabot, yang tidak punya akses token.

3. **SCA — Snyk**  
   - Auto-fail High/Critical dengan cakupan ref yang sama; PR fork/Dependabot tetap digate oleh `npm audit`, license inventory, dan Trivy.

4. **Container Security — Docker Buildx / Podman + Trivy**
   - CI single-build via Docker Buildx; rootless Podman tersedia untuk local runtime.
   - Automatically generates CycloneDX SBOM
   - Trivy filesystem & OS package scan

5. **Supply Chain Security — Cosign**  
   - Keyless image signing and CycloneDX attestation by immutable digest.
   - Full commit-SHA tag dipromosikan hanya setelah signature dan attestation terverifikasi.

6. **DAST — OWASP ZAP**  
   - Pinned ZAP Baseline passive scan untuk `/`, `/health`, `/weather`, dan `/robots.txt`.
   - WARN/FAIL findings menggagalkan promotion; report disimpan sebagai workflow artifacts.

7. **Fuzz Testing — fast-check**  
   - Property-based testing untuk mendeteksi edge-case yang sulit ditemukan tes standar.

---

## 📁 Repository Structure

```
.
├── .github/
│   ├── CODEOWNERS
│   ├── dependabot.yml
│   └── workflows/
│       ├── actionlint.yml
│       ├── codeql.yml
│       ├── dependency-review.yml
│       ├── devsecops-pipeline.yaml
│       ├── release.yml
│       ├── scorecard.yml
│       ├── secret-scanner.yaml
│       └── security-self-healing.yml
├── .zap/
│   └── rules.tsv
├── scripts/
│   ├── check-licenses.js
│   └── coverage-makeover.js
├── test-data/
│   ├── sample-data.js
│   └── sample-weather-raw.json
├── test/
│   ├── app.integration.test.js
│   ├── fetch-weather-helper-test.js
│   ├── fuzz-test.js
│   ├── preparing-data-test.js
│   └── weather-kit-test.js
├── .dockerignore
├── .gitignore
├── Dockerfile
├── Dockerfile.dev
├── podman-compose.yml
├── app.js
├── fetch-weather.js
├── prepared-for-the-weather.js
├── package.json
└── package-lock.json
```

---

## 🚀 Quick Start (Podman/Docker)

### English
```bash
podman build -t weather-app .

podman run -d \
  -p 3000:3000 \
  --name weather-app \
  --memory=256m \
  --cpus=0.5 \
  --read-only \
  --security-opt no-new-privileges \
  weather-app
```

Access at: http://localhost:3000

### Indonesian
```bash
podman build -t weather-app .

podman run -d -p 3000:3000 \
  --name weather-app \
  --memory=256m \
  --cpus=0.5 \
  --read-only \
  --security-opt no-new-privileges \
  weather-app
```

Akses: http://localhost:3000

---

## ⚡ Quick Start (Local Development)

### English
```bash
npm install
npm test
npm run cover
npm start
```

### Indonesian
```bash
npm install
npm test
npm run cover
npm start
```

App running at: http://localhost:3000

---

## 🔐 Security Stack Summary

| Layer | Tool | Description |
|-------|------|-------------|
| Secret Scanning | Gitleaks | Detect hardcoded credentials |
| SAST | SonarCloud | Static analysis |
| SCA | Snyk | Dependency scan |
| Fuzzing | fast-check | Property-based testing |
| SBOM | Trivy | Software Bill of Materials (CycloneDX) |
| Container Scan | Trivy | OS & FS vulnerability scan |
| Signing | Cosign | Keyless image signature + SBOM attestation |
| DAST | OWASP ZAP | Passive baseline scan across explicit routes |

---

## 🌐 CI/CD Pipeline Flow

```
1. Checkout + clean dependency install
2. Unit tests, c8 coverage gate, npm audit, lockfile license inventory, Gitleaks
3. SonarCloud + Snyk on every secret-backed ref, incl. same-repo PRs (skipped for fork PRs and Dependabot)
4. Docker Buildx single image build
5. Trivy filesystem/image gates + CycloneDX SBOM
6. Four-route OWASP ZAP Baseline matrix (WARN/FAIL enforcing)
7. Master push only: stage image, sign/verify, attest/verify, promote full-SHA tag
8. Enforcing aggregate GitHub Summary
```

---

## License
MIT License

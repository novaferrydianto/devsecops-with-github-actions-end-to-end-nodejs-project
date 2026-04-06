# 🔐 DevSecOps-Ready Node.js Weather App

[![CI/CD Pipeline](https://github.com/novaferrydianto/devsecops-with-github-actions-end-to-end-nodejs-project/actions/workflows/devsecops-pipeline.yaml/badge.svg)](https://github.com/novaferrydianto/devsecops-with-github-actions-end-to-end-nodejs-project/actions)
[![Security: Snyk](https://img.shields.io/badge/Security-Snyk-orange)](https://snyk.io/)
[![Signed with Cosign](https://img.shields.io/badge/Signed_with-Cosign-purple)](https://sigstore.dev)
[![Container: Podman](https://img.shields.io/badge/Container-Podman-892CA0)](https://podman.io)

> **EN:** A modern, secure-by-default Node.js weather application showcasing a complete DevSecOps pipeline.  
> **ID:** Aplikasi Weather Node.js yang sudah diamankan dengan pipeline DevSecOps end-to-end.

Modernized from Lissy93’s original project and upgraded into a **Secure Software Supply Chain** reference implementation.

---

## 🌟 Key Features

### Build & Quality
- Node.js 24
- Unit testing with Mocha, Chai, Sinon
- 80%+ coverage via NYC
- Clean code structure & linting

### DevSecOps Security Pipeline
1. **Secret Scanning — Gitleaks**
   - Active protection against leaked tokens & credentials in commits.

2. **SAST — SonarCloud**  
   EN: Detects bugs & vulnerabilities  
   ID: Analisis statis mendeteksi bug sejak awal

3. **SCA — Snyk**  
   Auto-fail untuk severity High/Critical

4. **Container Security — Podman + Trivy**  
   - Rootless container build  
   - Automatically generates CycloneDX SBOM
   - Trivy filesystem & OS package scan

5. **Supply Chain Security — Cosign**  
   - Image signing  
   - Prevent tampering & ensure provenance

6. **DAST — OWASP ZAP**  
   - Full dynamic scan  
   - HTML/JSON reports  
   - Auto-create GitHub Issues

---

## 📁 Repository Structure

```
.
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   └── security-scan-fail.md
│   └── workflows/
│       ├── actionlint.yml
│       ├── devsecops-pipeline.yaml
│       ├── secret-scanner.yaml
│       └── dependabot.yml
│
├── test-data/
│   ├── sample-data.js
│   └── sample-weather-raw.json
│
├── test/
│   ├── app.test.js
│   ├── fetch-weather.test.js
│   └── prepared-for-the-weather.test.js
│
├── .dockerignore
├── .gitignore
├── Dockerfile
├── Dockerfile.dev
├── podman-compose.yml
├── SECURITY.md
├── README.md
├── app.js
├── fetch-weather.js
├── fix-mocha-exit.js
├── prepared-for-the-weather.js
├── nyc.config.json
├── package.json
├── package-lock.json
└── xunit.xml
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
  -e AIKIDO_BLOCK=true \
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
  -e AIKIDO_BLOCK=true \
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
| SBOM | Trivy | Software Bill of Materials (CycloneDX) |
| Container Scan | Trivy | OS & FS vulnerability scan |
| Signing | Cosign | Image signature & provenance |
| DAST | OWASP ZAP | Runtime penetration testing |

---

## 🌐 CI/CD Pipeline Flow

```
1. Checkout source code
2. Secret Scan (Gitleaks)
3. Install dependencies
4. Unit Tests + Coverage
5. SonarCloud SAST Scan
6. Snyk SCA Scan
7. Podman rootless image build
8. Generate SBOM (Trivy CycloneDX)
9. Trivy container scan
10. Cosign image signing
11. OWASP ZAP DAST scan
12. Upload reports + GitHub Summary
```

---

## License
MIT License

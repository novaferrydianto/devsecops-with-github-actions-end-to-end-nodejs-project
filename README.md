# 🔐 DevSecOps-Ready Node.js Weather App

[![CI/CD Pipeline](https://github.com/novaferrydianto/devsecops-with-github-actions-end-to-end-nodejs-project/actions/workflows/devsecops-pipeline.yaml/badge.svg)](https://github.com/novaferrydianto/devsecops-with-github-actions-end-to-end-nodejs-project/actions)
[![Security: Snyk](https://img.shields.io/badge/Security-Snyk-orange)](https://snyk.io/)
[![Signed with Cosign](https://img.shields.io/badge/Signed_with-Cosign-purple)](https://sigstore.dev/)
[![Container: Podman](https://img.shields.io/badge/Container-Podman-892CA0)](https://podman.io/)

> **EN:** A modern reference implementation of a secure Node.js supply chain.  
> **ID:** Implementasi modern Supply Chain Security untuk aplikasi Node.js dengan pipeline DevSecOps lengkap.

Modernized from Lissy93’s example and transformed into a fully secured, shift-left hardened weather application.

---

## 🌟 Key Features

### Build & Quality
- Node.js 20 LTS
- Unit tests with Mocha, Chai, Sinon
- 80%+ coverage enforced via NYC
- Code linting and clean structure

### DevSecOps Security Pipeline

1. **SAST — SonarCloud**  
   EN: Detects bugs, vulnerabilities, code smells  
   ID: Analisis statis untuk menemukan bug & kerentanan lebih awal

2. **SCA — Snyk**  
   Auto-fail jika dependency memiliki severity High/Critical

3. **Container Security — Podman + Trivy**  
   - Podman rootless build  
   - Trivy filesystem + OS package scan

4. **Supply Chain Security — Cosign**  
   - Image ditandatangani secara kriptografis  
   - Anti-tampering verification

5. **DAST — OWASP ZAP**  
   - Dynamic penetration test  
   - HTML/JSON reports  
   - Auto-create GitHub Issues

---

## 📁 Repository Structure

```
.
├── .github/workflows/
├── test/
├── test-data/
├── app.js
├── fetch-weather.js
├── prepared-for-the-weather.js
├── fix-mocha-exit.js
├── package.json
├── package-lock.json
├── nyc.config.json
└── README.md
```

---

## 🚀 Quick Start (Podman/Docker)

### English
```
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

Access: http://localhost:3000

### Indonesian
```
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
```
npm install
npm test
npm run cover
npm start
```

### Indonesian
```
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
| SAST | SonarCloud | Static code analysis |
| SCA | Snyk | Dependency vulnerability scan |
| SBOM | Syft | Software Bill of Materials |
| Container Scan | Trivy | OS & FS vuln scan |
| Signing | Cosign | Image integrity & provenance |
| DAST | OWASP ZAP | Dynamic penetration testing |

---

## 🌐 CI/CD Pipeline Flow

```
1. Checkout Code
2. Install Dependencies
3. Unit Tests + Coverage
4. SonarCloud SAST Scan
5. Snyk SCA Scan
6. Podman Rootless Build
7. Generate SBOM (Syft)
8. Trivy Scan
9. Cosign Signing
10. OWASP ZAP DAST Scan
11. Upload Reports & Summary
```

---

## License

MIT License.

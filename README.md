# 🔐 DevSecOps-Ready Node.js Weather App

[![CI/CD Pipeline](https://github.com/<USERNAME_ANDA>/weather-app/actions/workflows/main.yml/badge.svg)](...)
[![Security: Snyk](https://img.shields.io/badge/Security-Snyk-orange)](https://snyk.io/)
[![Signed with Cosign](https://img.shields.io/badge/Signed_with-Cosign-purple)](https://github.com/sigstore/cosign)
[![Container: Podman](https://img.shields.io/badge/Container-Podman-892CA0)](https://podman.io/)

> **A reference implementation of a Secure Software Supply Chain.**

Modernized from [Lissy93’s](https://github.com/Lissy93) classic example, this project transforms a simple Node.js app into a fortress using a **State-of-the-Art DevSecOps Pipeline**.

## 🌟 Key Features

This repository demonstrates a "Shift-Left" security approach, ensuring no code is deployed without passing rigorous security gates.

### 🏗️ Build & Quality
- **Node.js 20**: Built on the latest LTS version.
- **Unit Testing**: Automated testing with **Mocha**, **Chai**, and **Sinon**.
- **Code Coverage**: >80% coverage enforcement via **NYC**.

### 🛡️ Security Pipeline (The "Sec" in DevSecOps)
1.  **SAST (Static Analysis):**
    - **SonarCloud**: Detects bugs, code smells, and security hotspots in source code.
2.  **SCA (Software Composition Analysis):**
    - **Snyk**: Scans `package.json` for vulnerable dependencies.
    - *Policy:* Fails the build on **High** or **Critical** severities.
3.  **Container Security:**
    - **Podman**: Uses daemonless, rootless build process for enhanced security.
    - **Trivy**: Scans the filesystem and OS packages for vulnerabilities before push.
4.  **Supply Chain Security:**
    - **Sigstore Cosign**: Cryptographically signs the container image using a private key.
    - Verifies that the image in the registry is exactly the same image built in the CI (Anti-Tampering).
5.  **DAST (Dynamic Analysis):**
    - **OWASP ZAP**: Runs a full penetration test against the running application via Docker container.
    - Generates HTML/JSON reports and automatically logs GitHub Issues for findings.

---

## 🚀 Quick Start (Local Development)

To run the application locally without the pipeline:

```bash
# 1. Install dependencies
npm install

# 2. Run Unit Tests
npm test

# 3. Check Code Coverage
npm run cover

# 4. Start the App
npm start
# Access at http://localhost:3000
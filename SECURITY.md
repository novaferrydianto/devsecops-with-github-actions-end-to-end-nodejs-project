# Security Policy

## Supported Versions

As this is a demonstration project for DevSecOps practices, we prioritize security updates for the latest deployment on the main branch.

| Version | Supported          | Notes |
| ------- | ------------------ | ----- |
| `master`| :white_check_mark: | The latest code on the main branch. |
| `latest`| :white_check_mark: | The latest Docker image tag. |
| < 1.0.0 | :x:                | Older releases are not supported. |

## Reporting a Vulnerability

We take the security of this application and its pipeline seriously. We appreciate the efforts of security researchers and developers who help us improve the security posture of this project.

### ⛔ Do NOT open a public issue
If you have discovered a security vulnerability, please **DO NOT** open a public GitHub Issue, as this may allow malicious actors to exploit the vulnerability before we have a chance to fix it.

### 📧 How to Report
Please report sensitive security issues via email to: **[MASUKKAN EMAIL ANDA DISINI]**

Please include the following details in your report:
1.  **Type of Vulnerability:** (e.g., XSS, SQL Injection, Pipeline Secret Leak, Container Escalation).
2.  **Full Path/Location:** The file, URL, or pipeline stage involved.
3.  **Proof of Concept (PoC):** Steps to reproduce the issue reliably.
4.  **Impact:** How could an attacker exploit this?

### ⏳ Response Timeline
We are committed to the following timeline:
* **Acknowledgment:** We aim to acknowledge receiving your report within **48 hours**.
* **Assessment:** We will confirm the vulnerability and determine its severity within **5 days**.
* **Fix:** We aim to release a patch or mitigation as soon as possible, depending on complexity.

### 🛡️ Scope
We are interested in vulnerabilities regarding:
* The Node.js Application logic (Code injection, Logic flaws).
* The CI/CD Pipeline configuration (GitHub Actions workflows).
* The Container Image configuration (Dockerfile, Base image issues).
* Supply Chain integrity (Dependency vulnerabilities).

### ❌ Out of Scope
* DDoS attacks or other volume-based attacks.
* Social engineering attacks.
* Vulnerabilities in third-party services (e.g., GitHub itself, Docker Hub itself) unless it directly affects our configuration.

---
*Thank you for helping keep this project secure!*
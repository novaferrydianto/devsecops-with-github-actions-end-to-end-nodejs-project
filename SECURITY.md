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

---
*Thank you for helping keep this project secure!*
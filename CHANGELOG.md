# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-12

### Added
- **Property-Based Fuzz Testing**: Integrated `fast-check` to core business logic (`doINeed.*`) to detect edge-case crashes.
- **Automated DAST Issue Creation**: Integrated `zaproxy/action-baseline` to automatically create/update GitHub Issues when vulnerabilities are found.
- **MIT License**: Added official project license for OSSF compliance.
- **OpenSSF Best Practices Badge**: Initiated certification effort.

### Security
- **Strict Token Hardening**: Applied Least Privilege Principle (PoLP) by setting global `permissions: contents: read` and elevating only at the job level.
- **Dependency Pinning (SHA)**: All GitHub Actions are now pinned to immutable SHA-256 digests.
- **Container Hardening**: Base images in `Dockerfile` and `Dockerfile.dev` are now pinned to SHA-256 digests.
- **SBOM Generation**: Added automated CycloneDX SBOM generation using Trivy.
- **CodeQL Advanced SAST**: Upgraded to v4 with security-extended queries.
- **Enhanced SECURITY.md**: Integrated GitHub Private Vulnerability Reporting and formal CVD policy.

### Changed
- **Modern ESM Architecture**: Refactored `app.js` and modules to use ES Modules with Top-Level Await.
- **Production-Grade Node.js**: Upgraded runtime to Node.js 24 with security-focused configurations.
- **Graceful Shutdown**: Added SIGTERM/SIGINT handlers for better GKE/Kubernetes compatibility.

### Fixed
- **DAST False Positives**: Added `/robots.txt` endpoint to satisfy crawler requirements.
- **Trivy SARIF Uploads**: Added conditional logic to handle empty vulnerability reports.

---
[1.0.0]: https://github.com/novaferrydianto/devsecops-with-github-actions-end-to-end-nodejs-project/releases/tag/v1.0.0

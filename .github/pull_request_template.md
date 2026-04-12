## 📝 Description
Fixes #(issue_number)

## 🎯 Type of Change
- [ ] ✨ Feat (New feature)
- [ ] 🐛 Fix (Bug fix)
- [ ] 🧹 Chore (Refactoring, dependencies, etc)
- [ ] 🛡️ Security (Security patches)
- [ ] 🏗️ IaC/Infra (Terraform, K8s manifests, CI/CD)
- [ ] 📖 Docs (Documentation changes)

## 🔍 Proposed Changes
- [ ] List of specific changes...
- [ ] List of specific changes...

## 🛡️ DevSecOps & Quality Checklist
- [ ] **Linting & Formatting**: Code follows the project's style guide.
- [ ] **Security Scanning**: No high/critical vulnerabilities found (Snyk/Trivy/SonarQube).
- [ ] **Secrets**: No hardcoded secrets or credentials included.
- [ ] **IaC Validation**: `terraform plan` or `tofu plan` shows expected changes (if applicable).
- [ ] **Tests**: Unit tests or Integration tests passed.
- [ ] **Documentation**: Updated README or internal docs if necessary.

## 🧪 How Has This Been Tested?
- **Test Environment**: [e.g., Local Podman, GKE Staging, etc.]
- **Test Command**: `make test` or `go test ./...`
- **Result**: [Attach screenshots or logs if relevant]

## 📸 Screenshots / Logs (Optional)
## 🚩 Risk Assessment
- **Downtime**: [Yes/No]
- **Migration Required**: [Yes/No]
- **Rollback Plan**: ```

### **Result**
Dengan menggunakan template ini, tim Anda akan mendapatkan manfaat berikut:
1.  **Standardisasi**: Setiap PR memiliki struktur yang sama, memudahkan Senior Engineer melakukan *review*.
2.  **Keamanan Terjamin**: Checklist keamanan memaksa developer untuk memeriksa *vulnerabilities* sebelum melakukan *merge*.
3.  **Audit Trail**: Memiliki catatan yang jelas mengenai bagaimana fitur diuji dan apa rencana *rollback*-nya jika terjadi insiden (SRE Best Practice).
4.  **Efficiency**: Mengurangi *back-and-forth* antara reviewer dan author karena informasi sudah lengkap di awal.

**Pro-tip from SRE Perspective:** Jika Anda menggunakan **Terragrunt/OpenTofu**, pastikan untuk selalu melampirkan output `plan` di bagian "Screenshots / Logs" agar reviewer bisa memvalidasi perubahan *state* tanpa harus menjalankan command secara manual.

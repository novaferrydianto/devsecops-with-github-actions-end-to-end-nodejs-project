---
name: "🚨 Security Scan Failure"
about: "Auto-created issue when a security scan (Snyk, Trivy, ZAP, or Secret Scanner) fails."
title: "🚨 Security Scan Failure — Needs Triage"
labels: ["security", "high-risk", "needs-triage"]
assignees: []
---

## 🧠 What failed?
Checklist scanner yang mendeteksi masalah:

- [ ] Snyk (High / Critical)
- [ ] Trivy (FS / IaC vulnerabilities)
- [ ] OWASP ZAP (High severity)
- [ ] Secret Scanner (TruffleHog / Gitleaks)
- [ ] Dependency / Supply Chain Issue
- [ ] Others (specify)

---

## 📎 Attached Artifacts
Wajib sertakan artifact dari CI/CD:

- 🔗 **Raw report file:**  
  (e.g., `snyk-report.json`, `trivy-report.txt`, `report_json.json`, `trufflehog-report.json`)

- 📄 **Relevant logs:**  
  (`pipeline logs`, stacktrace, failing module)

---

## 🧩 Impact Assessment (SOC-lite)
- 🛠️ Affected service/module:  
- 🎯 Attack surface (API / package / infra / container):  
- 🔐 Potential risk if not fixed:  
- 🌍 Prod impact: Yes / No (explain)

---

## 🧭 Next Steps (Triage Process)
- [ ] Review vulnerability details  
- [ ] Validate exploitability  
- [ ] Patch / upgrade affected dependency  
- [ ] Verify no hardcoded secrets remain  
- [ ] Re-run CI/CD security scans  
- [ ] Confirm fix + close issue  

---

## 📝 Notes
Tambahkan konteks tambahan dari pipeline atau developer.

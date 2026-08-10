# Antigravity workspace security setup

The tracked workspace rule is [`rules/devsecops.md`](rules/devsecops.md). Rules
are agent guidance only; GitHub Actions, live rulesets, signatures, and verifier
output remain the security evidence.

## One-time activation

1. Open Antigravity **Customizations → Rules**.
2. Confirm `devsecops.md` is discovered as a workspace rule.
3. Set its activation mode to **Always On**.
4. Start a new conversation so the rule is loaded from a clean context.

Antigravity documents workspace rules under `.agents/rules/`:
<https://antigravity.google/docs/ide/rules>.

## Project security settings

Repository rules cannot grant or deny tools. Configure the Antigravity Project
separately with these minimum boundaries:

- Terminal Command Auto Execution: **Request Review**.
- Artifact Review: **Request Review**.
- Non-workspace file access: disabled.
- Keep terminal commands, browser actuation, and modifying MCP operations in
  **Ask** unless a narrower reviewed rule exists.
- Deny reads/writes to real credential files and key material. Do not use a real
  secret when testing this boundary.
- Avoid broad wildcards such as `read_file(*)`, `write_file(*)`, `command(*)`,
  `execute_url(*)`, or `mcp(*)` in an Allow list.

Review the current permission model before relying on it:
<https://antigravity.google/docs/permissions>.

## Safe validation

- Ask a clean agent to summarize the repository stack. It should identify the
  Node.js weather application and state that no IaC or Kubernetes deployment is
  present without claiming that external SaaS accounts do not exist.
- Ask whether `.agents/rules/devsecops.md` proves a GitHub control passed. It
  must answer no and request run or live-setting evidence.
- Use a dummy fixture, never a real credential, to verify that the agent refuses
  to print or upload secret values.
- Open a PR that changes `.agents/rules/devsecops.md`; `pr-policy` must classify
  it as a high-risk path.


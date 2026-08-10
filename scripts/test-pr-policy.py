#!/usr/bin/env python3
"""Semantic regression tests for the PR policy gate.

`actionlint` proves the workflow YAML is well-formed; it cannot prove that the
policy embedded inside it still *decides* correctly. This harness executes the
real embedded program against the real PR template and asserts its verdicts, so
a weakened classifier or a forgeable identity check fails CI instead of shipping.

Standard library only, on purpose: the check must add no dependency to install
and no endpoint to the harden-runner egress allowlist.

Run from the repository root:

    python3 scripts/test-pr-policy.py
"""
from __future__ import annotations

import datetime as dt
import json
import os
import pathlib
import re
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
WORKFLOW = ROOT / ".github/workflows/pr-policy.yml"
TEMPLATE_PATH = ROOT / ".github/pull_request_template.md"
HEREDOC_TAG = "PY"
EXPECTED_OPENER = 'python3 - "$PR_BODY_FILE" "$CHANGED_FILES_JSON" <<\'PY\''
EXPECTED_REQUIRED_FIELDS = (
    "Environment",
    "Commands executed",
    "Result",
    "CI run / artifact / report links",
    "Risk level",
    "Affected users/services/data",
    "Blast radius and worst credible failure",
    "Downtime expected",
    "Migration or backward-compatibility impact",
    "Rollout plan",
    "Signals/dashboards/logs used to verify the change",
    "Alerts and rollback trigger",
    "SLO/error-budget impact",
    "Rollback steps",
    "Estimated recovery time",
    "Post-rollback validation",
)
EXPECTED_CHECKBOXES = (
    "Relevant linting, tests, and security checks pass.",
    "Evidence above is sanitized and contains no secrets, credentials, or sensitive data.",
    "No hardcoded secrets, credentials, or unnecessary new permissions are introduced.",
    "New/updated dependencies, actions, and images are immutable or lockfile-pinned where supported.",
    "Relevant SAST, SCA, secret, IaC, container, and/or DAST results were reviewed.",
    "High/Critical findings are remediated, or a time-bound exception is documented below.",
)

failures: list[str] = []


def fail(message: str) -> None:
    failures.append(message)
    print(f"FAIL  {message}")


def ok(message: str) -> None:
    print(f"PASS  {message}")


def extract_embedded_python(text: str) -> str:
    """Pull the heredoc body out of the workflow without a YAML parser.

    Reading the literal bytes is deliberate: it proves the exact runtime command,
    opener, and terminator survive YAML block-scalar dedenting. Merely finding any
    heredoc would false-green if `python3 ...` were replaced with `cat ...`.
    """
    lines = text.replace("\r\n", "\n").split("\n")
    starts = [i for i, line in enumerate(lines) if line.strip() == EXPECTED_OPENER]
    if len(starts) != 1:
        raise SystemExit(
            f"expected exactly one runtime opener {EXPECTED_OPENER!r}, "
            f"found {len(starts)}"
        )

    start = starts[0]
    indent = len(lines[start]) - len(lines[start].lstrip())
    pad = " " * indent

    body: list[str] = []
    for line in lines[start + 1:]:
        if line == f"{pad}{HEREDOC_TAG}":
            return "\n".join(body)
        if line.strip() and not line.startswith(pad):
            raise SystemExit(f"heredoc line is under-indented: {line!r}")
        body.append(line[indent:])
    raise SystemExit(f"heredoc terminator {HEREDOC_TAG} never appeared at indent {indent}")


PROGRAM = extract_embedded_python(WORKFLOW.read_text(encoding="utf-8"))
compile(PROGRAM, "pr-policy-embedded", "exec")
ok("embedded policy program extracts and compiles")

TEMPLATE = TEMPLATE_PATH.read_text(encoding="utf-8")
REQUIRED_FIELDS = re.findall(
    r'"([^"]+)"', re.search(r"required_fields = \[(.*?)\]", PROGRAM, re.S).group(1))
CHECKBOXES = re.findall(
    r'"([^"]+)"', re.search(r"checkbox_texts = \[(.*?)\]", PROGRAM, re.S).group(1))

if tuple(REQUIRED_FIELDS) == EXPECTED_REQUIRED_FIELDS:
    ok(f"embedded policy retains all {len(EXPECTED_REQUIRED_FIELDS)} required fields")
else:
    fail(
        "embedded required-field contract changed: "
        f"expected {EXPECTED_REQUIRED_FIELDS!r}, got {tuple(REQUIRED_FIELDS)!r}"
    )

if tuple(CHECKBOXES) == EXPECTED_CHECKBOXES:
    ok(f"embedded policy retains all {len(EXPECTED_CHECKBOXES)} attestations")
else:
    fail(
        "embedded attestation contract changed: "
        f"expected {EXPECTED_CHECKBOXES!r}, got {tuple(CHECKBOXES)!r}"
    )


# --------------------------------------------------------------------------
# 1. Template contract: every demanded label must exist verbatim, or the gate
#    is unpassable no matter how diligently an author fills the form.
# --------------------------------------------------------------------------
contract_failures = len(failures)
for field in EXPECTED_REQUIRED_FIELDS:
    if not re.search(rf"^\s*-\s+\*\*{re.escape(field)}:\*\*", TEMPLATE, re.M):
        fail(f"required field absent from PR template: {field}")
for checkbox in EXPECTED_CHECKBOXES:
    if checkbox not in TEMPLATE:
        fail(f"required attestation absent from PR template: {checkbox}")
if len(failures) == contract_failures:
    ok(f"PR template carries all {len(EXPECTED_REQUIRED_FIELDS)} fields "
       f"and {len(EXPECTED_CHECKBOXES)} attestations")


# --------------------------------------------------------------------------
# 2. High-risk path classifier.
# --------------------------------------------------------------------------
namespace: dict = {}
exec(  # noqa: S102 - executing our own workflow source is the point
    "import re\nfrom pathlib import PurePosixPath\n"
    + PROGRAM[PROGRAM.index("SECURITY_SCRIPT_KEYWORDS"):PROGRAM.index("high_risk_files =")],
    namespace,
)
is_high_risk = namespace["is_high_risk"]

HIGH_RISK_PATHS = [
    ".github/workflows/devsecops-pipeline.yaml",
    ".github/CODEOWNERS",
    ".github/pull_request_template.md",
    ".agents/README.md",
    ".agents/rules/devsecops.md",
    ".antigravity/instructions.md",   # legacy path stays protected
    ".zap/rules.tsv",
    "AGENTS.md",
    "CLAUDE.md",
    "GEMINI.md",
    "SECURITY.md",
    "Dockerfile",
    "Dockerfile.dev",
    "package.json",
    "package-lock.json",
    ".dockerignore",
    ".pre-commit-config.yaml",
    ".trivyignore.yaml",
    "sonar-project.properties",
    "scripts/check-licenses.js",
    "scripts/Test-GitHubSecurityBaseline.ps1",
    "scripts/test-pr-policy.py",       # this file must guard itself
]
LOW_RISK_PATHS = [
    "app.js",
    "fetch-weather.js",
    "prepared-for-the-weather.js",
    "README.md",
    "CHANGELOG.md",
    ".gitignore",
    "test/app-test.js",
    "test-data/weather.json",
    "docs/github-security-rollout.md",
    "podman-compose.yml",
    "scripts/coverage-makeover.js",
]

for path in HIGH_RISK_PATHS:
    if not is_high_risk(path):
        fail(f"expected high-risk, classified low: {path}")
for path in LOW_RISK_PATHS:
    if is_high_risk(path):
        fail(f"expected low-risk, classified high: {path}")
if not any(message.startswith(("expected high-risk", "expected low-risk"))
           for message in failures):
    ok(f"classifier agrees on {len(HIGH_RISK_PATHS)} high-risk "
       f"and {len(LOW_RISK_PATHS)} low-risk paths")


# --------------------------------------------------------------------------
# 3. End-to-end verdicts: run the real program over a real PR body.
# --------------------------------------------------------------------------
filled = TEMPLATE
for field in REQUIRED_FIELDS:
    value = ("https://github.com/o/r/actions/runs/1 plus report artifact"
             if "links" in field else f"documented value for {field}")
    filled = re.sub(rf"^(\s*-\s+\*\*{re.escape(field)}:\*\*).*$", rf"\1 {value}",
                    filled, count=1, flags=re.M)
for checkbox in CHECKBOXES:
    filled = filled.replace(f"- [ ] {checkbox}", f"- [x] {checkbox}")

NO_EXCEPTION = re.sub(r"^(\s*-\s+\*\*Finding / CVE / policy:\*\*).*$", r"\1 N/A",
                      filled, count=1, flags=re.M)
MISSING_CI_EVIDENCE = re.sub(
    r"^(\s*-\s+\*\*CI run / artifact / report links:\*\*).*$",
    r"\1",
    NO_EXCEPTION,
    count=1,
    flags=re.M,
)


def with_exception(owner: str, expiry_days: int = 60) -> str:
    body = filled
    expiry = (dt.date.today() + dt.timedelta(days=expiry_days)).isoformat()
    for label, value in (
        ("Finding / CVE / policy", "CVE-0000-00000 in a base image"),
        ("Risk owner and approver", owner),
        ("Business justification", "no upstream fix is published yet"),
        ("Compensating controls", "egress blocked; not reachable at runtime"),
        ("Expiry date (YYYY-MM-DD)", expiry),
        ("Tracking issue", "#123"),
    ):
        body = re.sub(rf"^(\s*-\s+\*\*{re.escape(label)}:\*\*).*$", rf"\1 {value}",
                      body, count=1, flags=re.M)
    return body


def verdict(
    body: str,
    label: str,
    expect: int,
    mode: str = "solo",
    summary_contains: tuple[str, ...] = (),
    summary_excludes: tuple[str, ...] = (),
) -> None:
    with tempfile.TemporaryDirectory() as raw:
        tmp = pathlib.Path(raw)
        (tmp / "body.md").write_text(body, encoding="utf-8")
        (tmp / "files.json").write_text(
            json.dumps([[{"filename": ".github/workflows/pr-policy.yml"}]]),
            encoding="utf-8")
        (tmp / "policy.py").write_text(PROGRAM, encoding="utf-8")
        summary_path = tmp / "summary.md"
        proc = subprocess.run(
            [sys.executable, str(tmp / "policy.py"),
             str(tmp / "body.md"), str(tmp / "files.json")],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
            env={**os.environ,
                 "GITHUB_STEP_SUMMARY": str(summary_path),
                 "PR_POLICY_GOVERNANCE_MODE": mode},
            check=False)
        summary = (summary_path.read_text(encoding="utf-8")
                   if summary_path.exists() else "")

    problems: list[str] = []
    if proc.returncode != expect:
        problems.append(f"expected exit {expect}, got {proc.returncode}")
    for fragment in summary_contains:
        if fragment not in summary:
            problems.append(f"summary missing {fragment!r}")
    for fragment in summary_excludes:
        if fragment in summary:
            problems.append(f"summary unexpectedly contains {fragment!r}")

    if not problems:
        ok(f"[{mode}] {label}")
    else:
        fail(f"[{mode}] {label} — {'; '.join(problems)}")


verdict(TEMPLATE, "unfilled template is rejected", expect=1)
verdict(
    MISSING_CI_EVIDENCE,
    "blank CI evidence before checkboxes reports the missing field",
    expect=1,
    summary_contains=(
        "Complete the `CI run / artifact / report links` field with non-placeholder evidence.",
    ),
    summary_excludes=(
        "`CI run / artifact / report links` must contain a sanitized HTTPS evidence link.",
    ),
)
verdict(
    NO_EXCEPTION,
    "fully filled, no exception, is accepted",
    expect=0,
    summary_contains=(
        "Exception governance model: **solo**",
        "PASS: Required validation, risk, observability, rollback, security, and exception evidence is complete.",
    ),
)
verdict(with_exception("@octocat"), "exception with one handle", expect=0)
verdict(with_exception("@octocat", 400), "exception expiring beyond the cap", expect=1)

# Forgeable-identity regressions. Each of these was accepted at some point.
verdict(with_exception("owner: Alice"), "role text with no handle", expect=1)
verdict(with_exception("owner: Alice; approver: Alice"),
        "role text naming one person twice", expect=1, mode="four-eyes")
verdict(with_exception("@Octocat and @octocat"),
        "one login written in two cases", expect=1, mode="four-eyes")
verdict(with_exception("owner@example.com"),
        "email address parsed as a handle", expect=1)
verdict(with_exception("alice@foo.com and bob@bar.com"),
        "two email domains posing as two reviewers", expect=1, mode="four-eyes")
verdict(with_exception("@octocat.com"), "domain name posing as a handle", expect=1)
# Dotless hosts are what the leading lookbehind uniquely protects against: the
# trailing guards only reject a domain because of its dot, so without these two
# cases the lookbehind could be deleted and every other test would still pass.
verdict(with_exception("owner@localhost and admin@intranet"),
        "dotless email hosts posing as two reviewers", expect=1, mode="four-eyes")
verdict(with_exception("root@mail-01"), "dotless email host posing as a handle", expect=1)
verdict(with_exception("owner+@localhost"),
        "plus local-part dotless email posing as a handle", expect=1)
verdict(with_exception("owner!@localhost"),
        "punctuated local-part dotless email posing as a handle", expect=1)
verdict(with_exception("owner+@localhost and admin+@intranet"),
        "two punctuated dotless emails posing as reviewers", expect=1,
        mode="four-eyes")
verdict(with_exception("@a--b"), "invalid consecutive-hyphen login", expect=1)
verdict(with_exception("@dependabot[bot]"), "bot suffix posing as a user mention", expect=1)
verdict(with_exception("@org/team"), "team path posing as a user mention", expect=1)
verdict(with_exception(r"\@octocat"), "escaped mention", expect=1)
verdict(with_exception("`@octocat`"), "code-formatted mention", expect=1)
verdict(with_exception("https://github.com/@octocat"), "URL-path mention", expect=1)
verdict(with_exception("@octocat..com"), "double-dot domain posing as a handle", expect=1)

# Guards against over-correction: these must still be accepted.
verdict(with_exception("@octocat."), "handle followed by sentence punctuation", expect=0)
verdict(with_exception("reachable at alice@example.com, owner is @octocat"),
        "real handle alongside an email address", expect=0)
verdict(with_exception("@octocat and @hubot"),
        "two distinct handles", expect=0, mode="four-eyes",
        summary_contains=("Exception governance model: **four-eyes**",))
verdict(with_exception("@octocat"),
        "single handle under four-eyes", expect=1, mode="four-eyes")

print()
if failures:
    print(f"{len(failures)} PR-policy regression(s) detected.")
    sys.exit(1)
print("PR policy behaves as specified.")

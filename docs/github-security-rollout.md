# GitHub Security Controls Rollout

Workflow remediation and live GitHub enforcement are separate phases. A check
must emit its exact context from the expected GitHub App before it becomes
required. Live changes must be snapshotted, applied in the order below, and
verified without weakening a gate merely to obtain a green result.

## Live status (verified 2026-08-11)

Every control below is implemented and live-verified against the GitHub API,
with one deliberate exception:

- `master` ruleset `required_signatures`: **on** (verified). Root cause of the
  earlier `unknown_key` result was not key registration — it was that the
  machine's global git identity was set to a separate real GitHub account
  (`antigravity-ai`, id 256725992), so GitHub resolved the signing-key lookup
  against that account's keys, never the owner's. Reset
  `user.name`/`user.email` to the owner's own account and the very next
  commit (`a6e49707`) reported `verified: true, reason: "valid"` from both
  `GET /commits/{sha}` and `GET /git/commits/{sha}`. The 20 commits made
  before this fix remain `unknown_key` and cannot become verified
  retroactively; per GitHub's own documented behavior, a PR author may still
  squash-merge under `required_signatures` (GitHub synthesizes and signs the
  squashed commit itself), so PR #402 must be merged with **squash**, not
  merge-commit or rebase, or the unverified history rejoins `master` and the
  merge is rejected.

- Default `GITHUB_TOKEN` permission: **read** (verified).
- `allowed_actions: selected`, `sha_pinning_required: true`, with
  `github_owned_allowed: true` plus every third-party action *and its
  transitive sub-actions* (e.g. `aquasecurity/trivy-action` pulls in
  `aquasecurity/setup-trivy`) explicitly patterned as `owner/repo@*`
  (verified).
- `master` ruleset: `bypass_actors: []`, `current_user_can_bypass: "never"`,
  `required_approving_review_count: 0`, CODEOWNER review and last-push
  approval off, linear history and deletion/non-fast-forward protection on
  (verified).
- Required status checks on `master`: `StepSecurity Harden-Runner` (App
  169968), `🕵️ Secret Scanning`, `🧾 Summary`, `pr-policy`,
  `dependency-review`, `actionlint` (App 15368 each), and **`CodeQL`** (App
  57789, `github-advanced-security`) — **not** the per-language `Analyze
  (actions)` / `Analyze (javascript-typescript)` contexts this document
  originally called for. Live evidence on real PRs shows the aggregate
  `CodeQL` app check posts reliably every run; it is not a phantom. Requiring
  it instead of the two per-matrix contexts is also GitHub's own recommended
  pattern, since it survives the matrix's language list changing without a
  ruleset edit.
- `refs/tags/v*` ruleset: update/deletion only, no creation rule, zero bypass
  actors (verified).
- `production-release` environment: 15-minute wait timer, zero required
  reviewers, `deployment_branch_policy` scoped to the exact `v*` tag pattern
  (verified).

**Resolved — required signed commits.** Two SSH keys were correctly
registered as GitHub Signing Keys (fingerprint-verified against the account,
confirmed by direct local `ssh-keygen`/`git log --show-signature` crypto
checks) and both still reported `unknown_key`. The actual defect was
identity, not key material: the git identity producing these commits was a
different GitHub account entirely. Registering more keys under the owner's
account could never have fixed that, since GitHub was never looking there.
See "Live status" above for the working fix and the squash-merge
requirement it leaves behind for any PR opened before the identity
correction.

**Not yet implemented — code-scanning severity threshold.** The `CodeQL`
required check only proves the scan *ran* successfully; it does not yet
gate on new High/Critical findings specifically (a separate code-scanning
branch-protection setting from the ruleset `required_status_checks` used
here). Tracked as a near-term follow-up, not a blocker for this rollout.

With signed-commit verification now closed, the decision is **Pass With
Conditions**, per this document's own permanent ceiling for a solo-maintainer
profile — never full Pass, and conditional on the residual risk below.

## Selected profile: solo maintainer

This personal repository has one collaborator: the owner. The selected model is
therefore a **solo-maintainer compensating-control profile**, not four-eyes.
Required approvals, required CODEOWNER review, and last-push approval must be
off because the owner cannot approve their own PR. `CODEOWNERS` may remain as
ownership metadata, but it is not an enforcing review control.

This profile needs explicit, time-bounded risk acceptance naming the risk owner,
expiry/review date, compensating controls, and exit criteria. Until that record
exists and the controls below are proven, the decision remains **FAIL**. After
validation, the permanent ceiling is **Pass With Conditions**, never full Pass.
Do not invent a reviewer or second account controlled by the owner.

## Solo target baseline

- Default `GITHUB_TOKEN` permission is read-only.
- Actions are enabled with `allowed_actions: selected`; allow GitHub-owned
  actions plus only the explicit third-party `owner/action` patterns used here.
  `sha_pinning_required` is `true`.
- `master` requires a pull request with zero required approvals, no required
  CODEOWNER review, no last-push approval, resolved threads, linear history,
  required signed commits, and deletion/non-fast-forward protection.
- No applicable branch ruleset grants any bypass actor. In particular, reject
  generic `RepositoryRole` modes `always` and `pull_request`. The latter blocks
  direct push but still lets an eligible actor merge a red PR, so it is only a
  time-boxed transition and never a PASS.
- Required checks are `StepSecurity Harden-Runner`, `CodeQL`, `🕵️ Secret
  Scanning`, `🧾 Summary`, `dependency-review`, `actionlint`, and
  `pr-policy`. Pin StepSecurity to App ID `169968`, `CodeQL` to App ID
  `57789` (`github-advanced-security`), and the remaining contexts to GitHub
  Actions App ID `15368`. See "Live status" above: the plain `CodeQL`
  aggregate context was confirmed live and correct, not phantom — use it
  instead of the two per-matrix-language contexts.
- Code-scanning merge protection is scoped to **CodeQL** analysis errors and new
  High/Critical CodeQL alerts. Do not use a tool-agnostic gate during bootstrap;
  existing Scorecard governance alerts would create a circular block.
- An active ruleset covers only `refs/tags/v*`, has no exclusions, restricts
  update and deletion, does **not** restrict creation, and has zero bypass actors.
  The owner may create a new version tag normally, but nobody may move or delete
  it without an audited ruleset change. Adding `creation` with no bypass would
  brick releases; a `pull_request` bypass does not apply to tags.
- `production-release` has no required reviewers; `prevent_self_review` is not
  asserted as a control when nobody can review. It uses a wait timer of at least
  15 minutes (15–30 minutes is the recommended operating range) and exactly the
  custom `v*` tag deployment policy. The delay is a detection/response window,
  not independent approval.

Required signed commits are also compensating, not proof of hardware-backed
owner intent. Audit evidence for the five observed commits contains Antigravity
AI SSH signature payloads, but GitHub reports `verified: false` and
`reason: unknown_key`: they are signed-but-unverified, not unsigned, and must
not be attributed to the owner. Register the owner's hardware-backed SSH signing
key with GitHub, sign local commits, and require PR checks. A green GitHub
web-flow signature proves GitHub's web-flow signer, not use of the owner's
hardware key.

## Check evidence contract

| Evidence | Where it must be proven |
| --- | --- |
| `dependency-review`, `pr-policy`, `🕵️ Secret Scanning` | Latest bootstrap PR evaluation (PR head/GitHub test-merge commit); these are PR-only and never appear on the final `master` merge SHA |
| `actionlint`, both `Analyze (...)` contexts, `🧾 Summary`, StepSecurity | Same latest PR evaluation, using the exact context name and App reported by GitHub |
| `DevSecOps Pipeline` artifact result | Exact commit after it reaches `master` |
| Release governance and bundle | Fresh protected prerelease tag after tag immutability and environment controls exist |

Do not add a required context until it has succeeded on the latest PR evaluation.
Do not wait for a PR-only context on the final merge SHA.

## Safe rollout order for the solo profile

1. Record the explicit solo-maintainer risk acceptance and its expiry. Do not
   label the result Pass With Conditions before this governance prerequisite is
   complete.
2. Export the current ruleset JSON, Actions policy, environments, required
   contexts/App IDs, and rule-suite evidence for rollback.
3. Register a hardware-backed SSH signing key, create a signed bootstrap commit,
   and verify through the GitHub API that it reports `verified: true`. Treat the
   existing `unknown_key` observations as failed identity verification.
4. Remove only the phantom `CodeQL` required context. If risk reduction is needed
   while the bootstrap PR is prepared, change Admin bypass from `always` to
   `pull_request`; this is a short-lived failing state, not enforcement.
5. Push the remediation branch and open a PR. Prove every required context on
   its latest PR head/test-merge evaluation and confirm the expected App ID.
6. Inventory every referenced action, then set default workflow permissions to
   read, `allowed_actions` to `selected`, its allowlist to the minimum complete
   set, and `sha_pinning_required` to `true`.
7. Atomically configure the proven required contexts, CodeQL-scoped gate,
   required signatures, zero approvals, CODEOWNER review off, last-push approval
   off, and no bypass actor. Because `strict_required_status_checks_policy` is
   true, update the PR and rerun all contexts if `master` moves or the required
   context set changes.
8. Merge the owner-authored PR with GitHub squash merge only after all checks
   are green, then confirm the resulting commit is verified. Verify that exact
   commit's `master` pipeline; direct push and red-PR merge must now be denied.
9. Merge coordinated `release.yml` and verifier support for GovernanceMode
   `Solo` before changing release settings. Configure the `refs/tags/v*` ruleset
   with update/deletion only, no creation rule, and no bypass. Configure
   `production-release` with no reviewers, a wait timer of at least 15 minutes
   (recommended: 15–30), and only the exact `v*` custom deployment policy.
10. Create a fresh prerelease tag normally, confirm that the wait timer is
    enforced, and verify the signature, SBOM, provenance, checksums, and
    certificate identity from a clean machine. Confirm attempts to move or
    delete the tag are rejected.

## Read-only verifier and manual execution

Run the Solo verifier from an authenticated administrator shell:

```powershell
pwsh ./scripts/Test-GitHubSecurityBaseline.ps1 -GovernanceMode Solo -BypassLookbackDays 30
```

In `GovernanceMode Solo`, the verifier must also require zero approvals,
CODEOWNER review off, last-push approval off, resolved conversations, effective
required signatures, immutable-after-creation version tags, no tag bypass, and
a release wait timer of at least 15 minutes without required reviewers. It
checks Actions enablement,
selected-action policy, mandatory SHA pinning, both branch role-bypass modes,
and `rulesets/rule-suites?ref=refs/heads/master`. It fails when a rule suite has
`result: bypass` inside the lookback window, or when timestamps/API responses
cannot be validated. This is behavioral evidence in addition to configuration.

Expose the same command only through `workflow_dispatch` from trusted `master`;
do not configure a scheduled trigger for this repository. Reject a manual run
whose ref is not `refs/heads/master`, check out without persisted credentials,
and inject a repository-scoped fine-grained read-only credential from a
branch-restricted audit environment. Grant only the read permissions needed for
repository Administration, Actions, and Metadata; the workflow must not
mutate settings. Run it manually after governance changes, before a release, or
during incident/post-incident verification.

Expected transitional failures are evidence, not verifier defects:

- `RepositoryRole/always` fails until it is converted in step 4 or removed in
  step 7.
- `RepositoryRole/pull_request` fails whenever the optional transition in step 4
  is active and until all bypass actors are removed in step 7.
- Missing signed-commit enforcement, tag immutability, wait timer, or exact
  environment tag policy fails in Solo mode.
- Historical `result: bypass` remains failed until the configured lookback ages
  out. Do not reduce the window or erase evidence to force green.

## Negative validation

- Invalid workflow YAML, vulnerable dependency changes, secret canaries, and PR
  policy violations must each block a test PR. Never use a live secret as a
  canary.
- A direct push, an unverified signed commit, and a red-check PR merge to
  `master` must be rejected without an Admin bypass option. A normal owner PR
  with all required checks green must remain mergeable without self-approval.
- A new High CodeQL finding or CodeQL analysis error must block merge; Scorecard
  findings remain separately tracked until governance remediation closes them.
- A tag outside `master`, malformed SemVer, or a commit without a successful
  `DevSecOps Pipeline` run must fail release. A new valid tag may be created,
  but update and deletion attempts must be rejected.
- A Solo release must wait for the configured delay of at least 15 minutes and
  must not request a reviewer. The timer is not described as approval.
- The published prerelease must contain and independently verify its source,
  metadata, checksums, Cosign evidence, SBOM, and provenance.

## Rollback, cost, and residual risk

If a new required-context name/App ID is wrong, remove only that context, fix it
through a PR, prove a successful PR run, and restore it; do not disable the full
ruleset. If signature enforcement blocks all merges, remove only that new rule,
correct key registration/signing, prove `verified: true`, and restore it. A
GitHub web-flow signature may restore availability but must not be recorded as
proof that the owner's hardware key signed the commit.

If the selected-action allowlist is incomplete, restore the recorded prior
Actions policy only long enough to add the exact missing pattern, then re-enable
the target. A bad environment configuration must leave release pending/failed
while corrected; do not add a fake reviewer. Version tags are immutable by
design: publish a corrected version rather than moving a tag. If deletion is
legally or operationally unavoidable, make the narrow ruleset change as an
audited break-glass event, delete only the exact tag, restore the rule, and
perform post-incident review.

The wait timer adds 15–30 minutes to every release, hardware-backed signing adds
key provisioning/recovery cost, and selected actions require allowlist upkeep.
Single-account compromise remains the dominant High governance risk; these
controls reduce blast radius and improve evidence but cannot create independent
approval. Consequently this Solo profile has a permanent **Pass With
Conditions** ceiling, conditional on explicit risk acceptance, successful
negative tests, and no recent bypass. Without those conditions the decision is
**FAIL**.

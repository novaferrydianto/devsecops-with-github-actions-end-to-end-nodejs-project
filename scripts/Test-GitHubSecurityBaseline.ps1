#requires -Version 7.2

<#+
.SYNOPSIS
Audits the live GitHub repository controls required by this repository.

.DESCRIPTION
Read-only by design. The script never mutates GitHub settings. It exits 1 when
one or more required controls are missing, making it suitable for a guarded
post-merge validation or an administrator's local pre-change check.
#>

[CmdletBinding()]
param(
    [string]$Repository,
    [string]$ProtectedBranch = 'master',
    [string]$ReleaseEnvironment = 'production-release',
    [ValidateSet('Solo', 'FourEyes')]
    [string]$GovernanceMode = 'Solo',
    [ValidateRange(1, 3650)]
    [int]$BypassLookbackDays = 30,
    [string[]]$RequiredChecks = @(
        'StepSecurity Harden-Runner',
        'Analyze (actions)',
        'Analyze (javascript-typescript)',
        '🕵️ Secret Scanning',
        '🧾 Summary',
        'dependency-review',
        'actionlint',
        'pr-policy'
    ),
    [string[]]$ForbiddenChecks = @('CodeQL'),
    [hashtable]$RequiredCheckAppIds = @{
        'StepSecurity Harden-Runner'      = 169968
        'Analyze (actions)'               = 15368
        'Analyze (javascript-typescript)' = 15368
        '🕵️ Secret Scanning'              = 15368
        '🧾 Summary'                      = 15368
        'dependency-review'               = 15368
        'actionlint'                      = 15368
        'pr-policy'                       = 15368
    }
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$failures = [System.Collections.Generic.List[string]]::new()

function Get-OptionalProperty {
    param(
        [Parameter(Position = 0)]
        [AllowNull()]
        [object]$InputObject,
        [Parameter(Mandatory, Position = 1)]
        [string]$Name
    )

    if ($null -eq $InputObject) {
        return $null
    }

    $property = $InputObject.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $null
    }

    return $property.Value
}

function Invoke-GhApi {
    param(
        [Parameter(Mandatory)]
        [string]$Endpoint,
        [switch]$AllowNotFound
    )

    $raw = @(& gh api $Endpoint 2>&1)
    $exitCode = $LASTEXITCODE
    $text = ($raw | ForEach-Object { $_.ToString() }) -join "`n"

    if ($exitCode -ne 0) {
        if ($AllowNotFound -and $text -match '(HTTP 404|Not Found)') {
            return $null
        }

        throw "gh api '$Endpoint' failed (exit $exitCode): $text"
    }

    if ([string]::IsNullOrWhiteSpace($text)) {
        return $null
    }

    return $text | ConvertFrom-Json -Depth 100
}

function Invoke-GhApiPaginatedArray {
    param(
        [Parameter(Mandatory)]
        [string]$Endpoint,
        [ValidateRange(1, 100)]
        [int]$PerPage = 100
    )

    $items = [System.Collections.Generic.List[object]]::new()
    $page = 1

    while ($true) {
        $separator = if ($Endpoint.Contains('?')) { '&' } else { '?' }
        $pageEndpoint = "$Endpoint${separator}per_page=$PerPage&page=$page"
        $raw = @(& gh api $pageEndpoint 2>&1)
        $exitCode = $LASTEXITCODE
        $text = ($raw | ForEach-Object { $_.ToString() }) -join "`n"

        if ($exitCode -ne 0) {
            throw "gh api '$pageEndpoint' failed (exit $exitCode): $text"
        }

        if ([string]::IsNullOrWhiteSpace($text)) {
            throw "gh api '$pageEndpoint' returned an empty response."
        }

        if (-not $text.TrimStart().StartsWith('[')) {
            throw "gh api '$pageEndpoint' returned a non-array response."
        }

        try {
            $pageItems = @($text | ConvertFrom-Json -Depth 100)
        }
        catch {
            throw "gh api '$pageEndpoint' returned malformed JSON: $($_.Exception.Message)"
        }

        foreach ($item in $pageItems) {
            $items.Add($item)
        }

        if ($pageItems.Count -lt $PerPage) {
            break
        }

        $page++
    }

    return $items.ToArray()
}

function Test-Control {
    param(
        [Parameter(Mandatory)]
        [bool]$Condition,
        [Parameter(Mandatory)]
        [string]$Pass,
        [Parameter(Mandatory)]
        [string]$Fail
    )

    if ($Condition) {
        Write-Host "PASS  $Pass" -ForegroundColor Green
        return
    }

    Write-Host "FAIL  $Fail" -ForegroundColor Red
    $failures.Add($Fail)
}

if ([string]::IsNullOrWhiteSpace($Repository)) {
    $repoRaw = @(& gh repo view --json nameWithOwner --jq '.nameWithOwner' 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to resolve the current GitHub repository: $($repoRaw -join "`n")"
    }
    $Repository = ($repoRaw -join '').Trim()
}

if ($Repository -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') {
    throw "Repository must use owner/name format; received '$Repository'."
}

Write-Host "Auditing GitHub security baseline for $Repository" -ForegroundColor Cyan
Write-Host "Governance mode: $GovernanceMode" -ForegroundColor Cyan

$actionsPermissions = Invoke-GhApi "repos/$Repository/actions/permissions"
$actionsEnabled = Get-OptionalProperty $actionsPermissions 'enabled'
$allowedActions = Get-OptionalProperty $actionsPermissions 'allowed_actions'
$shaPinningRequired = Get-OptionalProperty $actionsPermissions 'sha_pinning_required'
Test-Control `
    ($actionsEnabled -eq $true) `
    'GitHub Actions is enabled for the repository.' `
    'GitHub Actions is disabled or its enabled state could not be observed.'
Test-Control `
    ($allowedActions -ceq 'selected') `
    "GitHub Actions allowed_actions is exactly 'selected'." `
    "GitHub Actions allowed_actions is '$allowedActions'; expected exactly 'selected'."
Test-Control `
    ($shaPinningRequired -eq $true) `
    'GitHub Actions requires full-length commit SHA pinning.' `
    'GitHub Actions sha_pinning_required is not true or could not be observed.'

$workflowPermissions = Invoke-GhApi "repos/$Repository/actions/permissions/workflow"
$defaultWorkflowPermissions = Get-OptionalProperty $workflowPermissions 'default_workflow_permissions'
Test-Control `
    ($defaultWorkflowPermissions -eq 'read') `
    'Default GITHUB_TOKEN permission is read-only.' `
    "Default GITHUB_TOKEN permission is '$defaultWorkflowPermissions'; expected 'read'."

$repositoryDetails = Invoke-GhApi "repos/$Repository"
$security = Get-OptionalProperty $repositoryDetails 'security_and_analysis'
$secretScanning = Get-OptionalProperty $security 'secret_scanning'
$pushProtection = Get-OptionalProperty $security 'secret_scanning_push_protection'
Test-Control `
    ((Get-OptionalProperty $secretScanning 'status') -eq 'enabled') `
    'GitHub Secret Scanning is enabled.' `
    'GitHub Secret Scanning is not enabled or could not be observed.'
Test-Control `
    ((Get-OptionalProperty $pushProtection 'status') -eq 'enabled') `
    'GitHub Push Protection is enabled.' `
    'GitHub Push Protection is not enabled or could not be observed.'

$rulesetSummaries = @(Invoke-GhApi "repos/$Repository/rulesets?includes_parents=true&per_page=100")
$rulesets = @(
    foreach ($summary in $rulesetSummaries) {
        $rulesetId = Get-OptionalProperty $summary 'id'
        if ($null -ne $rulesetId) {
            Invoke-GhApi "repos/$Repository/rulesets/$rulesetId"
        }
    }
)

$encodedBranch = [Uri]::EscapeDataString($ProtectedBranch)
$effectiveRules = @(Invoke-GhApi "repos/$Repository/rules/branches/$encodedBranch")
$effectiveRuleTypes = @(
    $effectiveRules |
        ForEach-Object { Get-OptionalProperty $_ 'type' } |
        Where-Object { $null -ne $_ }
)
$applicableRulesetIds = @(
    $effectiveRules |
        ForEach-Object { Get-OptionalProperty $_ 'ruleset_id' } |
        Where-Object { $null -ne $_ } |
        Sort-Object -Unique
)
$applicableBranchRulesets = @(
    foreach ($rulesetId in $applicableRulesetIds) {
        $ruleset = @(
            $rulesets | Where-Object {
                (Get-OptionalProperty $_ 'id') -eq $rulesetId
            }
        ) | Select-Object -First 1

        if ($null -eq $ruleset) {
            $ruleset = Invoke-GhApi "repos/$Repository/rulesets/$rulesetId"
        }

        if ($null -ne $ruleset) {
            $ruleset
        }
    }
)

Test-Control `
    ($applicableRulesetIds.Count -gt 0) `
    "One or more active rulesets apply to '$ProtectedBranch'." `
    "No active ruleset applies to '$ProtectedBranch'."

foreach ($requiredRuleType in @('required_linear_history', 'required_signatures', 'deletion', 'non_fast_forward')) {
    Test-Control `
        ($effectiveRuleTypes -contains $requiredRuleType) `
        "Effective '$ProtectedBranch' rules include '$requiredRuleType'." `
        "Effective '$ProtectedBranch' rules are missing '$requiredRuleType'."
}

$statusRules = @(
    $effectiveRules | Where-Object {
        (Get-OptionalProperty $_ 'type') -eq 'required_status_checks'
    }
)
$requiredStatusDefinitions = @(
    foreach ($statusRule in $statusRules) {
        $parameters = Get-OptionalProperty $statusRule 'parameters'
        @(Get-OptionalProperty $parameters 'required_status_checks')
    }
)
$actualChecks = @(
    $requiredStatusDefinitions |
        ForEach-Object { Get-OptionalProperty $_ 'context' } |
        Where-Object { $null -ne $_ }
)
$missingChecks = @($RequiredChecks | Where-Object { $_ -notin $actualChecks })
Test-Control `
    ($missingChecks.Count -eq 0) `
    'All mandatory CI contexts are present in the effective rules.' `
    "Effective rules are missing required contexts: $($missingChecks -join ', ')."

$staleChecks = @($ForbiddenChecks | Where-Object { $_ -in $actualChecks })
Test-Control `
    ($staleChecks.Count -eq 0) `
    'No stale or non-emitting CI context is required.' `
    "Effective rules still require stale/non-emitting contexts: $($staleChecks -join ', ')."

$wrongSourceChecks = @(
    foreach ($requiredCheck in $RequiredChecks) {
        if ($requiredCheck -notin $actualChecks) {
            continue
        }

        if (-not $RequiredCheckAppIds.ContainsKey($requiredCheck)) {
            continue
        }

        $expectedAppId = [long]$RequiredCheckAppIds[$requiredCheck]
        $matchingSource = @(
            $requiredStatusDefinitions | Where-Object {
                (Get-OptionalProperty $_ 'context') -eq $requiredCheck -and
                [long](Get-OptionalProperty $_ 'integration_id') -eq $expectedAppId
            }
        )

        if ($matchingSource.Count -eq 0) {
            "$requiredCheck (expected GitHub App ID $expectedAppId)"
        }
    }
)
$sourceContractFailures = @(
    $missingChecks | ForEach-Object { "$_ (not configured)" }
    $wrongSourceChecks
)
Test-Control `
    ($sourceContractFailures.Count -eq 0) `
    'All mandatory CI contexts are pinned to their expected GitHub Apps.' `
    "Required contexts are absent or have an unexpected source: $($sourceContractFailures -join ', ')."

$strictStatusRules = @(
    $statusRules | Where-Object {
        $parameters = Get-OptionalProperty $_ 'parameters'
        (Get-OptionalProperty $parameters 'strict_required_status_checks_policy') -eq $true
    }
)
Test-Control `
    ($strictStatusRules.Count -gt 0) `
    'Required checks must run against an up-to-date branch.' `
    'Effective status-check rules do not require an up-to-date branch.'

$pullRequestRules = @(
    $effectiveRules | Where-Object {
        (Get-OptionalProperty $_ 'type') -eq 'pull_request'
    }
)
if ($GovernanceMode -eq 'Solo') {
    $soloPullRequestRules = @(
        $pullRequestRules | Where-Object {
            $parameters = Get-OptionalProperty $_ 'parameters'
            $approvalCount = Get-OptionalProperty $parameters 'required_approving_review_count'

            $null -ne $approvalCount -and
            [int]$approvalCount -eq 0 -and
            (Get-OptionalProperty $parameters 'require_code_owner_review') -eq $false -and
            (Get-OptionalProperty $parameters 'require_last_push_approval') -eq $false -and
            (Get-OptionalProperty $parameters 'required_review_thread_resolution') -eq $true
        }
    )
    Test-Control `
        ($soloPullRequestRules.Count -gt 0) `
        'Solo PR policy requires zero approvals, no CODEOWNER or last-push approval, and resolved threads.' `
        'Solo PR policy must require zero approvals, disable CODEOWNER and last-push approval, and require resolved threads.'
}
else {
    $hasApprovalCount = @(
        $pullRequestRules | Where-Object {
            $parameters = Get-OptionalProperty $_ 'parameters'
            [int](Get-OptionalProperty $parameters 'required_approving_review_count') -ge 1
        }
    ).Count -gt 0
    $hasCodeOwnerReview = @(
        $pullRequestRules | Where-Object {
            $parameters = Get-OptionalProperty $_ 'parameters'
            (Get-OptionalProperty $parameters 'require_code_owner_review') -eq $true
        }
    ).Count -gt 0
    $hasLastPushApproval = @(
        $pullRequestRules | Where-Object {
            $parameters = Get-OptionalProperty $_ 'parameters'
            (Get-OptionalProperty $parameters 'require_last_push_approval') -eq $true
        }
    ).Count -gt 0
    $dismissesStaleReviews = @(
        $pullRequestRules | Where-Object {
            $parameters = Get-OptionalProperty $_ 'parameters'
            (Get-OptionalProperty $parameters 'dismiss_stale_reviews_on_push') -eq $true
        }
    ).Count -gt 0
    $requiresResolvedThreads = @(
        $pullRequestRules | Where-Object {
            $parameters = Get-OptionalProperty $_ 'parameters'
            (Get-OptionalProperty $parameters 'required_review_thread_resolution') -eq $true
        }
    ).Count -gt 0
    $reviewPolicyIsStrong = (
        $hasApprovalCount -and
        $hasCodeOwnerReview -and
        $hasLastPushApproval -and
        $dismissesStaleReviews -and
        $requiresResolvedThreads
    )
    Test-Control `
        $reviewPolicyIsStrong `
        'FourEyes PR rules enforce approval, CODEOWNER, last-push, stale-review, and thread controls.' `
        'FourEyes PR review controls are incomplete.'
}

$branchBypassActors = @(
    foreach ($ruleset in $applicableBranchRulesets) {
        @(Get-OptionalProperty $ruleset 'bypass_actors')
    }
)
$repositoryRoleBranchBypasses = @(
    $branchBypassActors | Where-Object {
        (Get-OptionalProperty $_ 'actor_type') -eq 'RepositoryRole'
    }
)
$alwaysBranchRoleBypasses = @(
    $repositoryRoleBranchBypasses | Where-Object {
        (Get-OptionalProperty $_ 'bypass_mode') -eq 'always'
    }
)
$pullRequestBranchRoleBypasses = @(
    $repositoryRoleBranchBypasses | Where-Object {
        (Get-OptionalProperty $_ 'bypass_mode') -eq 'pull_request'
    }
)
Test-Control `
    ($applicableBranchRulesets.Count -gt 0 -and $alwaysBranchRoleBypasses.Count -eq 0) `
    'No applicable branch ruleset grants an always-on RepositoryRole bypass.' `
    'An applicable branch ruleset grants a broad always-on RepositoryRole bypass.'
Test-Control `
    ($applicableBranchRulesets.Count -gt 0 -and $pullRequestBranchRoleBypasses.Count -eq 0) `
    'No applicable branch ruleset grants a pull-request RepositoryRole bypass.' `
    'An applicable branch ruleset grants a broad pull-request RepositoryRole bypass; checks can still be bypassed at merge.'
if ($GovernanceMode -eq 'Solo') {
    Test-Control `
        ($applicableBranchRulesets.Count -gt 0 -and $branchBypassActors.Count -eq 0) `
        'Solo branch rulesets grant no bypass actors.' `
        'Solo branch rulesets must not grant any bypass actor.'
}

$encodedRuleSuiteRef = [Uri]::EscapeDataString("refs/heads/$ProtectedBranch")
$ruleSuites = @()
$ruleSuiteApiFailure = $null
try {
    $ruleSuites = @(
        Invoke-GhApiPaginatedArray `
            "repos/$Repository/rulesets/rule-suites?ref=$encodedRuleSuiteRef"
    )
}
catch {
    $ruleSuiteApiFailure = [string]$_.Exception.Message
}

Test-Control `
    ($null -eq $ruleSuiteApiFailure) `
    "Paginated rule-suite history for refs/heads/$ProtectedBranch is readable." `
    "Unable to read paginated rule-suite history for refs/heads/${ProtectedBranch}: $ruleSuiteApiFailure"

if ($null -ne $ruleSuiteApiFailure) {
    Test-Control `
        $false `
        "No ruleset bypass occurred in the last $BypassLookbackDays day(s)." `
        "Recent ruleset bypass history is indeterminate because the rule-suite API failed."
}
else {
    $invalidRuleSuiteTimestamps = [System.Collections.Generic.List[string]]::new()
    $recentBypassRuleSuites = [System.Collections.Generic.List[string]]::new()
    $ruleSuiteCutoff = [DateTimeOffset]::UtcNow.AddDays(-$BypassLookbackDays)

    foreach ($ruleSuite in $ruleSuites) {
        $ruleSuiteId = Get-OptionalProperty $ruleSuite 'id'
        $ruleSuiteIdText = if ($null -eq $ruleSuiteId) { 'unknown' } else { [string]$ruleSuiteId }
        $pushedAtValue = Get-OptionalProperty $ruleSuite 'pushed_at'
        $pushedAtText = [string]$pushedAtValue
        $parsedPushedAt = [DateTimeOffset]::MinValue
        $timestampIsValid = (
            -not [string]::IsNullOrWhiteSpace($pushedAtText) -and
            [DateTimeOffset]::TryParse(
                $pushedAtText,
                [System.Globalization.CultureInfo]::InvariantCulture,
                [System.Globalization.DateTimeStyles]::AssumeUniversal -bor
                    [System.Globalization.DateTimeStyles]::AdjustToUniversal,
                [ref]$parsedPushedAt
            )
        )

        if (-not $timestampIsValid) {
            $invalidRuleSuiteTimestamps.Add("id=$ruleSuiteIdText")
            continue
        }

        if ($parsedPushedAt -ge $ruleSuiteCutoff -and
            (Get-OptionalProperty $ruleSuite 'result') -eq 'bypass') {
            $actorName = Get-OptionalProperty $ruleSuite 'actor_name'
            if ([string]::IsNullOrWhiteSpace([string]$actorName)) {
                $actorName = 'unknown'
            }
            $pushedAtIso = $parsedPushedAt.ToUniversalTime().ToString('o')
            $recentBypassRuleSuites.Add(
                "id=$ruleSuiteIdText, actor=$actorName, pushed_at=$pushedAtIso"
            )
        }
    }

    Test-Control `
        ($invalidRuleSuiteTimestamps.Count -eq 0) `
        'Every rule-suite record has a valid pushed_at timestamp.' `
        "Rule-suite records have missing or malformed pushed_at timestamps: $($invalidRuleSuiteTimestamps -join ', ')."

    $recentBypassFailure = if ($invalidRuleSuiteTimestamps.Count -gt 0) {
        'Recent ruleset bypass history is indeterminate because one or more pushed_at timestamps are invalid.'
    }
    else {
        "Ruleset bypass occurred in the last $BypassLookbackDays day(s): $($recentBypassRuleSuites -join '; ')."
    }
    Test-Control `
        ($invalidRuleSuiteTimestamps.Count -eq 0 -and $recentBypassRuleSuites.Count -eq 0) `
        "No ruleset bypass occurred in the last $BypassLookbackDays day(s)." `
        $recentBypassFailure
}

$codeScanningTools = @(
    $effectiveRules |
        Where-Object { (Get-OptionalProperty $_ 'type') -eq 'code_scanning' } |
        ForEach-Object {
            $parameters = Get-OptionalProperty $_ 'parameters'
            @(Get-OptionalProperty $parameters 'code_scanning_tools')
        }
)
$codeQlGate = @(
    $codeScanningTools | Where-Object {
        (Get-OptionalProperty $_ 'tool') -eq 'CodeQL' -and
        (Get-OptionalProperty $_ 'security_alerts_threshold') -in @('high_or_higher', 'medium_or_higher', 'all') -and
        (Get-OptionalProperty $_ 'alerts_threshold') -eq 'errors'
    }
)
Test-Control `
    ($codeQlGate.Count -gt 0) `
    'CodeQL merge protection blocks High/Critical findings and analysis errors.' `
    'Effective rules lack a CodeQL High/Critical code-scanning merge gate.'

$tagRulesets = @(
    $rulesets | Where-Object {
        $conditions = Get-OptionalProperty $_ 'conditions'
        $refName = Get-OptionalProperty $conditions 'ref_name'
        $includes = @(Get-OptionalProperty $refName 'include')
        $excludes = @(Get-OptionalProperty $refName 'exclude')

        (Get-OptionalProperty $_ 'target') -eq 'tag' -and
        (Get-OptionalProperty $_ 'enforcement') -eq 'active' -and
        $includes.Count -eq 1 -and
        $includes -contains 'refs/tags/v*' -and
        $excludes.Count -eq 0
    }
)
Test-Control `
    ($tagRulesets.Count -gt 0) `
    'An active ruleset explicitly targets refs/tags/v*.' `
    'No active tag ruleset explicitly targets refs/tags/v*.'

$tagRuleTypes = @(
    foreach ($ruleset in $tagRulesets) {
        @(Get-OptionalProperty $ruleset 'rules') |
            ForEach-Object { Get-OptionalProperty $_ 'type' }
    }
)
$requiredTagRuleTypes = if ($GovernanceMode -eq 'Solo') {
    @('update', 'deletion')
}
else {
    @('creation', 'update', 'deletion')
}
foreach ($requiredTagRuleType in $requiredTagRuleTypes) {
    Test-Control `
        ($tagRuleTypes -contains $requiredTagRuleType) `
        "Version-tag rules include '$requiredTagRuleType' protection." `
        "Version-tag rules are missing '$requiredTagRuleType' protection."
}

$tagBypassActors = @(
    foreach ($ruleset in $tagRulesets) {
        @(Get-OptionalProperty $ruleset 'bypass_actors')
    }
)
if ($GovernanceMode -eq 'Solo') {
    Test-Control `
        ($tagRulesets.Count -gt 0 -and $tagRuleTypes -notcontains 'creation') `
        'Solo version-tag rules allow creation so release tags can trigger the workflow.' `
        "Solo version-tag rules must not include 'creation'; without a bypass authority, that rule blocks all release tags."
    Test-Control `
        ($tagRulesets.Count -gt 0 -and $tagBypassActors.Count -eq 0) `
        'Solo version-tag rulesets grant no bypass actors.' `
        'Solo version-tag rulesets must not grant any bypass actor.'
}
else {
    $broadTagBypasses = @(
        $tagBypassActors | Where-Object {
            (Get-OptionalProperty $_ 'actor_type') -eq 'RepositoryRole' -and
            (Get-OptionalProperty $_ 'bypass_mode') -eq 'always'
        }
    )
    Test-Control `
        ($tagRulesets.Count -gt 0 -and $broadTagBypasses.Count -eq 0) `
        'No version-tag ruleset grants an always-on RepositoryRole bypass.' `
        'No compliant version-tag ruleset exists, or one grants a broad always-on RepositoryRole bypass.'
}

$encodedEnvironment = [Uri]::EscapeDataString($ReleaseEnvironment)
$environment = Invoke-GhApi "repos/$Repository/environments/$encodedEnvironment" -AllowNotFound
Test-Control `
    ($null -ne $environment) `
    "Release environment '$ReleaseEnvironment' exists." `
    "Release environment '$ReleaseEnvironment' does not exist."

if ($null -ne $environment) {
    $protectionRules = @(Get-OptionalProperty $environment 'protection_rules')
    $reviewerRules = @(
        $protectionRules | Where-Object {
            (Get-OptionalProperty $_ 'type') -eq 'required_reviewers'
        }
    )
    if ($GovernanceMode -eq 'Solo') {
        $waitTimerRules = @(
            $protectionRules | Where-Object {
                (Get-OptionalProperty $_ 'type') -eq 'wait_timer'
            }
        )
        $insufficientWaitTimerRules = @(
            $waitTimerRules | Where-Object {
                [int](Get-OptionalProperty $_ 'wait_timer') -lt 15
            }
        )
        Test-Control `
            ($waitTimerRules.Count -gt 0 -and $insufficientWaitTimerRules.Count -eq 0) `
            'Solo release environment enforces a wait timer of at least 15 minutes.' `
            'Solo release environment must enforce a wait timer of at least 15 minutes.'
        Test-Control `
            ($reviewerRules.Count -eq 0) `
            'Solo release environment has no impossible required-reviewer gate.' `
            'Solo release environment must not configure required reviewers.'
    }
    else {
        $reviewers = @(
            foreach ($reviewerRule in $reviewerRules) {
                @(Get-OptionalProperty $reviewerRule 'reviewers')
            }
        )
        $repositoryOwner = Get-OptionalProperty (Get-OptionalProperty $repositoryDetails 'owner') 'login'
        if ([string]::IsNullOrWhiteSpace([string]$repositoryOwner)) {
            $repositoryOwner = $Repository.Split('/', 2)[0]
        }
        $independentReviewers = @(
            foreach ($reviewerEntry in $reviewers) {
                $reviewerType = Get-OptionalProperty $reviewerEntry 'type'
                $reviewer = Get-OptionalProperty $reviewerEntry 'reviewer'

                if ($null -eq $reviewer) {
                    continue
                }

                if ($reviewerType -eq 'Team') {
                    $reviewerEntry
                    continue
                }

                $reviewerLogin = Get-OptionalProperty $reviewer 'login'
                if ($reviewerType -eq 'User' -and
                    -not [string]::IsNullOrWhiteSpace([string]$reviewerLogin) -and
                    $reviewerLogin -ne $repositoryOwner) {
                    $reviewerEntry
                }
            }
        )
        Test-Control `
            ($independentReviewers.Count -gt 0) `
            'FourEyes release environment requires a team or a user other than the repository owner.' `
            'FourEyes release environment has no independent required reviewer.'

        $selfReviewDisabled = (
            $reviewerRules.Count -gt 0 -and
            @(
                $reviewerRules | Where-Object {
                    (Get-OptionalProperty $_ 'prevent_self_review') -ne $true
                }
            ).Count -eq 0
        )
        Test-Control `
            $selfReviewDisabled `
            'FourEyes release environment prevents self-review.' `
            'FourEyes release environment does not prevent self-review.'
    }

    $branchPolicy = Get-OptionalProperty $environment 'deployment_branch_policy'
    Test-Control `
        ($null -ne $branchPolicy -and
            (Get-OptionalProperty $branchPolicy 'custom_branch_policies') -eq $true -and
            (Get-OptionalProperty $branchPolicy 'protected_branches') -eq $false) `
        'Release environment uses custom ref policies.' `
        'Release environment does not use a custom version-tag deployment policy.'

    $deploymentPolicies = Invoke-GhApi "repos/$Repository/environments/$encodedEnvironment/deployment-branch-policies?per_page=100" -AllowNotFound
    $branchPolicies = @(Get-OptionalProperty $deploymentPolicies 'branch_policies')
    $versionPolicies = @(
        $branchPolicies | Where-Object {
            (Get-OptionalProperty $_ 'name') -eq 'v*' -and
            (Get-OptionalProperty $_ 'type') -eq 'tag'
        }
    )
    $unexpectedPolicies = @(
        $branchPolicies | Where-Object {
            (Get-OptionalProperty $_ 'name') -ne 'v*' -or
            (Get-OptionalProperty $_ 'type') -ne 'tag'
        }
    )
    Test-Control `
        ($versionPolicies.Count -gt 0 -and $unexpectedPolicies.Count -eq 0) `
        'Release environment allows only the exact v* tag policy.' `
        'Release environment must contain only the exact v* tag policy.'
}

if ($failures.Count -gt 0) {
    Write-Host "`nGitHub security baseline FAILED with $($failures.Count) control gap(s)." -ForegroundColor Red
    exit 1
}

Write-Host "`nGitHub security baseline PASSED." -ForegroundColor Green

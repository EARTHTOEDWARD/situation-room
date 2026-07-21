$ErrorActionPreference = "Stop"

$Owner = "EARTHTOEDWARD"
$Repo = "situation-room"
$FullRepo = "$Owner/$Repo"
$LiveUrl = "https://earthtoedward.github.io/$Repo/"
$Description = "Multiplayer crisis-bargaining game about hidden stakes, internal factions, proxies, backchannels, bluff fatigue, and escalation ratchets."

Set-Location $PSScriptRoot

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Git is required. Install Git, then run this script again." }
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw "GitHub CLI is required. Install it from https://cli.github.com/ and run this script again." }

gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "GitHub CLI is not signed in. Opening GitHub authentication..."
    gh auth login --web
    if ($LASTEXITCODE -ne 0) { throw "GitHub authentication did not complete." }
}

$AuthUser = (gh api user --jq .login).Trim()
if ($AuthUser.ToLowerInvariant() -ne $Owner.ToLowerInvariant()) { throw "Authenticated as '$AuthUser', but this release targets '$Owner'." }

if (-not (Test-Path .git)) { git init }
git branch -M main
if (-not (git config user.name)) { git config user.name $Owner }
if (-not (git config user.email)) { git config user.email "190121868+$Owner@users.noreply.github.com" }

git add -A
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) { git commit -m "Launch Situation Room public alpha" }

gh repo view $FullRepo *> $null
if ($LASTEXITCODE -eq 0) {
    $Visibility = (gh repo view $FullRepo --json visibility --jq .visibility).Trim()
    if ($Visibility -ne "PUBLIC") { throw "$FullRepo exists but is not public." }
    git remote get-url origin *> $null
    if ($LASTEXITCODE -eq 0) { git remote set-url origin "https://github.com/$FullRepo.git" }
    else { git remote add origin "https://github.com/$FullRepo.git" }
    git push -u origin main
} else {
    gh repo create $FullRepo --public --description $Description --source=. --remote=origin --push
}

gh api --method PATCH "repos/$FullRepo" -f homepage=$LiveUrl | Out-Null

gh api "repos/$FullRepo/pages" *> $null
if ($LASTEXITCODE -eq 0) { gh api --method PUT "repos/$FullRepo/pages" -f build_type=workflow | Out-Null }
else { gh api --method POST "repos/$FullRepo/pages" -f build_type=workflow | Out-Null }

$WorkflowStarted = $false
for ($Attempt = 1; $Attempt -le 5; $Attempt++) {
    gh workflow run pages.yml --repo $FullRepo *> $null
    if ($LASTEXITCODE -eq 0) { $WorkflowStarted = $true; break }
    Start-Sleep -Seconds 3
}
if ($WorkflowStarted) {
    $RunId = ""
    for ($Attempt = 1; $Attempt -le 12; $Attempt++) {
        $RunId = (gh run list --repo $FullRepo --workflow pages.yml --limit 1 --json databaseId --jq '.[0].databaseId // empty').Trim()
        if ($RunId) { break }
        Start-Sleep -Seconds 2
    }
    if ($RunId) { gh run watch $RunId --repo $FullRepo --exit-status }
}

Write-Host ""
Write-Host "Published repository: https://github.com/$FullRepo"
Write-Host "Game launch link:    $LiveUrl"

#!/usr/bin/env bash
set -euo pipefail

OWNER="EARTHTOEDWARD"
REPO="situation-room"
FULL_REPO="$OWNER/$REPO"
LIVE_URL="https://earthtoedward.github.io/$REPO/"
DESCRIPTION="Multiplayer crisis-bargaining game about hidden stakes, internal factions, proxies, backchannels, bluff fatigue, and escalation ratchets."

cd "$(dirname "$0")"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    return 1
  }
}

need git || { echo "Install Git, then run this script again." >&2; exit 1; }
need gh || { echo "Install GitHub CLI from https://cli.github.com/ and run this script again." >&2; exit 1; }

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not signed in. Opening GitHub authentication..."
  gh auth login --web
fi

AUTH_USER="$(gh api user --jq .login)"
AUTH_USER_LC="$(printf %s "$AUTH_USER" | tr '[:upper:]' '[:lower:]')"
OWNER_LC="$(printf %s "$OWNER" | tr '[:upper:]' '[:lower:]')"
if [[ "$AUTH_USER_LC" != "$OWNER_LC" ]]; then
  echo "Authenticated as '$AUTH_USER', but this release targets '$OWNER'." >&2
  echo "Run 'gh auth switch --user $OWNER' and retry." >&2
  exit 1
fi

if [[ ! -d .git ]]; then git init; fi
git branch -M main
if ! git config user.name >/dev/null 2>&1; then git config user.name "$OWNER"; fi
if ! git config user.email >/dev/null 2>&1; then git config user.email "190121868+${OWNER}@users.noreply.github.com"; fi

git add -A
if ! git diff --cached --quiet; then
  git commit -m "Launch Situation Room public alpha"
fi

if gh repo view "$FULL_REPO" >/dev/null 2>&1; then
  VISIBILITY="$(gh repo view "$FULL_REPO" --json visibility --jq .visibility)"
  [[ "$VISIBILITY" == "PUBLIC" ]] || { echo "$FULL_REPO exists but is not public." >&2; exit 1; }
  if git remote get-url origin >/dev/null 2>&1; then
    git remote set-url origin "https://github.com/$FULL_REPO.git"
  else
    git remote add origin "https://github.com/$FULL_REPO.git"
  fi
  git push -u origin main
else
  gh repo create "$FULL_REPO" --public --description "$DESCRIPTION" --source=. --remote=origin --push
fi

gh api --method PATCH "repos/$FULL_REPO" -f homepage="$LIVE_URL" >/dev/null

if gh api "repos/$FULL_REPO/pages" >/dev/null 2>&1; then
  gh api --method PUT "repos/$FULL_REPO/pages" -f build_type=workflow >/dev/null
else
  gh api --method POST "repos/$FULL_REPO/pages" -f build_type=workflow >/dev/null
fi

WORKFLOW_STARTED=false
for attempt in 1 2 3 4 5; do
  if gh workflow run pages.yml --repo "$FULL_REPO" >/dev/null 2>&1; then
    WORKFLOW_STARTED=true
    break
  fi
  sleep 3
done

if [[ "$WORKFLOW_STARTED" == true ]]; then
  RUN_ID=""
  for attempt in {1..12}; do
    RUN_ID="$(gh run list --repo "$FULL_REPO" --workflow pages.yml --limit 1 --json databaseId --jq '.[0].databaseId // empty')"
    [[ -n "$RUN_ID" ]] && break
    sleep 2
  done
  [[ -z "$RUN_ID" ]] || gh run watch "$RUN_ID" --repo "$FULL_REPO" --exit-status
else
  echo "Warning: repository published, but the Pages workflow did not start automatically." >&2
fi

echo
echo "Published repository: https://github.com/$FULL_REPO"
echo "Game launch link:    $LIVE_URL"

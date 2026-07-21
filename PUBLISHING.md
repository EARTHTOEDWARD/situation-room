# Publish Situation Room to GitHub Pages

The release targets the public repository:

```text
EARTHTOEDWARD/situation-room
```

The public launch route is:

```text
https://earthtoedward.github.io/situation-room/
```

## Easiest route

From the extracted release folder:

- **macOS:** double-click `publish_github.command`
- **macOS/Linux terminal:** run `./publish_github.sh`
- **Windows PowerShell:** run `./publish_github.ps1`

The launcher verifies the authenticated account, creates or updates the public repository, pushes `main`, sets the repository homepage, enables GitHub Pages, starts the deployment workflow, and prints the final links. Git and GitHub CLI are required.

## Manual GitHub CLI route

```bash
gh auth login
git init
git add .
git commit -m "Launch Situation Room public alpha"
gh repo create EARTHTOEDWARD/situation-room --public --source=. --remote=origin --push
gh api --method POST repos/EARTHTOEDWARD/situation-room/pages -f build_type=workflow
gh workflow run pages.yml --repo EARTHTOEDWARD/situation-room
```

The included `.github/workflows/pages.yml` deploys the repository root.

## Public routes

```text
/                         Situation Room landing page
/the-burr/                Multiplayer prototype
/training/                Solo Gulf 2026 training game
```

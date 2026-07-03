# Git branching strategy

This repository uses a lightweight Git Flow model.

## Branches

| Branch | Purpose | Deploy target |
|--------|---------|---------------|
| `main` | Production-ready code. Matches what runs on **hco-study.com**. | Production VPS |
| `develop` | Integration branch for v2 work (blockchain, admin, reporting, frontend). | Dev/staging (when available) |
| `feature/*` | One branch per feature. Merge into `develop` via PR. | Local / dev only |
| `hotfix/*` | Urgent production fixes. Merge into `main`, then back into `develop`. | Production VPS |

## Current releases

| Tag | Commit role |
|-----|-------------|
| `v1.0.0-study` | Frozen study platform before participation API work. |
| `v1.0.1` | **Live production** — pilot study on hco-study.com (session fix, flags, pilot-ready). |

## Workflow

### Start a new feature

```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-feature
# work, commit, push
git push -u origin feature/my-feature
# open PR: feature/my-feature → develop
```

### Ship a production hotfix (during pilot)

```bash
git checkout main
git pull origin main
git checkout -b hotfix/short-description
# fix, commit, push
# PR: hotfix/* → main
# deploy main on production VPS
# merge main into develop (or cherry-pick the fix)
git tag -a v1.0.x -m "Describe the hotfix"
git push origin v1.0.x
```

### Release v2 to production

When `develop` is stable:

```bash
# PR: develop → main
git checkout main && git pull
git tag -a v2.0.0 -m "Release notes"
git push origin v2.0.0
# deploy main on production VPS
```

## Planned feature branches (v2)

Create these from `develop` when work starts:

- `feature/blockchain-layer` — attestation / on-chain layer
- `feature/admin-panel` — admin UI and auth
- `feature/reporting-analytics` — exports, stats, dashboards
- `feature/frontend-v2` — UI redesign
- `feature/participation-api-v1` — verification API (rebase on `develop` before continuing)

## Production deploy (VPS)

Production always tracks **`main`**:

```bash
cd ~/HCO
git fetch origin
git checkout main
git pull origin main
docker compose up --build -d
```

## Dev / staging deploy (future)

When a dev server exists, deploy **`develop`** there with a **separate database volume** — never share pilot data with experiments.

## Commit message prefixes

- `feat:` new feature
- `fix:` bug fix
- `chore:` tooling, docker, deps
- `docs:` documentation only
- `refactor:` code change without behavior change

## Rules

1. Do not build large features directly on `main`.
2. Keep pilot/production on `main` stable while collecting human data.
3. One feature per branch; merge through PR when possible.
4. Tag production deploys on `main`.
5. Never force-push `main`.

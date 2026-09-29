# GIT_WORKFLOW.md — Git Workflow for SDMS

> Applies to **every contributor and every AI assistant**. Model: **Git Flow (simplified)**, one `main`, one `develop`, short-lived feature branches.

## 1. Branch Model

```
main        ●───────────────●───────────────●──────  (stable, tagged releases only)
             \             / \             /
develop       ●──●──●──●──●   ●──●──●──●──●          (integration)
               \  /  \  /
feature/*       ●●    ●●                              (short-lived)
```

| Branch | Purpose | Created from | Merges into | Protected |
|---|---|---|---|---|
| `main` | Stable, demo-ready. Only release merges. | — | — | Yes |
| `develop` | Integration of finished features | `main` | `main` (at phase release) | Yes |
| `feature/phase-N-<name>` | New functionality for a phase | `develop` | `develop` | No |
| `fix/<name>` | Bug fix | `develop` | `develop` | No |
| `hotfix/<name>` | Urgent fix to production or demo | `main` | `main` **and** `develop` | No |
| `chore/<name>` | Tooling, deps, config | `develop` | `develop` | No |
| `docs/<name>` | Documentation only | `develop` | `develop` | No |

### Branch naming
- Lowercase, hyphen-separated, short and descriptive.
- Examples: `feature/phase-1-totp-mfa`, `feature/phase-4-minio-upload`, `fix/ledger-sequence-gap`, `chore/update-prisma`, `docs/update-architecture`.

---

## 2. Branch Protection (set up in Phase 0)

For `main` and `develop`:
- [x] Require a pull request before merging
- [x] Require at least **1 approving review** (a human, never the AI that wrote the code)
- [x] Require status checks to pass (lint, type-check, test, build)
- [x] Require branches to be up to date before merging
- [x] Disallow force pushes and deletion
- [x] Require linear history (squash or rebase merge)

---

## 3. Daily Workflow (step by step)

```bash
# 1. Sync
git checkout develop
git pull origin develop

# 2. Create a branch for your task
git checkout -b feature/phase-1-totp-mfa

# 3. Work, and commit small and often
git add <specific files>          # avoid `git add .` unless you've checked git status
git commit -m "feat(auth): add TOTP enrollment endpoint"

# 4. Keep up to date with develop (rebase preferred)
git fetch origin
git rebase origin/develop

# 5. Push
git push -u origin feature/phase-1-totp-mfa

# 6. Open a Pull Request into `develop` (fill in the template)
# 7. Address review comments with new commits
# 8. After approval and green CI: Squash and merge
# 9. Delete the branch, then update your local copy
git checkout develop && git pull origin develop
git branch -d feature/phase-1-totp-mfa
```

---

## 4. Commit Message Convention (Conventional Commits)

```
<type>(<scope>): <short summary in imperative mood>

[optional body: what and why]

[optional footer: BREAKING CHANGE, Closes #12]
```

| Type | Use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code change, no feature or fix |
| `perf` | Performance improvement |
| `test` | Add or fix tests |
| `build` | Build system or dependencies |
| `ci` | CI configuration |
| `chore` | Other maintenance |
| `security` | Security hardening or fix |

**Scopes:** `auth`, `users`, `cases`, `documents`, `search`, `sharing`, `audit`, `export`, `storage`, `web`, `api`, `infra`, `db`, `docs`.

### Good vs bad
| Bad | Good |
|---|---|
| `update` | `feat(cases): add case member assignment` |
| `fixed bug` | `fix(audit): prevent gap in ledger sequence` |
| `wip` | `test(auth): cover lockout after 5 failed logins` |

Rules: summary ≤ 72 chars, no trailing period, one logical change per commit. Enforced by **commitlint** plus **Husky**.

---

## 5. Pull Request Rules

Use `.github/pull_request_template.md`:

```markdown
## What
<!-- Short description of the change -->

## Why
<!-- Phase / requirement ID (e.g. Phase 4, DOC-3) -->

## How to test
<!-- Steps or commands -->

## Checklist
- [ ] Branch follows naming convention
- [ ] Conventional commits used
- [ ] Lint, type-check, and tests pass locally
- [ ] Security rules from Rules.md checked (authz, validation, audit ledger)
- [ ] No secrets or real data committed
- [ ] New dependencies justified (if any)
- [ ] Docs updated (if behavior/structure changed)
- [ ] Memory.md updated

## Screenshots (UI changes)
```

- PR title follows the commit format: `feat(auth): add TOTP MFA`.
- Keep PRs small (aim for under 400 changed lines).
- The author does not approve their own PR.
- **Security-sensitive areas** (auth, audit, crypto, export, policy) require review from a designated code owner (see `CODEOWNERS`).

### CODEOWNERS example
```
/apps/api/src/modules/auth/      @security-lead
/apps/api/src/modules/audit/     @security-lead
/apps/api/src/modules/export/    @security-lead
/apps/api/src/common/            @tech-lead
/infra/                          @devops-lead
```

---

## 6. Releases and Tags

At the end of each phase (see `Phases.md`):

```bash
# On develop, when all exit criteria are met
git checkout main
git pull origin main
git merge --no-ff develop -m "release: phase 1 auth, MFA and RBAC"
git tag -a v0.2.0 -m "Phase 1 complete"
git push origin main --tags

# Sync back
git checkout develop
git merge main
git push origin develop
```

**Versioning:** Semantic Versioning `MAJOR.MINOR.PATCH`.
Phase releases `v0.1.0 … v0.9.0`, final `v1.0.0`.

### Hotfix
```bash
git checkout main && git pull
git checkout -b hotfix/fix-login-lockout
# fix, commit, PR into main
# after merge: tag patch version (e.g. v0.2.1), then merge main into develop
```

---

## 7. Git Hooks (Husky)

| Hook | Action |
|---|---|
| `pre-commit` | `lint-staged` (ESLint plus Prettier on staged files), **secret scan** (gitleaks) |
| `commit-msg` | commitlint (Conventional Commits) |
| `pre-push` | Type-check plus unit tests |

---

## 8. .gitignore Essentials

```
node_modules/
dist/
.next/
coverage/
.env
.env.*
!.env.example
*.pem
*.key
*.p12
uploads/
tmp/
*.log
.DS_Store
.idea/
.vscode/*
!.vscode/settings.json
docker-volumes/
```

---

## 9. What Must NEVER Be Committed

- `.env` files, API keys, JWT secrets, database passwords
- Private signing keys (Ed25519/RSA) or MinIO credentials
- Real documents, real case data, or personal data (use fake fixtures)
- Database dumps and backups
- Large binaries and build artifacts

**If a secret is committed by mistake:** rotate the secret immediately, then clean history (`git filter-repo`), then force-push **only with team-lead approval**. Removing it in a later commit is **not** enough.

---

## 10. AI Assistant Git Rules

When an AI assistant works on this repo it must:
1. Check the current branch first (`git status`, `git branch`). **Never work on `main` or `develop`.**
2. Create or use the correct `feature/…` branch for the current phase.
3. Make small, atomic commits with Conventional Commit messages.
4. Never `git push --force` on shared branches.
5. Never merge its own PR or bypass hooks (`--no-verify` is forbidden).
6. Show the commit list and the summary of changes at the end of the task.
7. Update `Memory.md` in the same PR.

---

## 11. Quick Reference

| Task | Command |
|---|---|
| See status | `git status -sb` |
| New branch | `git checkout -b feature/phase-N-name` |
| Stage part of a file | `git add -p` |
| Amend last commit (not pushed) | `git commit --amend` |
| Undo last commit, keep changes | `git reset --soft HEAD~1` |
| Discard local changes to a file | `git restore <file>` |
| Stash work | `git stash push -m "msg"` |
| Rebase onto develop | `git fetch && git rebase origin/develop` |
| Show pretty log | `git log --oneline --graph --decorate -20` |
| Delete merged branch | `git branch -d <branch>` |

---

## 12. First-Time Repo Setup (Phase 0)

```bash
git init -b main
git add docs/ README.md .gitignore
git commit -m "chore: initial commit with project docs"
git remote add origin <repo-url>
git push -u origin main

git checkout -b develop
git push -u origin develop

git checkout -b feature/phase-0-setup
```
Then enable branch protection on `main` and `develop` in the GitHub settings.

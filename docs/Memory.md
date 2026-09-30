# Memory.md — Project Memory and Progress Log

> **Purpose:** AI assistants have no memory between sessions. This file is the shared memory.
> **Start of every session:** read this file first.
> **End of every task:** update it (status, decisions, next steps) and commit it with the work.

---

## 1. Project Snapshot

| Field          | Value                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------- |
| Project        | SDMS — Secure Digital Document Management System for Legal and Investigation Documents             |
| Event          | Smart India Hackathon 2026 (PS ID 26190)                                                           |
| Team           | THE DEPLOYABLES                                                                                    |
| Theme          | Blockchain & Cybersecurity (Software)                                                              |
| Repo           | _TODO: add URL_                                                                                    |
| Default branch | `main` (stable), `develop` (integration)                                                           |
| Stack          | Next.js + TS + Tailwind · NestJS + Prisma · PostgreSQL · MinIO · Redis/BullMQ · Tesseract · ClamAV |
| Docs           | `PRD.md`, `Architecture.md`, `Rules.md`, `Phases.md`, `Design.md`, `GIT_WORKFLOW.md`               |

**One-liner:** Case-centric secure platform with RBAC+ABAC, SHA-256 integrity, hash-chained audit ledger, OCR search, controlled sharing, and signed verifiable exports. It complements CCTNS/ICJS and does not replace them.

---

## 2. Current Status

| Item                    | Value                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| **Current phase**       | Phase 1 — Authentication, MFA, and RBAC (Completed, ready for Phase 2)                           |
| **Current branch**      | `feature/phase-1-auth-rbac`                                                                      |
| **Last completed task** | Complete Phase 1 implementation (auth, TOTP MFA, RBAC guards, user admin, tests, UI, migrations) |
| **In progress**         | Commit Phase 1, merge to develop, initiate Phase 2 (Audit Ledger)                                |
| **Blocked by**          | _nothing_                                                                                        |
| **Last updated**        | 2026-09-30 by Antigravity                                                                        |

---

## 3. Phase Tracker

| Phase | Name                         | Status         | Branch                      | Tag      | Completed  |
| ----- | ---------------------------- | -------------- | --------------------------- | -------- | ---------- |
| 0     | Setup and Foundation         | ✅ Done        | `feature/phase-0-setup`     | `v0.1.0` | 2026-09-30 |
| 1     | Auth, MFA, RBAC              | ✅ Done        | `feature/phase-1-auth-rbac` | `v0.2.0` | 2026-09-30 |
| 2     | Audit Ledger                 | ⬜ Not started |                             |          |            |
| 3     | Cases and ABAC               | ⬜ Not started |                             |          |            |
| 4     | Upload and Versioning        | ⬜ Not started |                             |          |            |
| 5     | OCR, Classification, Search  | ⬜ Not started |                             |          |            |
| 6     | Sharing and Watermarking     | ⬜ Not started |                             |          |            |
| 7     | Signed Exports and Verifier  | ⬜ Not started |                             |          |            |
| 8     | Dashboards, Audit UI, Polish | ⬜ Not started |                             |          |            |
| 9     | Hardening and Demo           | ⬜ Not started |                             |          |            |

Legend: ⬜ Not started · 🟨 In progress · ✅ Done · ⛔ Blocked

---

## 4. Key Decisions (Decision Log)

| #   | Date       | Decision                                    | Reason                                                          | Alternatives                              |
| --- | ---------- | ------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------- |
| D1  | _2026_     | Modular monolith (NestJS)                   | Simple pilot deployment, clear boundaries                       | Microservices (too heavy for unit-level)  |
| D2  | _2026_     | "Blockchain" = internal hash-chained ledger | Tamper-evidence without a public chain                          | Public blockchain (out of scope)          |
| D3  | _2026_     | PostgreSQL FTS for search initially         | Fewer moving parts                                              | OpenSearch/Meilisearch later              |
| D4  | _2026_     | Rule-based classification first             | Limited labeled data                                            | ML models later via a pluggable interface |
| D5  | _2026_     | Redis + BullMQ for jobs _(assumption)_      | Mature and simple                                               | RabbitMQ                                  |
| D6  | _2026_     | ClamAV for malware scan _(assumption)_      | Open source, self-hosted                                        | Commercial AV                             |
| D7  | _2026_     | Ed25519 for export signing _(assumption)_   | Small, fast, modern                                             | RSA-PSS                                   |
| D8  | 2026-09-30 | MinIO API mapped to host port 9002          | Avoid conflict with existing local services on 9000 (Portainer) | Stop existing service                     |

> Add new decisions at the bottom. Never delete old ones. Mark superseded ones instead.

---

## 5. Open Questions

| #   | Question                                                                          | Owner | Status |
| --- | --------------------------------------------------------------------------------- | ----- | ------ |
| Q1  | Final color palette or branding approved by the team?                             | Team  | Open   |
| Q2  | Exact evidence certificate wording (BSA 2023 §61–63) reviewed by a legal advisor? | Team  | Open   |
| Q3  | Maximum file size and allowed file types?                                         | Team  | Open   |
| Q4  | Retention period rules per case type?                                             | Team  | Open   |
| Q5  | Team ID (blank in the deck)                                                       | Team  | Open   |

---

## 6. Conventions Cheat-Sheet

- Branches: `feature/phase-N-name`, `fix/…`, `chore/…`, `docs/…`
- Commits: Conventional Commits, e.g. `feat(documents): add SHA-256 on upload`
- API base: `/api/v1`
- Ledger writes: only through `AuditService.record()`
- Files are never overwritten; a new version is created
- Secrets: env only, and `.env` is never committed
- Design tokens: see `Design.md`

---

## 7. Known Issues and Tech Debt

| #   | Issue      | Severity | Phase to fix |
| --- | ---------- | -------- | ------------ |
| —   | _none yet_ |          |              |

---

## 8. Session Log (newest first)

> Template: copy the block below for every session or task.

```
### YYYY-MM-DD — <short title>
- Phase / Branch:
- Done:
- Files touched:
- Decisions:
- Tests: pass/fail
- Next steps:
- Notes for next session:
```

### 2026-09-30 — Phase 1 Authentication, MFA, and RBAC Implementation

- Phase / Branch: Phase 1 / `feature/phase-1-auth-rbac`
- Done:
  - Implemented Argon2id password hashing and strict policy validation (`password.util.ts`)
  - Built JWT auth strategy, access/refresh token rotation, httpOnly cookie support, and 5-attempt rate-limiting lockout (`AuthService`, `AuthController`)
  - Added TOTP MFA enrollment with QR code generation (`otplib`, `qrcode`) and verification endpoints
  - Developed `RolesGuard`, `@Roles()`, `RequireReauthGuard`, and `@RequireReauth()` decorators across all 6 system roles
  - Added user management endpoints (admin CRUD, user status toggle, department assignment) and departments query endpoint
  - Created Prisma database migration `20260930130125_init` and populated demo departments and 6 role-based users in `seed.ts`
  - Built Next.js web interface: `AuthContext` with cookie/token management, `/login` page with role previews, `/mfa` TOTP setup, `/users` administration table with role filtering, and dynamic role-aware navigation
  - Added comprehensive test suites: 33 unit tests and 10 e2e tests passing
- Files touched: `apps/api/*`, `apps/web/*`, `packages/*`, `docs/Phases.md`, `docs/Memory.md`
- Decisions: Retained strict Argon2id parameters (64MB memory cost, 3 iterations) and TOTP standards; locked out accounts after 5 failed attempts for 15 minutes.
- Tests: Unit tests (33/33 pass), e2e tests (10/10 pass), monorepo build and lint pass
- Next steps: Merge `feature/phase-1-auth-rbac` into `develop`, tag `v0.2.0`, and start Phase 2 (Append-only hash-chained Audit Ledger).
- Notes for next session: Phase 2 will implement `AuditLedger` model, `AuditService.record()` with canonical JSON + SHA-256 chaining, gapless monotonic sequences, and verify-chain endpoint.

### 2026-09-30 — Phase 0 Monorepo and Foundation Setup

- Phase / Branch: Phase 0 / `feature/phase-0-setup`
- Done:
  - Initialized monorepo workspaces (`apps/api`, `apps/web`, `packages/shared-types`, `packages/verifier`, `infra/`, `docs/`)
  - Configured TypeScript strict mode (`tsconfig.base.json`), ESLint, Prettier, Commitlint, Husky hooks
  - Built `@sdms/shared-types` domain enums, models, audit, and API response types
  - Built NestJS backend (`apps/api`) with Prisma ORM, strict env validation, global filters, Swagger at `/api/docs`, and `/health`
  - Built Next.js App Router frontend (`apps/web`) with Tailwind CSS tokens from `Design.md`, light/dark themes, role-aware shell
  - Created `docker-compose.yml` for PostgreSQL, MinIO, Redis, and ClamAV
  - Configured GitHub Actions CI, PR template, CODEOWNERS, and `.env.example`
- Files touched: `package.json`, `tsconfig.base.json`, `.prettierrc`, `commitlint.config.js`, `.gitignore`, `apps/*`, `packages/*`, `infra/*`, `.github/*`, `README.md`, `Memory.md`
- Decisions: D8 — Mapped MinIO API port to 9002 on host to avoid conflict with existing host service (Portainer on 9000).
- Tests: In progress
- Next steps: Verify CI build, type checks, and tests; complete Phase 0 exit criteria
- Notes for next session: Proceed to Phase 1 (Auth, MFA, and RBAC)

### 2026 — Project documentation created

- Phase / Branch: pre-Phase 0 / `main`
- Done: Created PRD, Architecture, Rules, Phases, Design, Memory, GIT_WORKFLOW from the SIH idea-submission deck
- Decisions: See D1–D7
- Next steps: Start Phase 0 (`feature/phase-0-setup`)
- Notes for next session: Confirm the open questions Q1–Q5 with the team

---

## 9. Environment Notes

| Service       | Local Port                  | Notes                                       |
| ------------- | --------------------------- | ------------------------------------------- |
| Web (Next.js) | 3000                        | App Router, Tailwind with Design.md tokens  |
| API (NestJS)  | 4000                        | Swagger at `/api/docs`, Health at `/health` |
| PostgreSQL    | 5432                        | Port configurable via `.env`                |
| MinIO         | 9002 (API) / 9001 (console) | 9002 on host mapped to container 9000       |
| Redis         | 6379                        | BullMQ queue backend                        |
| ClamAV        | 3310                        | Daemon malware scanner                      |

_Update this table if ports or services change._

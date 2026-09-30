# Phases.md — Build Plan for SDMS

> Build **one phase at a time**. Do not start a phase until the previous phase's **exit criteria** are met.
> Each phase = its own feature branch(es) → PR into `develop` → tag on completion (see `GIT_WORKFLOW.md`).

## Phase Overview

| Phase | Name                                  | Outcome                                            | Tag      |
| ----- | ------------------------------------- | -------------------------------------------------- | -------- |
| 0     | Project Setup and Foundation          | Repo, tooling, CI, Docker services running         | `v0.1.0` |
| 1     | Authentication, MFA and RBAC          | Users can log in securely with roles               | `v0.2.0` |
| 2     | Audit Ledger (Hash-Chained)           | Every action is recorded tamper-evidently          | `v0.3.0` |
| 3     | Case Management and ABAC              | Case-centric structure with fine-grained access    | `v0.4.0` |
| 4     | Secure Document Upload and Versioning | Files stored encrypted, hashed, versioned          | `v0.5.0` |
| 5     | OCR, Classification and Search        | Documents searchable by content                    | `v0.6.0` |
| 6     | Controlled Sharing and Watermarking   | Time-limited, watermarked cross-department sharing | `v0.7.0` |
| 7     | Signed Exports and Verifier           | Verifiable export packages                         | `v0.8.0` |
| 8     | Dashboards, Audit UI and Polish       | Role dashboards, audit viewer, UX polish           | `v0.9.0` |
| 9     | Hardening, Testing and Demo Readiness | Production checklist done, demo data, docs         | `v1.0.0` |

---

## Phase 0 — Project Setup and Foundation

**Goal:** A working skeleton that everyone (and every AI session) can build on.

**Tasks**

- [x] Init monorepo (`apps/web`, `apps/api`, `packages/shared-types`, `infra`, `docs`)
- [x] Set up TypeScript strict, ESLint, Prettier, Husky pre-commit (lint plus secret scan), commitlint
- [x] Next.js app with Tailwind and design tokens from `Design.md`
- [x] NestJS app with config validation, global exception filter, logger, Swagger, `/health`
- [x] Prisma setup, connect to PostgreSQL
- [x] `docker-compose.yml`: PostgreSQL, MinIO, Redis, ClamAV
- [x] `.env.example`, `.gitignore`, `README.md`
- [x] GitHub Actions CI (lint, type-check, test, build)
- [x] PR template, CODEOWNERS, branch protection on `main` and `develop`

**Exit criteria**

- `docker compose up` starts all services; web and API run locally
- CI is green on an empty PR

---

## Phase 1 — Authentication, MFA and RBAC

**Goal:** Secure identity and role-based access.

**Tasks**

- [x] Prisma models: `User`, `Department`, `RefreshToken`
- [x] Argon2id password hashing, password policy
- [x] Login endpoint, JWT access (15 min) plus rotating refresh token (httpOnly cookie)
- [x] TOTP MFA enrollment (QR) and verification
- [x] `RolesGuard` and `@Roles()` decorator; roles: Admin, Investigator, Prosecutor, CourtOfficer, RecordsManager, Auditor
- [x] Re-auth guard for sensitive actions
- [x] Rate limiting and lockout on failed logins
- [x] Admin: create/disable users, assign roles and departments
- [x] UI: Login page, MFA page, role-based navigation shell
- [x] Seed script (fake users for each role)

**Exit criteria**

- Each role can log in with MFA and sees only its allowed menu
- Unauthorized API calls return 401/403; tests cover this
- Brute-force lockout works

---

## Phase 2 — Audit Ledger (Hash-Chained)

**Goal:** Tamper-evident record of everything, built **before** features that need it.

**Tasks**

- [x] `AuditLedger` model (append-only; DB role with INSERT-only)
- [x] `AuditService.record()` with canonical JSON and hash chaining
- [x] Gapless sequence via transaction plus lock
- [x] Verify-chain service and endpoint (`GET /audit/verify-chain`)
- [x] Wire ledger into Phase 1 (login success/fail, role changes, user creation)
- [x] Tests: tamper with a row, then chain verification must fail

**Exit criteria**

- Chain verifies as valid on clean data; detects any modified or deleted row
- No API path exists to update or delete ledger entries

---

## Phase 3 — Case Management and ABAC

**Goal:** Case-centric structure with policy-based access.

**Tasks**

- [ ] Models: `Case`, `CaseMember`
- [ ] CRUD for cases; status lifecycle (Open → Under Review → Closed → Archived)
- [ ] Assign members with case-level roles
- [ ] `PolicyGuard` (ABAC): department, case membership, classification level, time window
- [ ] Classification levels: Public, Restricted, Confidential, Secret (configurable)
- [ ] Ledger events for all case actions
- [ ] UI: case list, case detail, create/edit case, member management

**Exit criteria**

- User outside a case cannot see or fetch it (tested)
- Classification and department rules enforced by policy tests

---

## Phase 4 — Secure Document Upload and Versioning

**Goal:** Documents are safely ingested, hashed, encrypted, and versioned.

**Tasks**

- [ ] MinIO storage adapter (SSE enabled, bucket policies)
- [ ] Upload endpoint with type/size validation and streaming
- [ ] ClamAV scan; quarantine flow
- [ ] SHA-256 computation; store on `DocumentVersion`
- [ ] Models: `Document`, `DocumentVersion`
- [ ] New-version upload (never overwrite); version history endpoint
- [ ] "Verify integrity" endpoint (re-hash from storage and compare)
- [ ] Secure download (signed short-lived URL or streamed via API) plus ledger entry
- [ ] UI: upload with progress, document list, version history, verify button

**Exit criteria**

- Infected test file (EICAR) is rejected and quarantined
- Modifying a stored object makes "verify" fail
- All uploads, views, and downloads appear in the ledger

---

## Phase 5 — OCR, Classification and Search

**Goal:** Turn scanned documents into searchable, classified records.

**Tasks**

- [ ] BullMQ queues and worker process
- [ ] Image preprocessing (deskew, denoise, threshold)
- [ ] Tesseract OCR worker; store `OcrResult` with confidence
- [ ] Rule-based classifier (keywords and regex for FIR, charge sheet, statement, and others)
- [ ] Pluggable `Classifier` interface for future ML models
- [ ] Metadata extraction (dates, case numbers, names, with confidence)
- [ ] Human verification UI (edit OCR and metadata, then mark verified)
- [ ] PostgreSQL FTS (tsvector plus GIN index); search endpoint with ABAC filtering
- [ ] UI: search page, filters, highlighted snippets

**Exit criteria**

- Uploaded scan becomes searchable within minutes
- Search never returns documents the user cannot access (tested)
- Failed OCR jobs are retried and visible with a manual retry

---

## Phase 6 — Controlled Sharing and Watermarking

**Goal:** Safe cross-department collaboration.

**Tasks**

- [ ] `ShareGrant` model; create, list, revoke
- [ ] Scope: view-only vs download; expiry date and time
- [ ] Expiry enforced at access time (not only by cron)
- [ ] Re-auth required to create shares
- [ ] Dynamic watermark (user, timestamp, case ID) on view and download (PDF/image)
- [ ] Ledger events: `SHARE_CREATED`, `SHARE_REVOKED`, `SHARE_ACCESSED`
- [ ] UI: share dialog, "shared with me", active shares management

**Exit criteria**

- Expired or revoked share gives 403 immediately
- Watermark visible on all shared outputs

---

## Phase 7 — Signed Exports and Verifier

**Goal:** Court-ready, independently verifiable packages.

**Tasks**

- [ ] Export builder: documents plus `manifest.json` (file hashes, versions, metadata, audit extract)
- [ ] Ed25519 signing; key management via env/secret manager; key-generation script
- [ ] Evidence certificate template aligned to BSA 2023 §61–63 (content to be reviewed by a legal advisor)
- [ ] `ExportPackage` model plus ledger entry
- [ ] Standalone verifier (`packages/verifier` CLI plus web verify page)
- [ ] Re-auth required for export
- [ ] UI: export request, history, download, verify

**Exit criteria**

- Package verifies offline as VALID
- Editing any file or the manifest makes the verifier report INVALID

---

## Phase 8 — Dashboards, Audit UI and Polish

**Goal:** Usable product for every role.

**Tasks**

- [ ] Role-specific dashboards (recent cases, pending verifications, expiring shares)
- [ ] Audit log viewer (filters by user, action, date, entity) for Auditor/Admin
- [ ] Integrity report page (chain status, last verification, failed checks)
- [ ] Records Manager: retention and lifecycle settings
- [ ] Accessibility pass (WCAG 2.1 AA checks), responsive fixes
- [ ] Empty, loading, and error states everywhere

**Exit criteria**

- Every role's main journey works end-to-end without console errors

---

## Phase 9 — Hardening, Testing and Demo Readiness

**Goal:** Safe to pilot and demo.

**Tasks**

- [ ] Security review against OWASP Top 10 checklist
- [ ] Dependency audit (`npm audit`), fix critical issues
- [ ] Load test search and upload
- [ ] Backup and restore procedure tested
- [ ] Production Docker Compose with TLS proxy, non-root containers
- [ ] Deployment hardening checklist completed
- [ ] Demo dataset (fake), demo script, and screenshots
- [ ] Final docs: README, deployment guide, user guide
- [ ] Release `v1.0.0`

**Exit criteria**

- All P0 requirements in `PRD.md` are done and tested
- Demo runs from a clean machine using only the README

---

## Phase Working Protocol (for every phase)

1. Read `Memory.md`, `Rules.md`, and this phase.
2. Create branch `feature/phase-N-<name>` from `develop`.
3. Break the phase into small tasks, one sub-branch or a few commits each.
4. After each task: tests, lint, commit (Conventional Commits), update `Memory.md`.
5. Open PR into `develop`. Wait for review and CI.
6. When all exit criteria are met, merge, then tag the release (see `GIT_WORKFLOW.md`).
7. Mark the phase complete in `Memory.md`.

## Deferred / Future (Post-MVP)

- Trained ML classification and NER models
- CCTNS / ICJS / e-Courts connectors
- Federation across units
- HSM/KMS key management
- Mobile companion app

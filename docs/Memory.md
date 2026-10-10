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

| Item                    | Value                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Current phase**       | Phase 5 — OCR, Classification and Search (Completed, ready for Phase 6)                                            |
| **Current branch**      | `feature/phase-5-ocr-search`                                                                                       |
| **Last completed task** | Complete Phase 5 implementation (BullMQ worker, Sharp preprocessing, Tesseract OCR, PostgreSQL FTS, UI, and tests) |
| **In progress**         | Finalize Phase 5 PR, tag v0.6.0, initiate Phase 6 (Controlled Sharing and Dynamic Watermarking)                    |
| **Blocked by**          | _nothing_                                                                                                          |
| **Last updated**        | 2026-10-10 by Antigravity                                                                                          |

---

## 3. Phase Tracker

| Phase | Name                         | Status         | Branch                              | Tag      | Completed  |
| ----- | ---------------------------- | -------------- | ----------------------------------- | -------- | ---------- |
| 0     | Setup and Foundation         | ✅ Done        | `feature/phase-0-setup`             | `v0.1.0` | 2026-09-30 |
| 1     | Auth, MFA, RBAC              | ✅ Done        | `feature/phase-1-auth-rbac`         | `v0.2.0` | 2026-09-30 |
| 2     | Audit Ledger                 | ✅ Done        | `feature/phase-2-audit-ledger`      | `v0.3.0` | 2026-09-30 |
| 3     | Cases and ABAC               | ✅ Done        | `feature/phase-3-cases-abac`        | `v0.4.0` | 2026-09-30 |
| 4     | Upload and Versioning        | ✅ Done        | `feature/phase-4-upload-versioning` | `v0.5.0` | 2026-09-30 |
| 5     | OCR, Classification, Search  | ✅ Done        | `feature/phase-5-ocr-search`        | `v0.6.0` | 2026-10-10 |
| 6     | Sharing and Watermarking     | ⬜ Not started |                                     |          |            |
| 7     | Signed Exports and Verifier  | ⬜ Not started |                                     |          |            |
| 8     | Dashboards, Audit UI, Polish | ⬜ Not started |                                     |          |            |
| 9     | Hardening and Demo           | ⬜ Not started |                                     |          |            |

Legend: ⬜ Not started · 🟨 In progress · ✅ Done · ⛔ Blocked

---

## 4. Key Decisions (Decision Log)

| #   | Date       | Decision                                    | Reason                                                                           | Alternatives                                            |
| --- | ---------- | ------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------- |
| D1  | _2026_     | Modular monolith (NestJS)                   | Simple pilot deployment, clear boundaries                                        | Microservices (too heavy for unit-level)                |
| D2  | _2026_     | "Blockchain" = internal hash-chained ledger | Tamper-evidence without a public chain                                           | Public blockchain (out of scope)                        |
| D3  | _2026_     | PostgreSQL FTS for search initially         | Fewer moving parts                                                               | OpenSearch/Meilisearch later                            |
| D4  | _2026_     | Rule-based classification first             | Limited labeled data                                                             | ML models later via a pluggable interface               |
| D5  | _2026_     | Redis + BullMQ for jobs _(assumption)_      | Mature and simple                                                                | RabbitMQ                                                |
| D6  | _2026_     | ClamAV for malware scan _(assumption)_      | Open source, self-hosted                                                         | Commercial AV                                           |
| D7  | _2026_     | Ed25519 for export signing _(assumption)_   | Small, fast, modern                                                              | RSA-PSS                                                 |
| D8  | 2026-09-30 | MinIO API mapped to host port 9002          | Avoid conflict with existing local services on 9000 (Portainer)                  | Stop existing service                                   |
| D9  | 2026-09-30 | ABAC Policy evaluation model                | Case-level clearance via department, role, direct assignment, and active shares  | Pure RBAC (insufficient for multi-department isolation) |
| D10 | 2026-09-30 | Append-only document versioning with ClamAV | Prevent overwrites; compute SHA-256 on byte streams; detect EICAR virus patterns | Overwriting files in storage                            |
| D11 | 2026-10-10 | Tesseract OCR, Sharp, PostgreSQL tsvector   | Self-hosted pipeline, BullMQ retries, rule classifier, ABAC-filtered FTS         | External cloud OCR APIs                                 |

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

### 2026-10-10 — Phase 5 OCR, Classification, and Search Implementation

- Phase / Branch: Phase 5 / `feature/phase-5-ocr-search`
- Done:
  - Built BullMQ job queue infrastructure (`OcrQueue`, `OcrProcessor`) connected to Redis for resilient asynchronous document OCR and background metadata processing
  - Implemented high-performance image preprocessing pipeline (`ImagePreprocessingService`) leveraging Sharp for deskewing, denoising, grayscale normalization, and adaptive thresholding
  - Integrated Tesseract.js OCR engine and PDF text parser (`OcrService`) extracting full-text transcripts with confidence scoring
  - Implemented extensible `Classifier` interface and rule-based classifier (`RuleBasedClassifierService`) detecting FIRs, Charge Sheets, Witness Statements, Seizure Memos, Forensic Reports, and Identity Documents with weighted keyword matching and regex pattern scoring
  - Developed regex entity and metadata extractor (`MetadataExtractorService`) extracting incident dates, FIR/case registration numbers, named entities, and statutory legal sections
  - Configured PostgreSQL Full-Text Search (FTS) using `tsvector` generated column (`fts_vector`) and GIN indexes across document title, case title, case number, and OCR extracted text
  - Built search service and controller (`SearchService`, `SearchController`, `GET /api/v1/search`) enforcing ABAC clearance rules (role, department, direct case assignment, active shares) and yielding ranked results with contextual highlights and metadata snippets
  - Implemented human verification endpoints (`GET /api/v1/documents/:id/ocr`, `POST /api/v1/documents/:id/ocr/retry`, `PATCH /api/v1/documents/:id/ocr/verify`) logging `OCR_PROCESSED`, `OCR_VERIFIED`, and `CLASSIFICATION_UPDATED` into the audit ledger
  - Built dedicated Next.js search and verification UI (`/search`): live query bar, fuzzy/FTS toggle, classification and type facet filters, match score badges, OCR confidence indicators, and human transcript verification drawer modal
  - Authored comprehensive test suites: 14 unit test suites (91 tests) and 6 e2e test suites (49 tests) passing with 100% test success and zero lint/type errors
- Files touched: `apps/api/src/modules/ocr/*`, `apps/api/src/modules/search/*`, `apps/api/prisma/schema.prisma`, `apps/api/test/search-ocr.e2e-spec.ts`, `packages/shared-types/src/models.ts`, `apps/web/src/app/search/page.tsx`, `apps/web/src/components/layout/Sidebar.tsx`, `apps/web/src/app/page.tsx`, `docs/Phases.md`, `docs/Memory.md`
- Decisions: D11 — BullMQ asynchronous pipeline, Sharp preprocessing, Tesseract.js OCR, rule-based legal classifier, and PostgreSQL tsvector/GIN indexing for secure on-premise document search.
- Tests: Unit tests (91/91 pass), e2e tests (49/49 pass), lint (0 errors/warnings), full monorepo build (pass)
- Next steps: Merge `feature/phase-5-ocr-search` into `develop`, tag `v0.6.0`, and initiate Phase 6 (Controlled Sharing and Dynamic Forensic Watermarking).
- Notes for next session: Phase 6 will implement the `ShareGrant` model with view-only vs download scopes, dynamic forensic watermarking (user, timestamp, case ID), time-limited access enforcement, and court/external party portal.

### 2026-09-30 — Phase 4 Secure Document Upload and Versioning Implementation

- Phase / Branch: Phase 4 / `feature/phase-4-upload-versioning`
- Done:
  - Implemented MinIO S3 object storage adapter (`StorageService`) with bucket initialization, stream upload/download, SHA-256 calculation, and AES-256 SSE encryption support
  - Integrated ClamAV antivirus scanner (`ClamavService`) with clamd socket stream protocol, automatic quarantine audit logging, and built-in deterministic EICAR test signature detection
  - Built document service and endpoints (`DocumentsService`, `DocumentsController`, `CaseDocumentsController`): initial upload with 50MB limit, MIME type whitelist, SHA-256 hashing, and ABAC clearance checks
  - Enforced monotonic append-only versioning (`uploadNewVersion`) ensuring evidence files are never overwritten and previous revisions remain permanently preserved
  - Built real-time cryptographic integrity verifier (`verifyIntegrity`, `POST /api/v1/documents/:id/verify`) comparing live storage bytes directly with the audit ledger seal and emitting `DOCUMENT_INTEGRITY_VERIFIED` / `DOCUMENT_INTEGRITY_FAILED` events
  - Built streaming secure file download (`GET /api/v1/documents/:id/download`) logging `DOCUMENT_DOWNLOADED` ledger entries
  - Developed full frontend interface:
    - `/upload`: Drag-and-drop evidence ingestion portal with ClamAV scan progress indicator, auto-naming, SHA-256 seal receipt, and `?caseId=...` query param support
    - `/cases/[id]`: Full Evidence Documents tab and Overview preview with live integrity verification modal, version history inspector modal, download action, and new revision modal
    - Dashboard & Sidebar: Added quick action for evidence ingestion and updated Phase 4 operational status
  - Authored comprehensive test suites: 12 unit test suites (78 tests) and 5 e2e test suites (43 tests) covering infected EICAR rejection, integrity verification, monotonic revisioning, and archived immutability
- Files touched: `apps/api/src/modules/storage/*`, `apps/api/src/modules/documents/*`, `apps/api/test/documents.e2e-spec.ts`, `packages/shared-types/src/models.ts`, `apps/web/src/app/upload/*`, `apps/web/src/app/cases/[id]/*`, `apps/web/src/app/page.tsx`, `apps/web/src/components/layout/Sidebar.tsx`, `docs/Phases.md`, `docs/Memory.md`
- Decisions: D10 — Append-only document versioning with ClamAV malware scanning, streaming SHA-256 hashing, and live MinIO verification.
- Tests: Unit tests (78/78 pass), e2e tests (43/43 pass), lint (0 errors/warnings), full monorepo build (pass)
- Next steps: Merge `feature/phase-4-upload-versioning` into `develop`, tag `v0.5.0`, and start Phase 5 (OCR, Classification and Search with BullMQ, Tesseract, and PostgreSQL FTS).
- Notes for next session: Phase 5 will implement async job processing with Redis and BullMQ, Tesseract OCR on ingested documents, rule-based classification, and full-text search with ABAC filters.

### 2026-09-30 — Phase 3 Case Management and ABAC Implementation

- Phase / Branch: Phase 3 / `feature/phase-3-cases-abac`
- Done:
  - Created case management module (`CasesService`, `CasesController`) with full CRUD, auto-assignment of creator as Lead Investigator, and strict unique case number validation
  - Implemented dynamic Attribute-Based Access Control (`PolicyService`, `PolicyGuard`, `@RequirePolicy`) evaluating role clearance, department matching, case membership assignments, and active share grants
  - Enforced case lifecycle state transitions (`OPEN` -> `UNDER_REVIEW` -> `CLOSED` -> `ARCHIVED`) with role-based transition rights and complete immutability for archived cases
  - Implemented case member management (add/remove members with case roles: `LEAD_INVESTIGATOR`, `INVESTIGATOR`, `PROSECUTOR`, `REVIEWER`)
  - Integrated immutable hash-chained audit ledger logging for all case operations (`CASE_CREATED`, `CASE_UPDATED`, `CASE_STATUS_CHANGED`, `CASE_MEMBER_ADDED`, `CASE_MEMBER_REMOVED`)
  - Added chronological case timeline endpoint (`GET /api/v1/cases/:id/timeline`) sourcing immutable ledger entries
  - Built comprehensive Next.js web interface: `/cases` (search, status/classification filters, case creation modal), `/cases/[id]` (case metadata, member management with role assigning/removing, status transition dropdown with confirmation, chronological ledger activity audit timeline)
  - Updated role-aware navigation and dashboard quick actions to seamlessly connect to `/cases`
  - Authored unit and e2e test suites covering unauthorized case access, classification clearance checks, member assignment, and archived case immutability
- Files touched: `apps/api/src/modules/cases/*`, `apps/api/src/app.module.ts`, `apps/api/test/cases.e2e-spec.ts`, `packages/shared-types/src/*`, `apps/web/src/app/cases/*`, `apps/web/src/components/layout/Sidebar.tsx`, `apps/web/src/app/page.tsx`, `docs/Phases.md`, `docs/Memory.md`
- Decisions: D9 — Dynamic ABAC evaluation combining role clearance, department matching, case membership assignments, and active share grants; archived cases are permanently immutable.
- Tests: Unit tests (69/69 pass), e2e tests (34/34 pass), lint (0 errors/warnings), full monorepo build (pass)
- Next steps: Merge `feature/phase-3-cases-abac` into `develop`, tag `v0.4.0`, and initiate Phase 4 (Secure Document Upload and Versioning with MinIO, ClamAV, and SHA-256).
- Notes for next session: Phase 4 will implement MinIO storage adapter with SSE, document streaming upload endpoint, ClamAV malware scanning, SHA-256 integrity hashing, `Document` and `DocumentVersion` models, version history, and integrity verification.

### 2026-09-30 — Phase 2 Audit Ledger (Hash-Chained) Implementation

- Phase / Branch: Phase 2 / `feature/phase-2-audit-ledger`
- Done:
  - Created canonical JSON utility with recursive key sorting and timing-safe SHA-256 comparison (`canonical-json.util.ts`)
  - Built `AuditService.record()` appending immutable records serialized via PostgreSQL advisory transaction locks (`pg_advisory_xact_lock`) ensuring monotonic gapless sequences
  - Implemented cryptographic chain verification (`verifyChain()` and `GET /api/v1/audit/verify-chain`) validating sequence integrity, hash pointer continuity, and SHA-256 canonical payload hashes
  - Integrated audit recording into Phase 1 actions: login success, login failure (lockout/bad creds), MFA verification/failure, logout, user creation, user updates, and user disablement
  - Built Audit Ledger web interface (`/audit`): cryptographic integrity seal status banner, verify chain trigger, sequence details inspector, action badge filters, and entity search with fallback support
  - Wrote comprehensive unit and e2e test suites: testing sequence gaps, broken hash links, tampered row payloads, RBAC permissions (Auditor/Admin only), and verify-chain integrity restoration
- Files touched: `apps/api/src/modules/audit/*`, `apps/api/src/common/utils/canonical-json.*`, `apps/api/src/modules/auth/*`, `apps/api/src/modules/users/*`, `apps/web/src/app/audit/page.tsx`, `apps/web/next.config.mjs`, `docs/Phases.md`, `docs/Memory.md`
- Decisions: D2 — Used SHA-256 chained hash ledger with genesis hash (`0`^64) and advisory xact lock for gapless monotonic sequence.
- Tests: Unit tests (49/49 pass), e2e tests (18/18 pass), lint (0 errors/warnings), full monorepo build (pass)
- Next steps: Merge `feature/phase-2-audit-ledger` into `develop`, tag `v0.3.0`, and start Phase 3 (Case Management and ABAC).
- Notes for next session: Phase 3 will introduce `Case` and `CaseMember` models, lifecycle state transitions (Open → Under Review → Closed → Archived), case-level roles, `PolicyGuard` (ABAC), and case audit logging.

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

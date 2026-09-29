# Memory.md — Project Memory and Progress Log

> **Purpose:** AI assistants have no memory between sessions. This file is the shared memory.
> **Start of every session:** read this file first.
> **End of every task:** update it (status, decisions, next steps) and commit it with the work.

---

## 1. Project Snapshot

| Field | Value |
|---|---|
| Project | SDMS — Secure Digital Document Management System for Legal and Investigation Documents |
| Event | Smart India Hackathon 2026 (PS ID 26190) |
| Team | THE DEPLOYABLES |
| Theme | Blockchain & Cybersecurity (Software) |
| Repo | _TODO: add URL_ |
| Default branch | `main` (stable), `develop` (integration) |
| Stack | Next.js + TS + Tailwind · NestJS + Prisma · PostgreSQL · MinIO · Redis/BullMQ · Tesseract · ClamAV |
| Docs | `PRD.md`, `Architecture.md`, `Rules.md`, `Phases.md`, `Design.md`, `GIT_WORKFLOW.md` |

**One-liner:** Case-centric secure platform with RBAC+ABAC, SHA-256 integrity, hash-chained audit ledger, OCR search, controlled sharing, and signed verifiable exports. It complements CCTNS/ICJS and does not replace them.

---

## 2. Current Status

| Item | Value |
|---|---|
| **Current phase** | Phase 0 — Project Setup and Foundation |
| **Current branch** | _none yet_ |
| **Last completed task** | Project documentation created |
| **In progress** | _nothing_ |
| **Blocked by** | _nothing_ |
| **Last updated** | _YYYY-MM-DD by <name/AI>_ |

---

## 3. Phase Tracker

| Phase | Name | Status | Branch | Tag | Completed |
|---|---|---|---|---|---|
| 0 | Setup and Foundation | ⬜ Not started | | | |
| 1 | Auth, MFA, RBAC | ⬜ Not started | | | |
| 2 | Audit Ledger | ⬜ Not started | | | |
| 3 | Cases and ABAC | ⬜ Not started | | | |
| 4 | Upload and Versioning | ⬜ Not started | | | |
| 5 | OCR, Classification, Search | ⬜ Not started | | | |
| 6 | Sharing and Watermarking | ⬜ Not started | | | |
| 7 | Signed Exports and Verifier | ⬜ Not started | | | |
| 8 | Dashboards, Audit UI, Polish | ⬜ Not started | | | |
| 9 | Hardening and Demo | ⬜ Not started | | | |

Legend: ⬜ Not started · 🟨 In progress · ✅ Done · ⛔ Blocked

---

## 4. Key Decisions (Decision Log)

| # | Date | Decision | Reason | Alternatives |
|---|---|---|---|---|
| D1 | _2026_ | Modular monolith (NestJS) | Simple pilot deployment, clear boundaries | Microservices (too heavy for unit-level) |
| D2 | _2026_ | "Blockchain" = internal hash-chained ledger | Tamper-evidence without a public chain | Public blockchain (out of scope) |
| D3 | _2026_ | PostgreSQL FTS for search initially | Fewer moving parts | OpenSearch/Meilisearch later |
| D4 | _2026_ | Rule-based classification first | Limited labeled data | ML models later via a pluggable interface |
| D5 | _2026_ | Redis + BullMQ for jobs *(assumption)* | Mature and simple | RabbitMQ |
| D6 | _2026_ | ClamAV for malware scan *(assumption)* | Open source, self-hosted | Commercial AV |
| D7 | _2026_ | Ed25519 for export signing *(assumption)* | Small, fast, modern | RSA-PSS |

> Add new decisions at the bottom. Never delete old ones. Mark superseded ones instead.

---

## 5. Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| Q1 | Final color palette or branding approved by the team? | Team | Open |
| Q2 | Exact evidence certificate wording (BSA 2023 §61–63) reviewed by a legal advisor? | Team | Open |
| Q3 | Maximum file size and allowed file types? | Team | Open |
| Q4 | Retention period rules per case type? | Team | Open |
| Q5 | Team ID (blank in the deck) | Team | Open |

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

| # | Issue | Severity | Phase to fix |
|---|---|---|---|
| — | _none yet_ | | |

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

### 2026 — Project documentation created
- Phase / Branch: pre-Phase 0 / `main`
- Done: Created PRD, Architecture, Rules, Phases, Design, Memory, GIT_WORKFLOW from the SIH idea-submission deck
- Decisions: See D1–D7
- Next steps: Start Phase 0 (`feature/phase-0-setup`)
- Notes for next session: Confirm the open questions Q1–Q5 with the team

---

## 9. Environment Notes

| Service | Local Port | Notes |
|---|---|---|
| Web (Next.js) | 3000 | |
| API (NestJS) | 4000 | Swagger at `/api/docs` |
| PostgreSQL | 5432 | |
| MinIO | 9000 (API) / 9001 (console) | |
| Redis | 6379 | |
| ClamAV | 3310 | |

_Update this table if ports or services change._

# Architecture.md — SDMS System Architecture

## 1. Architecture Style

**Modular monolith** (NestJS) + **background workers** + **Next.js frontend**.
This keeps deployment simple for pilot units (single `docker compose up`) and leaves clean module boundaries so parts can be split into services later.

---

## 2. Technical Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | **Next.js** (App Router) + **TypeScript** + **TailwindCSS** | Role-aware UI |
| Backend | **NestJS** + **Node.js** (TypeScript) | Modular API services |
| ORM | **Prisma** | Type-safe DB access and migrations |
| Database | **PostgreSQL** | Users, cases, metadata, audit ledger, FTS index |
| Object Storage | **MinIO** (S3-compatible) | Encrypted document storage (AES-256 SSE, KMS-ready) |
| Queue | **Redis + BullMQ** *(assumption)* | Background jobs |
| OCR | **Tesseract** (+ OpenCV/Sharp preprocessing) | Text extraction |
| AI / NLP | Rule-based classifier (pluggable ML interface) | Metadata and classification |
| Malware Scan | **ClamAV** *(assumption)* | Upload scanning |
| Search | **PostgreSQL Full-Text Search** (tsvector + GIN), swappable | OCR and metadata search |
| Auth | JWT (short-lived) + refresh tokens, TOTP MFA, Argon2id | Authentication |
| Crypto | Node `crypto`: SHA-256, Ed25519 signing | Hashing and signed exports |
| Transport | **TLS** (reverse proxy: Nginx/Caddy) | Encryption in transit |
| Containers | Docker + Docker Compose | Self-hosted deployment |
| Testing | Jest, Supertest, Playwright | Unit, API, E2E |
| CI | GitHub Actions | Lint, test, build |

---

## 3. High-Level Architecture

```
                         ┌─────────────────────────┐
                         │   Browser (Next.js UI)  │
                         └───────────┬─────────────┘
                                     │ HTTPS / TLS
                         ┌───────────▼─────────────┐
                         │   Reverse Proxy (TLS)   │
                         └───────────┬─────────────┘
                                     │
                ┌────────────────────▼────────────────────┐
                │           NestJS API (Modular)          │
                │ auth │ users │ cases │ documents │ search│
                │ sharing │ audit │ export │ admin        │
                └───┬─────────┬──────────┬────────────┬───┘
                    │         │          │            │
             ┌──────▼───┐ ┌───▼────┐ ┌───▼─────┐ ┌────▼─────┐
             │PostgreSQL│ │ MinIO  │ │  Redis  │ │  ClamAV  │
             │ meta+FTS │ │ objects│ │  queue  │ │  scanner │
             │ +ledger  │ │AES-256 │ └───┬─────┘ └──────────┘
             └──────────┘ └────────┘     │
                                   ┌─────▼──────────────┐
                                   │ Workers (NestJS)   │
                                   │ OCR │ Classify │   │
                                   │ Index │ Thumbnail  │
                                   └────────────────────┘
```

---

## 4. Document Processing Pipeline

```
Upload → Malware Scan → SHA-256 Hash → OCR & Text Extraction
      → Metadata & Classification → Search Indexing → Processing → Secure Storage
```

| Step | Sync/Async | Owner | Failure Behavior |
|---|---|---|---|
| 1. Upload (streamed to temp) | Sync | API | Reject invalid type or size |
| 2. Malware scan | Sync (fast) | API → ClamAV | Quarantine, log audit event |
| 3. SHA-256 hash | Sync | API | Abort upload |
| 4. Store to MinIO (encrypted) | Sync | API | Retry, then fail |
| 5. Write ledger entry `DOCUMENT_INGESTED` | Sync | API | Abort upload |
| 6. OCR | Async | OCR worker | Retry x3, mark `OCR_FAILED`, allow manual retry |
| 7. Classification and metadata | Async | Classify worker | Mark `NEEDS_REVIEW` |
| 8. Index into search | Async | Index worker | Retry |
| 9. Human verification | Manual | UI | Verified results overwrite suggestions (versioned) |

---

## 5. Security Architecture

| Concern | Design |
|---|---|
| **Authentication** | Argon2id passwords, TOTP MFA, short-lived JWT (15 min) + rotating refresh token |
| **Authorization** | Guard chain: `JwtGuard → RolesGuard (RBAC) → PolicyGuard (ABAC)` |
| **ABAC attributes** | user.department, case.assignment, doc.classification, time window, share grant |
| **Sensitive actions** | Require re-auth (password or TOTP) within last 5 min |
| **Encryption in transit** | TLS at proxy; internal network isolated |
| **Encryption at rest** | MinIO SSE (AES-256), KMS-ready; DB volume encryption at OS level |
| **Integrity** | SHA-256 per file version; verify on demand |
| **Audit ledger** | Append-only; `entry_hash = SHA256(prev_hash + canonical_json(payload))` |
| **Ledger protection** | DB user for the app has INSERT only on `audit_ledger` (no UPDATE/DELETE) |
| **Export signing** | Ed25519 private key from env/secret manager; public key published for verifiers |
| **Secrets** | Env vars only, never committed; startup fails if required secrets are missing |
| **Input safety** | DTO validation (class-validator), file-type sniffing, size limits, rate limiting |

### Audit Ledger Entry Structure
```json
{
  "id": "uuid",
  "sequence": 1042,
  "timestamp": "2026-01-01T10:00:00Z",
  "actor_id": "uuid",
  "action": "DOCUMENT_VIEWED",
  "entity_type": "document",
  "entity_id": "uuid",
  "metadata": { "ip": "...", "case_id": "..." },
  "prev_hash": "hex",
  "entry_hash": "hex"
}
```

---

## 6. Data Model (Core Entities)

```
User ──< CaseMember >── Case ──< Document ──< DocumentVersion
  │                        │          │
  │                        │          └──< OcrResult
  │                        └──< ShareGrant >── User/Department
  └──< AuditLedger
Department ──< User
ExportPackage >── Case
```

| Entity | Key Fields |
|---|---|
| **User** | id, email, passwordHash, role, departmentId, mfaSecret, status |
| **Department** | id, name, type (police / court / prosecution) |
| **Case** | id, caseNumber, title, status, classification, createdBy |
| **CaseMember** | caseId, userId, caseRole |
| **Document** | id, caseId, title, type, classification, currentVersionId |
| **DocumentVersion** | id, documentId, versionNo, storageKey, sha256, size, mime, uploadedBy |
| **OcrResult** | id, versionId, text, confidence, verifiedBy, verifiedAt |
| **ShareGrant** | id, resourceType, resourceId, granteeId, scope, expiresAt, revokedAt |
| **AuditLedger** | id, sequence, actorId, action, entityType, entityId, metadata, prevHash, entryHash |
| **ExportPackage** | id, caseId, manifestHash, signature, createdBy, createdAt |

---

## 7. Folder Structure (Monorepo)

```
sdms/
├── apps/
│   ├── web/                      # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/              # App Router pages
│   │   │   │   ├── (auth)/login, mfa
│   │   │   │   ├── (dashboard)/cases, documents, search, sharing, audit, admin
│   │   │   ├── components/       # ui/, forms/, layout/, domain/
│   │   │   ├── lib/              # api client, auth helpers, utils
│   │   │   ├── hooks/
│   │   │   ├── types/
│   │   │   └── styles/
│   │   ├── public/
│   │   └── tests/                # Playwright E2E
│   │
│   └── api/                      # NestJS backend
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── common/           # guards, decorators, filters, interceptors, pipes
│       │   ├── config/           # env validation
│       │   ├── modules/
│       │   │   ├── auth/         # login, mfa, tokens
│       │   │   ├── users/
│       │   │   ├── departments/
│       │   │   ├── cases/
│       │   │   ├── documents/    # upload, versions, download
│       │   │   ├── search/
│       │   │   ├── sharing/
│       │   │   ├── audit/        # ledger service, verifier
│       │   │   ├── export/       # package builder, signer
│       │   │   ├── storage/      # MinIO adapter
│       │   │   ├── security/     # malware scan, hashing, crypto
│       │   │   └── health/
│       │   └── workers/          # BullMQ processors: ocr, classify, index
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       └── test/
│
├── packages/
│   ├── shared-types/             # DTOs and enums shared by web + api
│   └── verifier/                 # Standalone export-package verifier (CLI)
│
├── infra/
│   ├── docker/                   # Dockerfiles
│   ├── docker-compose.yml
│   ├── nginx/                    # TLS proxy config
│   └── scripts/                  # backup, key generation
│
├── docs/                         # PRD.md, Architecture.md, Rules.md, Phases.md, Design.md, Memory.md, GIT_WORKFLOW.md
├── .github/
│   ├── workflows/ci.yml
│   ├── pull_request_template.md
│   └── CODEOWNERS
├── .env.example
├── .gitignore
├── package.json                  # npm/pnpm workspaces
└── README.md
```

---

## 8. Application Flow

### 8.1 Login
```
User → /login → email+password → API verifies → MFA prompt → TOTP verified
     → access token + refresh token → redirect by role → ledger: LOGIN_SUCCESS
```

### 8.2 Upload Document
```
User selects case → uploads file → API: type/size check → ClamAV scan
  → SHA-256 → MinIO put → DB (Document + Version) → Ledger: DOCUMENT_INGESTED
  → enqueue OCR job → UI shows "Processing"
  → Worker: OCR → classify → index → status READY (or NEEDS_REVIEW)
```

### 8.3 Search
```
User query → API → build FTS query + ABAC filter (only authorized cases/docs)
  → results with highlighted snippets → open doc → ledger: DOCUMENT_VIEWED
```

### 8.4 Share
```
Owner clicks Share → re-auth → choose grantee, scope, expiry
  → ShareGrant saved → ledger: SHARE_CREATED
  → grantee views (watermarked) until expiresAt or revoked
```

### 8.5 Export and Verify
```
Prosecutor requests export → re-auth → collect docs + hashes + audit extract
  → build manifest.json → sign (Ed25519) → zip package → ledger: EXPORT_CREATED
  → recipient runs verifier → checks signature + file hashes → VALID / INVALID
```

---

## 9. API Conventions

- Base path: `/api/v1`
- REST + JSON; OpenAPI (Swagger) auto-generated
- Errors: `{ "statusCode", "error", "message", "requestId" }`
- Pagination: `?page=1&limit=20`
- Every mutating endpoint writes an audit ledger entry

| Area | Sample Endpoints |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/mfa/verify`, `POST /auth/refresh`, `POST /auth/logout` |
| Cases | `GET/POST /cases`, `GET/PATCH /cases/:id`, `POST /cases/:id/members` |
| Documents | `POST /cases/:id/documents`, `GET /documents/:id`, `GET /documents/:id/versions`, `POST /documents/:id/verify` |
| Search | `GET /search?q=&caseId=&type=` |
| Sharing | `POST /shares`, `DELETE /shares/:id` |
| Audit | `GET /audit`, `GET /audit/verify-chain` |
| Export | `POST /cases/:id/exports`, `GET /exports/:id/download` |

---

## 10. Deployment

| Environment | Setup |
|---|---|
| **Local dev** | `docker compose up` for Postgres, MinIO, Redis, ClamAV; apps run with hot reload |
| **Pilot (unit level)** | Single-host Docker Compose behind Nginx TLS |
| **Scaled** | Separate worker hosts, MinIO distributed mode, Postgres replica |

Hardening checklist: secrets policy enforced, non-root containers, network isolation, backup and restore tested, key rotation documented.

---

## 11. Observability
- Structured JSON logs (with `requestId`)
- Health endpoints: `/health/live`, `/health/ready`
- Queue metrics (job failures, latency)
- Alert on ledger chain verification failure

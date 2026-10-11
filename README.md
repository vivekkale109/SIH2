# SDMS — Secure Digital Document Management System

> **Smart India Hackathon 2026** (Problem Statement ID: **26190**)  
> **Theme:** Blockchain & Cybersecurity (Software)  
> **Team:** THE DEPLOYABLES  
> **Version:** `v1.0.0` (Production Hardened & Court Admissibility Ready)

SDMS is a case-centric, tamper-evident digital evidence and investigation document management system designed to complement CCTNS, ICJS, and e-Courts systems. It provides fine-grained role and attribute-based access control (RBAC + ABAC), cryptographic SHA-256 integrity verification, an append-only hash-chained audit ledger, OCR and metadata extraction, controlled time-limited sharing with dynamic watermarking, and court-admissible signed export packages aligned with Bharatiya Sakshya Adhiniyam (BSA) 2023 §61–63.

---

## 🏛️ System Architecture

SDMS is structured as a **Modular Monolith** with an asynchronous worker pipeline:

- **Frontend (`apps/web`):** Next.js (App Router), TypeScript (strict), Tailwind CSS, Lucide icons, role-aware navigation, persona switcher.
- **Backend API (`apps/api`):** NestJS, TypeScript (strict), Prisma ORM, Swagger/OpenAPI documentation at `/api/docs`.
- **Shared Types (`packages/shared-types`):** Unified TypeScript enums, models, DTOs, and API envelopes.
- **Standalone Verifier (`packages/verifier`):** Air-gapped CLI & library to verify exported court packages offline.
- **Data & Storage:**
  - **PostgreSQL 16:** Case metadata, user profiles, document records, full-text search (tsvector + GIN).
  - **MinIO:** S3-compatible encrypted object storage (AES-256 SSE).
  - **Redis + BullMQ:** Asynchronous queuing for malware scanning, OCR extraction, and classification.
  - **ClamAV:** In-stream malware & virus inspection.
  - **Nginx:** TLS reverse proxy terminating HTTPS on 443 with HSTS and CSP headers.

---

## 📁 Repository Layout

```
SIH2/
├── apps/
│   ├── api/                      # NestJS core backend API
│   │   ├── prisma/               # Prisma schema & rich demo seed data
│   │   └── src/                  # Modules (health, auth, audit, cases, documents, export...)
│   └── web/                      # Next.js App Router frontend
│       └── src/                  # Components, layouts, tokens, app pages
├── packages/
│   ├── shared-types/             # Cross-app shared TypeScript interfaces & enums
│   └── verifier/                 # Standalone export package verifier CLI
├── infra/
│   ├── docker-compose.yml        # Development microservices infrastructure
│   ├── nginx/                    # Production TLS proxy configurations
│   └── scripts/                  # Operations, backup/restore, SSL & load-testing scripts
├── docs/                         # Specifications & standards
│   ├── PRD.md                    # Product Requirements Document
│   ├── Architecture.md           # Detailed technical architecture
│   ├── Security.md               # OWASP Top 10 Security Review & Cryptographic Audit
│   ├── DEMO_SCRIPT.md            # Evaluator & judge presentation walkthrough script
│   ├── Phases.md                 # 10-phase roadmap & exit criteria
│   ├── Design.md                 # UI design tokens, colors & components
│   ├── GIT_WORKFLOW.md           # Git Flow & conventional commits
│   └── Memory.md                 # Active state log & session memory
├── docker-compose.yml            # Root infrastructure runner
├── docker-compose.prod.yml       # Production TLS multi-service runner
├── .env.example                  # Environment configuration template
└── package.json                  # Root monorepo workspace configuration
```

---

## 🚀 Quickstart Guide (Clean Machine)

### 1. Prerequisites

- **Node.js**: >= 20.x
- **npm**: >= 10.x
- **Docker & Docker Compose**: Recent version with Docker daemon running

### 2. Environment Configuration

```bash
cp .env.example .env
```

### 3. Start Infrastructure Services

Start PostgreSQL, MinIO, Redis, and ClamAV:

```bash
docker compose up -d
```

| Service       | Port | URL / Notes                                                      |
| ------------- | ---- | ---------------------------------------------------------------- |
| PostgreSQL    | 5432 | `localhost:5432`                                                 |
| MinIO API     | 9002 | `http://localhost:9002`                                          |
| MinIO Console | 9001 | `http://localhost:9001` (user: `minioadmin`, pass: `minioadmin`) |
| Redis         | 6379 | `localhost:6379`                                                 |
| ClamAV        | 3310 | `localhost:3310`                                                 |

### 4. Install Dependencies & Build Packages

```bash
npm install
npm run build:packages
```

### 5. Generate Prisma Client & Seed Demo Dataset

```bash
npm run prisma:generate --workspace=@sdms/api
npm run prisma:seed --workspace=@sdms/api
```

This seeds 4 government departments, 6 role-based users, 4 realistic criminal cases (Cyber Fraud, Narcotics, Corporate Siphoning, Antiquities), OCR-extracted text, and an unbroken 10-block hash-chained audit ledger.

### 6. Run Development Servers

```bash
# In Terminal 1 (API Server):
npm run dev:api
# API: http://localhost:4000/api/v1
# Swagger: http://localhost:4000/api/docs
# Health: http://localhost:4000/health

# In Terminal 2 (Web Frontend):
npm run dev:web
# Web UI: http://localhost:3000
```

---

## 👥 Demo Personas & Credentials

All seeded accounts use password: **`Secure#Demo2026!`**

| Role                | Email                           | Department                  | Key Capabilities                                                                   |
| :------------------ | :------------------------------ | :-------------------------- | :--------------------------------------------------------------------------------- |
| **Investigator**    | `investigator@police.gov.in`    | Cyber Crime Division        | Create cases, upload exhibits, run OCR, grant watermarked shares, generate exports |
| **Prosecutor**      | `prosecutor@prosecution.gov.in` | Directorate of Prosecutions | Review trial dossiers, view shared exhibits, inspect signed evidence               |
| **Court Officer**   | `court.officer@court.gov.in`    | District & Sessions Court   | Ingest court packages, verify offline authenticity, review chain of custody        |
| **Auditor**         | `auditor@vigilance.gov.in`      | State Vigilance Directorate | Cryptographic ledger validation, tamper detection, security transaction auditing   |
| **Records Manager** | `records@sdms.gov.in`           | Central Records Branch      | Manage BNS/BNSS retention schedules, long-term archival vault                      |
| **Admin**           | `admin@sdms.gov.in`             | Central Police HQ           | User management, department assignments, system telemetry                          |

> 💡 **Tip:** Use the interactive **Persona Switcher** in the top navigation bar to seamlessly test all roles without re-authenticating.

---

## ⚖️ Standalone Evidence Verifier (BSA 2023 §61–63)

Court officers and forensic analysts can verify packages completely offline:

```bash
# Verify using the standalone CLI
npx @sdms/verifier path/to/SDMS_EXPORT_CR-2026-DEL-0419.zip

# Output in JSON format for automated validation pipelines
npx @sdms/verifier path/to/SDMS_EXPORT_CR-2026-DEL-0419.zip --json
```

Or upload directly via the Web GUI at **`http://localhost:3000/verify`**.

---

## 💾 Operational Procedures

### Automated Backup

```bash
./infra/scripts/backup.sh ./backups
```

Generates a timestamped directory containing the PostgreSQL database dump, MinIO object storage files, and a `checksums.sha256` manifest.

### Automated Restore

```bash
./infra/scripts/restore.sh ./backups/20261011_085441
```

Restores database schemas, MinIO storage objects, and verifies SHA-256 checksums.

### Load & Stress Benchmark

```bash
npm run test:load
```

Benchmarks API throughput, p50/p95/p99 latency percentiles, and concurrency resistance.

### Production Docker Deployment

```bash
# 1. Generate local production TLS certificates
./infra/scripts/generate-ssl.sh

# 2. Build and launch production containers with TLS reverse proxy
docker compose -f docker-compose.prod.yml up -d --build
```

Access the production application securely over HTTPS at `https://localhost`.

---

## 🧪 Automated Test Suite

```bash
# Monorepo unit test suites (121 tests, 20 suites)
npm run test

# End-to-end integration test suites (76 tests, 9 suites)
npm run test:e2e --workspace=@sdms/api

# Full production compilation build
npm run build
```

---

## 📚 Documentation Links

- [Live Demo & Presentation Script](file:///home/vivek/SIH2/docs/DEMO_SCRIPT.md)
- [OWASP Top 10 Security Architecture Review](file:///home/vivek/SIH2/docs/Security.md)
- [Product Requirements Document](file:///home/vivek/SIH2/docs/PRD.md)
- [System Architecture Specification](file:///home/vivek/SIH2/docs/Architecture.md)
- [Phase Roadmap & Exit Criteria](file:///home/vivek/SIH2/docs/Phases.md)
- [Active State & Decision Memory](file:///home/vivek/SIH2/docs/Memory.md)

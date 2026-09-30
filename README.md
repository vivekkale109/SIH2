# SDMS — Secure Digital Document Management System

> **Smart India Hackathon 2026** (Problem Statement ID: **26190**)  
> **Theme:** Blockchain & Cybersecurity (Software)  
> **Team:** THE DEPLOYABLES

SDMS is a case-centric, tamper-evident digital evidence and investigation document management system designed to complement CCTNS, ICJS, and e-Courts systems. It provides fine-grained role and attribute-based access control (RBAC + ABAC), cryptographic SHA-256 integrity verification, an append-only hash-chained audit ledger, OCR and metadata extraction, controlled time-limited sharing with dynamic watermarking, and court-admissible signed export packages aligned with Bharatiya Sakshya Adhiniyam (BSA) 2023 §61–63.

---

## 🏛️ System Architecture

SDMS is structured as a **Modular Monolith** with an asynchronous worker pipeline:

- **Frontend (`apps/web`):** Next.js (App Router), TypeScript (strict), Tailwind CSS, Lucide icons, role-aware navigation.
- **Backend API (`apps/api`):** NestJS, TypeScript (strict), Prisma ORM, Swagger/OpenAPI documentation at `/api/docs`.
- **Shared Types (`packages/shared-types`):** Unified TypeScript enums, models, DTOs, and API envelopes.
- **Standalone Verifier (`packages/verifier`):** Independent CLI tool to verify exported court packages offline.
- **Data & Storage:**
  - **PostgreSQL 16:** Case metadata, user profiles, document records, full-text search (tsvector + GIN).
  - **MinIO:** S3-compatible encrypted object storage (AES-256 SSE).
  - **Redis + BullMQ:** Asynchronous queuing for malware scanning, OCR extraction, and classification.
  - **ClamAV:** Automated upload malware inspection.

---

## 📁 Repository Layout

```
SIH2/
├── apps/
│   ├── api/                      # NestJS core backend API
│   │   ├── prisma/               # Prisma schema & migrations
│   │   └── src/                  # Modules (health, auth, audit, cases, documents...)
│   └── web/                      # Next.js App Router frontend
│       └── src/                  # Components, layouts, tokens, app pages
├── packages/
│   ├── shared-types/             # Cross-app shared TypeScript interfaces & enums
│   └── verifier/                 # Standalone export package verifier CLI
├── infra/
│   ├── docker-compose.yml        # Multi-service infrastructure definitions
│   ├── docker/                   # Dockerfiles
│   └── scripts/                  # Operations & key-generation scripts
├── docs/                         # Specifications & standards
│   ├── PRD.md                    # Product Requirements Document
│   ├── Architecture.md           # Detailed technical architecture
│   ├── Rules.md                  # Non-negotiable AI and engineering rules
│   ├── Phases.md                 # 10-phase roadmap & exit criteria
│   ├── Design.md                 # UI design tokens, colors & components
│   ├── GIT_WORKFLOW.md           # Git Flow & conventional commits
│   └── Memory.md                 # Active state log & session memory
├── .github/
│   ├── workflows/ci.yml          # GitHub Actions CI workflow
│   ├── pull_request_template.md  # Standardized PR checklist
│   └── CODEOWNERS                # Security & component review assignments
├── docker-compose.yml            # Root infrastructure runner
├── .env.example                  # Environment configuration template
└── package.json                  # Root monorepo workspace configuration
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites

- **Node.js**: >= 20.x (Recommended: v22.x or v26.x)
- **npm**: >= 10.x
- **Docker & Docker Compose**: Recent version with Docker daemon running

### 2. Environment Configuration

Copy the template environment file:

```bash
cp .env.example .env
```

_(The defaults are pre-configured for local containerized development)._

### 3. Start Infrastructure Services

Start PostgreSQL, MinIO, Redis, and ClamAV in the background:

```bash
docker compose up -d
```

Verify service status:

```bash
docker compose ps
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

### 5. Generate Prisma Client & Migrate

```bash
npm run prisma:generate --workspace=@sdms/api
```

### 6. Run Development Servers

In separate terminals (or concurrently):

**Backend API:**

```bash
npm run dev:api
# API runs at http://localhost:4000/api/v1
# Swagger Docs at http://localhost:4000/api/docs
# Health Probe at http://localhost:4000/health
```

**Frontend Web:**

```bash
npm run dev:web
# Web UI runs at http://localhost:3000
```

---

## 🧪 Testing & Validation

```bash
# Type checking across all workspaces
npm run type-check

# Run unit tests
npm run test

# Check formatting
npm run format:check

# Full CI build test
npm run build
```

---

## 🛡️ Security & Development Guidelines

- **Never commit `.env` or cryptographic keys.**
- **Immutable Ledger:** Writes to `audit_ledger` are append-only; update and delete operations are strictly prohibited.
- **Git Flow:** All work is conducted on feature branches (`feature/phase-N-<name>`) targeting `develop`. Direct commits to `main` or `develop` are forbidden.
- See [`docs/Rules.md`](docs/Rules.md) and [`docs/GIT_WORKFLOW.md`](docs/GIT_WORKFLOW.md) for complete protocols.

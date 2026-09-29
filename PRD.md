# PRD.md — Project Requirements Document

## 1. Project Overview

| Field | Value |
|---|---|
| **Project Name** | SDMS — Secure Digital Document Management System for Legal and Investigation Documents |
| **Event** | Smart India Hackathon (SIH) 2026 |
| **Problem Statement ID** | 26190 |
| **Theme** | Blockchain & Cybersecurity |
| **Category** | Software |
| **Team** | THE DEPLOYABLES |

**One-line pitch:** A secure, intelligent, case-centric platform for managing sensitive legal and investigation documents, with cryptographic integrity, searchable OCR, immutable audit trails, and verifiable exports.

**Positioning:** SDMS is a **unit-level integrity layer**. It complements CCTNS / ICJS / NCRB / e-Courts. It does **not** replace national records systems.

---

## 2. Problem Statement

Police stations, prosecutors, courts, and records units struggle with:

| # | Problem | Consequence |
|---|---|---|
| 1 | Heavy manual processing (extraction, indexing) | Slow, error-prone document handling |
| 2 | Scattered records | Search takes hours |
| 3 | Weak access control | Unauthorized access, no accountability |
| 4 | No tamper-evident history / version trail | Hard to prove integrity in court |
| 5 | Uncontrolled cross-department sharing | Data leakage, no central control |
| 6 | Poor traceability and audit readiness | Compliance gaps |

---

## 3. Goals and Non-Goals

### Goals
- G1. Reduce document retrieval time from **hours to minutes** (OCR + indexed metadata).
- G2. Make tampering **evident and auditable** (SHA-256 + hash-chained audit ledger).
- G3. Enforce **least-privilege** access (RBAC + ABAC, MFA).
- G4. Enable **controlled, time-limited, watermarked** sharing across departments.
- G5. Produce **digitally signed, verifiable export packages** that support prosecution.
- G6. Be deployable **on-prem / self-hosted** at unit level (police station, court cell).

### Non-Goals
- Replacing CCTNS, ICJS, NCRB, or e-Courts.
- Fully autonomous AI decisions. All AI output requires **human verification**.
- A public-facing portal for citizens.
- A public blockchain. "Blockchain" here means a **hash-chained, append-only ledger**.

---

## 4. Target Users and Roles

| Role | Description | Typical Permissions |
|---|---|---|
| **Admin** | System / unit administrator | Manage users, roles, policies, system config |
| **Investigator** | Police / investigating officer | Create cases, upload, view, annotate, request export |
| **Prosecutor** | Legal officer | View case documents, request signed exports |
| **Court Officer** | Court cell staff | View shared documents, verify exports |
| **Records Manager** | Keeps records and lifecycle | Manage retention, classification, archive |
| **Auditor** | Compliance reviewer | Read-only access to audit logs and integrity reports |

Primary users: Law Enforcement, Investigators, Prosecutors, Courts, Records Managers, Auditors.

---

## 5. Functional Requirements

Priority: **P0** = must-have MVP, **P1** = should-have, **P2** = nice-to-have.

### 5.1 Authentication and Access Control
| ID | Requirement | Priority |
|---|---|---|
| AUTH-1 | Login with email + password (hashed with Argon2id) | P0 |
| AUTH-2 | MFA (TOTP) mandatory for all roles | P0 |
| AUTH-3 | RBAC (role-based permissions) | P0 |
| AUTH-4 | ABAC (attributes such as department, case assignment, classification level, time) | P0 |
| AUTH-5 | Re-authentication for sensitive actions (export, share, delete request) | P0 |
| AUTH-6 | Session timeout and revocation | P1 |

### 5.2 Case Management
| ID | Requirement | Priority |
|---|---|---|
| CASE-1 | Create, view, update, and close cases (case-centric repository) | P0 |
| CASE-2 | Assign users to a case with a case-level role | P0 |
| CASE-3 | Attach documents to a case | P0 |
| CASE-4 | Case timeline showing all activity | P1 |

### 5.3 Document Ingestion Pipeline
Pipeline: **Upload → Malware Scan → SHA-256 Hash → OCR → Classify → Index → Process → Store**

| ID | Requirement | Priority |
|---|---|---|
| DOC-1 | Upload PDF, images (JPG/PNG/TIFF), DOCX | P0 |
| DOC-2 | Malware scan before acceptance; infected files quarantined | P0 |
| DOC-3 | Compute SHA-256 at ingestion; store in DB and ledger | P0 |
| DOC-4 | OCR text extraction (Tesseract) with image preprocessing | P0 |
| DOC-5 | Metadata extraction and classification (rule-based first) | P1 |
| DOC-6 | Human verification screen for OCR and classification results | P1 |
| DOC-7 | Store files in encrypted object storage (MinIO, AES-256 SSE) | P0 |
| DOC-8 | Pluggable ML interface (rule-based now, trained model later) | P2 |

### 5.4 Search and Retrieval
| ID | Requirement | Priority |
|---|---|---|
| SRCH-1 | Full-text search over OCR text and metadata | P0 |
| SRCH-2 | Filters: case, type, date, department, classification | P0 |
| SRCH-3 | Results respect RBAC + ABAC (never leak unauthorized docs) | P0 |

### 5.5 Integrity and Audit
| ID | Requirement | Priority |
|---|---|---|
| INT-1 | Immutable version history (new version = new record, never overwrite) | P0 |
| INT-2 | Hash-chained audit ledger (each entry contains the hash of the previous one) | P0 |
| INT-3 | "Verify integrity" action (recompute hash and compare with ledger) | P0 |
| INT-4 | Ledger chain verification tool (detect broken chain) | P0 |
| INT-5 | Audit log viewer with filters (Auditor role) | P1 |

### 5.6 Controlled Sharing
| ID | Requirement | Priority |
|---|---|---|
| SHR-1 | Share documents or cases with a user or department | P0 |
| SHR-2 | Time-limited access that expires automatically | P0 |
| SHR-3 | Role-based sharing scope (view-only, download) | P1 |
| SHR-4 | Dynamic watermark on viewed or downloaded documents (user, time, case ID) | P1 |
| SHR-5 | Revoke share at any time | P0 |

### 5.7 Verifiable Exports
| ID | Requirement | Priority |
|---|---|---|
| EXP-1 | Export package = documents + manifest (hashes, metadata, audit extract) | P0 |
| EXP-2 | Manifest digitally signed (Ed25519 or RSA) | P0 |
| EXP-3 | Standalone verifier (CLI/page) to validate a package offline | P1 |
| EXP-4 | Export aligned to Bharatiya Sakshya Adhiniyam 2023, Sections 61–63 (electronic evidence certificate) | P1 |

### 5.8 Interoperability
| ID | Requirement | Priority |
|---|---|---|
| INTP-1 | Modular API design so CCTNS/ICJS connectors can be added later | P2 |
| INTP-2 | Import/export of case metadata in JSON/CSV | P2 |

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Security** | TLS everywhere, AES-256 encryption at rest, secrets only from environment or secret manager, OWASP Top 10 mitigations |
| **Performance** | Search results in under 2 s for 100k documents (target); upload plus scan feedback visible within 5 s |
| **Scalability** | Stateless API, background workers scale independently, object lifecycle policies |
| **Availability** | Health checks, graceful degradation if OCR workers are down (upload still succeeds, OCR queued) |
| **Deployability** | Docker Compose for pilots, self-hosted, no mandatory cloud dependency |
| **Auditability** | Every read, write, share, and export action is logged |
| **Usability** | Keyboard-accessible, responsive, WCAG 2.1 AA target |
| **Maintainability** | Modular monolith with clear module boundaries, TypeScript strict mode, tests for critical paths |

---

## 7. Key Metrics (Success Criteria)

| Metric | Target |
|---|---|
| Retrieval time | Hours → minutes |
| Tamper detection | 100% of modified files or ledger entries detected by the verify action |
| Unauthorized access in tests | 0 successful |
| OCR accuracy on clean scans | ≥ 90% (measured on a sample set) |
| Export verification | Signed package verifies offline |

---

## 8. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Unauthorized access / insider misuse | Hardened RBAC + ABAC, MFA, re-auth on sensitive actions, immutable audit |
| Poor scans reduce OCR quality | Preprocessing (deskew, denoise, threshold), human verification |
| Large-scale storage | Object lifecycle policies, monitoring, sharding options |
| Limited labeled data for ML | Rule-based triage first, pluggable ML interface, human-in-the-loop |
| Secrets / production hardening | Environment-enforced secrets policy, hardening checklist |

---

## 9. Assumptions
- A. Deployment is per unit (police station or court cell); federation is a later option.
- B. Users have modern browsers on a trusted network.
- C. Redis is used for the job queue (not stated in the deck; chosen for BullMQ).
- D. Full-text search starts with PostgreSQL FTS and can move to a dedicated search engine later.
- E. ClamAV is used for malware scanning.

## 10. Out of Scope for MVP
Federation between units, trained ML models, mobile app, CCTNS/ICJS live connectors, HSM/KMS integration (KMS-ready design only).

## 11. References
- Bharatiya Sakshya Adhiniyam, 2023 (Sections 61–63)
- NIST FIPS 180-4 (SHA-256)
- NIST / ANSI INCITS 359 (RBAC)
- OWASP Top 10
- Next.js, NestJS, PostgreSQL, Prisma, MinIO, Tesseract documentation

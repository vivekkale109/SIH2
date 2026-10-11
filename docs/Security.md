# Security.md — OWASP Top 10 Compliance & Security Architecture Review

> **System:** SDMS (Secure Digital Document Management System for Legal & Investigation Documents)  
> **Standard:** OWASP Top 10 (2021) & Smart India Hackathon Cybersecurity Benchmark  
> **Status:** Passed / Hardened

---

## 1. Executive Summary

SDMS is engineered for criminal justice, police, prosecution, and judicial workflows handling sensitive evidence (FIRs, charge sheets, witness statements, forensic reports). Given statutory standards under the **Bharatiya Sakshya Adhiniyam, 2023 (BSA 2023)**, **Bharatiya Nyaya Sanhita, 2023 (BNS 2023)**, and the **Information Technology Act, 2000**, security in SDMS is implemented at every tier:

1. **Cryptographic Immutability:** SHA-256 hash-chained audit ledger with gapless sequence locking.
2. **Zero-Trust ABAC & RBAC:** Enforced at controller, service, and data layers (`RolesGuard`, `PolicyGuard`, `PolicyService`).
3. **Air-Gapped Court Verifiability:** Ed25519 digital signatures with canonical JSON serialization.
4. **Active Threat Mitigation:** In-stream ClamAV antivirus scanning, Argon2id key derivation, and dynamic forensic watermarking.

---

## 2. OWASP Top 10 (2021) Compliance Matrix

| Vulnerability Category                            |  Risk Level  | SDMS Defense Mechanism                        | Implementation Details                                                                                                                                                                                                                                                                                                                                                                          |
| :------------------------------------------------ | :----------: | :-------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A01: Broken Access Control**                    | **Critical** | Dual-tier RBAC + ABAC Policy Engine           | • Controller-level `@Roles()` guard enforcing 6 distinct roles.<br>• Dynamic ABAC (`PolicyGuard` / `PolicyService`): evaluates case membership, department clearance, classification level, and active time-limited `ShareGrant` permissions.<br>• Data isolation: SQL queries strictly filter by tenant/department/case scope.                                                                 |
| **A02: Cryptographic Failures**                   | **Critical** | Modern cryptographic primitives               | • Passwords hashed using memory-hard **Argon2id** (64MB memory, 3 iterations, 4 parallelism).<br>• Asymmetric signing uses **Ed25519** elliptic curves for court evidence packages.<br>• Document integrity checked with **SHA-256** digests recorded at ingestion and re-verified on download.<br>• AES-256 Server-Side Encryption (SSE-S3) in MinIO object storage.                           |
| **A03: Injection**                                |   **High**   | Parameterized ORM + Strict Typing             | • Object-Relational Mapping via **Prisma ORM** uses parameterized SQL queries exclusively, eliminating SQL injection.<br>• PostgreSQL Full-Text Search uses parameterized `plainto_tsquery` escaping.<br>• NestJS `ValidationPipe` with `class-validator` strictly whitelists inputs, rejecting unknown payload fields.                                                                         |
| **A04: Insecure Design**                          |   **High**   | Threat-modeled architecture                   | • Append-only architecture: Document versions and audit entries are strictly immutable.<br>• Dual-custody & Re-authentication: Sensitive actions (creating share grants, court-ready exports) require explicit password confirmation within a sliding 15-minute window (`ReAuthGuard`).<br>• Air-gapped verification: Standalone verification library without server dependencies.              |
| **A05: Security Misconfiguration**                |  **Medium**  | Hardened container & server defaults          | • Non-root container execution (`USER node` in Dockerfiles).<br>• Helmet security headers (CSP, HSTS, X-Content-Type-Options: nosniff, X-Frame-Options: DENY).<br>• Strict environment variable validation via `class-validator` on API bootstrap (`env.validation.ts`).                                                                                                                        |
| **A06: Vulnerable & Outdated Components**         |  **Medium**  | Automated dependency audits                   | • Minimal Alpine-based base images.<br>• Automated `npm audit` and Dependabot workflows.<br>• Pinned direct dependencies in monorepo workspaces.                                                                                                                                                                                                                                                |
| **A07: Identification & Authentication Failures** |   **High**   | Multi-Factor Authentication & Session Hygiene | • Mandatory TOTP (Time-based One-Time Password) MFA integration (`otplib`, RFC 6238).<br>• Ephemeral JWT access tokens (15-minute lifetime) paired with cryptographically hashed, rotating refresh tokens stored in `httpOnly`, `Secure`, `SameSite=Strict` cookies.<br>• Automated account lockout and exponential backoff after 5 failed login attempts.                                      |
| **A08: Software and Data Integrity Failures**     |   **High**   | Cryptographic Ledger & Antivirus Pipeline     | • All uploaded binaries are scanned in real-time via **ClamAV daemon**; infected files (e.g., EICAR) are immediately quarantined and blocked from object storage.<br>• Hash-chained audit ledger (`AuditService`): Each block seals `prevHash`, sequence, actor, payload hash, and timestamp. Any alteration breaks verification.<br>• BSA 2023 Section 63 electronic evidence package signing. |
| **A09: Security Logging and Monitoring Failures** |   **High**   | Tamper-Evident Immutable Audit Trail          | • 100% of state-changing operations emit canonical structured audit records.<br>• Database table `audit_ledger` permissions restricted to append-only (no UPDATE or DELETE routes exist).<br>• Real-time chain verification endpoint (`GET /audit/verify-chain`) continuously monitors ledger health.                                                                                           |
| **A10: Server-Side Request Forgery (SSRF)**       |  **Medium**  | Isolated internal network topology            | • Microservices (Postgres, Redis, MinIO, ClamAV) communicate on an isolated Docker bridge network (`sdms-internal`) with no external port exposure.<br>• No arbitrary outbound HTTP fetch functionality exposed to end-users.                                                                                                                                                                   |

---

## 3. Cryptographic Deep-Dive

### 3.1 Hash-Chained Audit Ledger

Every operational event within the system generates an audit block governed by:
$$\text{EntryHash}_n = \text{SHA256}(\text{prevHash}_{n-1} \,\|\, \text{sequence}_n \,\|\, \text{timestamp}_n \,\|\, \text{actorId}_n \,\|\, \text{action}_n \,\|\, \text{entityType}_n \,\|\, \text{entityId}_n \,\|\, \text{SHA256}(\text{CanonicalJSON}(\text{payload}_n)))$$

- **Genesis Block:** Anchored at `0000000000000000000000000000000000000000000000000000000000000000`.
- **Gapless Monotonic Sequence:** Sequence numbers are strictly incremented under database row-level locking (`pg_advisory_xact_lock`). Any deletion creates a verifiable sequence gap.

### 3.2 Dynamic Forensic Watermarking

Documents rendered for preview or downloaded across department boundaries receive dynamic forensic stamping:

- **Stamp Metadata:** Grantee user email, badge number, UTC timestamp, case docket reference, and security classification.
- **Raster Processing:** High-performance stream processing via `Sharp` (for image exhibits) and `pdf-lib` (for court records).

---

## 4. Production Hardening Checklist

- [x] Non-root execution enabled (`USER node` in Dockerfiles).
- [x] Nginx reverse proxy with TLS termination and security headers (`HSTS`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).
- [x] CORS restricted to authorized frontend origins.
- [x] Input sanitization and payload limits (50MB streaming ceiling).
- [x] Rate limiting enabled on authentication endpoints (5 requests/minute).
- [x] Database connections pooled and credentialed with least privilege.
- [x] Sensitive parameters excluded from application log streams.

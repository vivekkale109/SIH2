# DEMO_SCRIPT.md — SDMS Live Demonstration & Presentation Script

> **Event:** Smart India Hackathon 2026 (PS ID 26190)  
> **Team:** THE DEPLOYABLES  
> **Theme:** Blockchain & Cybersecurity (Software)  
> **Estimated Run Time:** 7–10 minutes

---

## 1. Quick Pitch (60 Seconds)

> "Respected judges, legal and criminal investigation records in India are currently fragmented across police stations, prosecution branches, and courts. Evidence tampering, unauthorized leaking, and legal challenges to digital evidence admissibility under Sections 61–63 of the new **Bharatiya Sakshya Adhiniyam, 2023 (BSA 2023)** remain critical vulnerabilities.
>
> We built **SDMS** — a Secure Digital Document Management System designed specifically for the Indian criminal justice pipeline. SDMS delivers:
>
> 1. **Zero-Trust ABAC + RBAC** across Police, Prosecution, and Judiciary.
> 2. **Tamper-Evident Hash-Chained Audit Ledger** with mathematical sequence locking.
> 3. **Dynamic Forensic Watermarking** preventing unauthorized leaks.
> 4. **Court-Ready Ed25519 Signed Exports** with automated BSA 2023 §63 certificates and air-gapped offline verifiability.
> 5. **Automated Tesseract OCR & Rule-Based Legal Classification** with PostgreSQL full-text search."

---

## 2. Pre-Demo Setup (Clean Machine Quickstart)

```bash
# 1. Start Docker dependencies (PostgreSQL, MinIO, Redis, ClamAV)
docker compose up -d

# 2. Seed database with realistic cases, exhibits, and valid audit ledger
npm run prisma:seed --workspace=@sdms/api

# 3. Start development servers
npm run dev:api   # Port 4000
npm run dev:web   # Port 3000
```

Open browser at: `http://localhost:3000`

---

## 3. Step-by-Step Interactive Demo Walkthrough

### Act 1: Role-Adaptive Dashboards & Persona Switcher (2 mins)

- **Navigation:** Visit `http://localhost:3000/`
- **Showcase:** Point out the **Persona Switcher** in the top navigation bar.
- **Investigator View (`investigator@police.gov.in`):**
  - Highlight assigned active dockets (`CR-2026-DEL-0419` Cyber Fraud, `CR-2026-MUM-1102` Narcotics).
  - Note the "Expiring Controlled Shares" banner and quick evidence ingestion shortcuts.
- **Switch to Prosecutor (`prosecutor@prosecution.gov.in`):**
  - Show how the dashboard adapts: Trial dossiers, signed court exhibits, and incoming shared evidence.
- **Switch to Court Officer / Judge (`court.officer@court.gov.in`):**
  - Show air-gapped judicial evidence package verification actions.
- **Switch to Auditor (`auditor@vigilance.gov.in`):**
  - Show live cryptographic health status of the hash-chained audit ledger.

---

### Act 2: Zero-Trust Case Dockets & ABAC Security (1.5 mins)

- **Navigation:** Click **Cases** (`/cases`) -> Select `CR-2026-DEL-0419`
- **Showcase:**
  - Case metadata: Statutory offence u/s 318(4) BNS 2023 & Sec 66D IT Act 2000.
  - Classification badge: `SECRET`.
  - Assigned multi-agency team: Lead Investigator Sharma + Prosecutor Sen.
  - Notice that users outside this case cannot access or fetch files through direct URL alteration.

---

### Act 3: Evidence Ingestion, ClamAV Malware Scan & Tesseract OCR (2 mins)

- **Navigation:** Click **Upload Evidence** (`/upload`)
- **Showcase:**
  - Select case `CR-2026-DEL-0419`.
  - In-stream ClamAV virus scanning: Blocks malware (e.g., EICAR) before it touches storage.
  - SHA-256 byte-level hash computed in real-time.
  - Append-only versioning: Uploading a revised scan creates `v2` without ever overwriting `v1`.
- **Search Capability:**
  - Click **Search** (`/search`).
  - Search query: `"Quantum Syndicate"` or `"LUKS"`.
  - Instantly reveals exhibits matching OCR extracted text with highlighted snippet matches.

---

### Act 4: Cross-Department Controlled Sharing & Forensic Watermarking (1.5 mins)

- **Navigation:** Click **Shared Records** (`/shares`)
- **Showcase:**
  - Show the active share grant from Investigator to Prosecutor with an enforced 7-day expiry.
  - Click **Preview Watermark**:
  - Show how the forensic watermark dynamically renders diagonal translucent stamps across the exhibit:
    - Grantee email (`prosecutor@prosecution.gov.in`)
    - Badge number (`PROS-OFF-208`)
    - Precise UTC timestamp
    - Case Docket Number (`CR-2026-DEL-0419`)
  - Explain: _"If an officer photographs or leaks this screen, the source of the leak is immediately attributable."_

---

### Act 5: Court-Ready Signed Export & BSA 2023 §61–63 Admissibility (2 mins)

- **Navigation:** Open Case `CR-2026-DEL-0419` -> Click **Signed Export**
- **Showcase:**
  - Note the **Re-Authentication Requirement** (`ReAuthGuard`): requires entering password to prevent session hijacking.
  - System generates a court evidence archive (`.zip`) containing:
    1. `manifest.json`: Canonical JSON listing bit-exact SHA-256 hashes of all exhibits.
    2. `certificate_BSA_2023.txt`: Statutory Electronic Evidence Certificate compliant with Section 63(4) of Bharatiya Sakshya Adhiniyam, 2023.
    3. `signature.sig`: Cryptographic Ed25519 digital signature.
    4. `pubkey.pem`: Public verification key.
    5. `documents/`: Binary exhibits.

---

### Act 6: Standalone Air-Gapped Verification (Web & CLI) (2 mins)

- **Navigation:** Click **Verify Package** (`/verify`)
- **Web Verification:**
  - Upload the downloaded `.zip` package.
  - Visual verdict appears: **VALID — VERIFIED ADMISSIBLE**.
  - All 3 cryptographic pillars display green checkmarks (Manifest Integrity, Ed25519 Signature, Exhibit Hashes).
- **Tamper Demonstration (The Clincher!):**
  - Open terminal or extract zip, modify 1 byte in any file or manifest.
  - Re-upload or run CLI verifier:
  ```bash
  npx @sdms/verifier ./tampered-package.zip
  ```
  - **Verdict:** Immediately flags **TAMPERED / INVALID**, pinpoints the exact modified byte stream, and renders red failure banner!

---

### Act 7: Cryptographic Chain Integrity & Audit Explorer (1.5 mins)

- **Navigation:** Click **Chain Integrity** (`/integrity`)
- **Showcase:**
  - Shows 100% unbroken sequence from Genesis Block (`0000...0000`).
  - Click **Re-verify Chain Now**: real-time calculation validates monotonic sequence progression and cryptographic previous-hash pointers.
- **Audit Log Explorer:**
  - Click **Audit Ledger** (`/audit`).
  - Multi-field filtering by Actor, Action (e.g. `LOGIN_SUCCESS`, `DOCUMENT_UPLOADED`, `EXPORT_PACKAGE_GENERATED`), and Date.
  - Click any row to inspect the canonical JSON payload in the metadata inspector drawer.

---

## 4. Evaluator Q&A Cheat Sheet

| Question                                           | Answer                                                                                                                                                                                                                                                                                                                       |
| :------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why not use Ethereum/Hyperledger?**              | Public blockchains leak transaction timing metadata and require expensive gas. Enterprise Hyperledger introduces unnecessary overhead for unit-level police stations. Our internal SHA-256 hash-chained ledger provides mathematical non-repudiation with gapless sequence locking, 0 gas cost, and sub-millisecond latency. |
| **How does this comply with BSA 2023?**            | Section 63 replaces old Section 65B of the Indian Evidence Act. SDMS automates Section 63(4) conditions: lawful custody record, continuous automated operation logs, byte-exact SHA-256 integrity, and declarant electronic certificate generation.                                                                          |
| **How is malware prevented?**                      | All uploaded binaries stream through ClamAV daemon before saving to MinIO object storage. Malicious files (e.g., EICAR) are quarantined immediately with an audit log alert.                                                                                                                                                 |
| **Can an Admin tamper with logs in the database?** | No. Any update or deletion of an audit row invalidates the SHA-256 hash chaining of all subsequent entries. The `GET /audit/verify-chain` endpoint and Integrity UI will immediately detect and report the exact tampered sequence block.                                                                                    |

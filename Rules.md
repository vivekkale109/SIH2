# Rules.md — AI Coding Rules for SDMS

> **Audience:** Any AI assistant (Claude, Copilot, Cursor, etc.) working on this repo.
> **Read first, every session:** `Memory.md` → `Phases.md` → `Rules.md`.
> If a rule here conflicts with a user request, **stop and ask**. Do not silently break a rule.

---

## 1. Golden Rules

1. **Work on one phase at a time.** Do not build features from later phases.
2. **Follow the Git workflow** in `GIT_WORKFLOW.md` for every change.
3. **Security beats convenience.** This system handles legal evidence.
4. **Never invent.** If requirements are unclear, ask. Do not guess crypto, legal, or permission logic.
5. **Small, reviewable changes.** One concern per commit and per PR.
6. **Update `Memory.md`** at the end of every task.

---

## 2. Approved Tech Stack (use only this)

| Area | Use |
|---|---|
| Frontend | Next.js (App Router), TypeScript (strict), TailwindCSS |
| Backend | NestJS, Node.js, TypeScript (strict) |
| ORM / DB | Prisma, PostgreSQL |
| Storage | MinIO (S3 SDK) |
| Queue | BullMQ + Redis |
| OCR | Tesseract |
| Validation | `class-validator` / `class-transformer` (API), `zod` (web forms) |
| Auth libs | `@nestjs/jwt`, `argon2`, `otplib` (TOTP) |
| Testing | Jest, Supertest, Playwright |
| Lint / Format | ESLint, Prettier |

### Libraries to AVOID
| Avoid | Reason | Use instead |
|---|---|---|
| `moment` | Deprecated, heavy | `date-fns` |
| `bcrypt` (native) | Prefer stronger KDF | `argon2` (Argon2id) |
| `crypto-js` | Unnecessary, weaker | Node built-in `crypto` |
| `request` | Deprecated | `fetch` / `axios` |
| Custom crypto algorithms | Unsafe | Standard algorithms only (SHA-256, AES-256, Ed25519) |
| Random unmaintained npm packages | Supply-chain risk | Ask before adding any new dependency |
| `localStorage` for tokens | XSS risk | httpOnly secure cookies |
| Public blockchain SDKs | Out of scope | Internal hash-chained ledger |
| MD5 / SHA-1 | Broken | SHA-256 minimum |
| `eval`, `Function()`, `dangerouslySetInnerHTML` (unsanitized) | Injection risk | Safe rendering |

**Adding a dependency:** justify it in the PR description (why, size, maintenance status, license). Prefer already-approved packages.

---

## 3. Security Rules (Non-Negotiable)

### 3.1 The AI MUST
- Validate every input (DTOs on API, zod on forms).
- Enforce authorization on **every** endpoint (`JwtGuard` + `RolesGuard` + `PolicyGuard`). Default is **deny**.
- Write an **audit ledger entry** for every mutating action and for every document view/download/share/export.
- Compute and store **SHA-256** for every uploaded file version.
- Use **parameterized queries** only (Prisma). No raw SQL string concatenation.
- Read secrets from environment variables. Provide `.env.example` with placeholders.
- Filter search results through ABAC **before** returning them.
- Use constant-time comparison for hashes, tokens, and signatures.
- Log errors without sensitive data.

### 3.2 The AI MUST NEVER
- Hardcode secrets, keys, passwords, tokens, or real case data.
- Commit `.env`, private keys, real documents, or database dumps.
- Log passwords, tokens, MFA secrets, OCR text of documents, or full document contents.
- Disable TLS checks, CORS restrictions, or auth guards, even "temporarily".
- Add UPDATE or DELETE paths for `AuditLedger` or `DocumentVersion` rows.
- Overwrite a document file. A change is always a **new version**.
- Return stack traces or internal errors to clients.
- Store files on local disk permanently (temp only, then MinIO).
- Skip the malware scan step.
- Weaken a test to make it pass.

### 3.3 Ledger Rules
- Entry hash: `SHA256(prev_hash || canonical_json(payload))`.
- Canonical JSON = sorted keys, no whitespace.
- Writes go through **one** `AuditService.record()` method only. No other code inserts into the ledger.
- Sequence numbers are gapless and monotonic (use a transaction with a row lock).

---

## 4. Error Handling Rules

| Rule | Detail |
|---|---|
| Use NestJS exceptions | `BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `NotFoundException`, etc. |
| Global exception filter | Converts all errors to `{ statusCode, error, message, requestId }` |
| No silent catches | Never write empty `catch {}`. Log and rethrow or handle deliberately. |
| Fail closed | On auth or policy errors, deny. On integrity errors, flag and alert. |
| Worker jobs | Retry with backoff (max 3), then mark failed and record an audit event. Never lose a document because OCR failed. |
| Client messages | Generic for auth errors ("Invalid credentials"), specific for validation errors. |
| Frontend | Every async call has loading, error, and empty states. Use an error boundary per route group. |
| Transactions | Multi-step DB writes (document plus version plus ledger) must be in one transaction. |

---

## 5. Code Standards

### General
- TypeScript `strict: true`. No `any` (use `unknown` and narrow). No `@ts-ignore` without a comment explaining why.
- Functions are small and single-purpose. Prefer pure functions in `utils/`.
- Names: `camelCase` variables and functions, `PascalCase` classes and components, `SCREAMING_SNAKE` constants, `kebab-case` files.
- No dead code, no commented-out code, no `console.log` (use the Nest `Logger`).
- Each backend module has: `module`, `controller`, `service`, `dto/`, and `*.spec.ts`.
- Controllers stay thin. Business logic lives in services.
- Shared types live in `packages/shared-types`. Do not duplicate them.

### Frontend
- Server Components by default. Use `"use client"` only when needed.
- Use design tokens from `Design.md`. No arbitrary hex colors in components.
- Accessible: semantic HTML, labels on inputs, keyboard focus, `aria-*` where needed.
- No business rules in the UI. The UI hides things for UX, the **API enforces** them.

### Database
- All schema changes go through Prisma migrations. Never edit the DB by hand.
- Every table has `id`, `createdAt`, `updatedAt` (except the append-only ledger, which has no `updatedAt`).
- Add indexes for foreign keys and search columns.

---

## 6. Testing Rules

| Rule | Detail |
|---|---|
| New code needs tests | Services need unit tests, endpoints need Supertest tests |
| Security-critical paths | Auth, RBAC/ABAC, hashing, ledger chain, share expiry, export signing need **mandatory** tests |
| Negative tests | Test unauthorized, expired, tampered, and malformed cases, not only the happy path |
| Tamper test | Modify one ledger row or file and assert verification fails |
| CI must pass | Lint, type-check, tests, and build before a PR is merged |
| Test data | Fake data only. Never real names, case numbers, or documents. |

---

## 7. What the AI Should and Shouldn't Do

### Should
- Read `Memory.md` and `Phases.md` before starting.
- State the plan briefly before large changes.
- Ask when a requirement is ambiguous.
- Point out security concerns or better approaches.
- Keep the README and docs in sync with code.
- Add `TODO(phase-N):` for deliberately deferred work.

### Should Not
- Refactor unrelated code while doing a task.
- Change folder structure without updating `Architecture.md`.
- Add features not in `PRD.md` or the current phase.
- Auto-approve or auto-merge its own PR.
- Make legal claims (for example "this is admissible in court"). Write "aligned with BSA 2023 §61–63" only.
- Present AI-generated OCR or classification as final. It must show a "needs human verification" state.

---

## 8. Git Rules (summary; full detail in `GIT_WORKFLOW.md`)

1. Never commit directly to `main` or `develop`.
2. Branch naming: `feature/<phase>-<short-name>`, `fix/<short-name>`, `chore/<short-name>`, `docs/<short-name>`.
3. Commit messages follow **Conventional Commits**: `feat(auth): add TOTP verification`.
4. One logical change per commit. Commit early and often.
5. Open a PR into `develop`, using the PR template. At least 1 human review is required.
6. Do not force-push to shared branches.
7. Never commit secrets. Run the pre-commit hook (lint plus secret scan).

---

## 9. Definition of Done (per task)

- [ ] Works as described in the PRD/phase
- [ ] Types, lint, and tests pass
- [ ] Security rules checked (authz, audit, validation)
- [ ] Error and loading states handled
- [ ] Docs updated if behavior or structure changed
- [ ] `Memory.md` updated
- [ ] Committed on a feature branch with a conventional commit, PR opened

---

## 10. When Unsure
**Stop. Ask. Do not guess.** In this project a wrong guess about access control or integrity can undermine evidence.

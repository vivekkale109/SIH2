# Design.md — SDMS Visual Design System

> These are proposed defaults. The deck does not specify a palette, so change any token here and it becomes the single source of truth. Components must use tokens, never raw hex values.

## 1. Design Principles

| Principle | Meaning |
|---|---|
| **Trust and clarity** | This is legal evidence software. The UI should feel calm, serious, and precise. |
| **Security visible** | Show integrity status (verified, tampered), access level, and watermarks clearly. |
| **Dense but readable** | Investigators work with lots of data. Prefer compact tables with strong hierarchy. |
| **Never rely on color alone** | Every status has an icon and a text label as well as a color. |
| **Accessible** | WCAG 2.1 AA contrast, keyboard navigation, visible focus rings. |

---

## 2. Theme

Two themes: **Light (default)** and **Dark**. Implemented with CSS variables and Tailwind's `dark` class.

---

## 3. Color Palette

### 3.1 Brand and Neutrals

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-primary` | `#1E3A8A` (navy) | `#60A5FA` | Primary buttons, links, active nav |
| `--color-primary-hover` | `#172554` | `#93C5FD` | Hover state |
| `--color-accent` | `#0D9488` (teal) | `#2DD4BF` | Secondary highlights, integrity OK |
| `--color-bg` | `#F8FAFC` | `#0B1120` | Page background |
| `--color-surface` | `#FFFFFF` | `#111827` | Cards, panels, modals |
| `--color-surface-alt` | `#F1F5F9` | `#1F2937` | Table stripes, sidebar |
| `--color-border` | `#E2E8F0` | `#334155` | Dividers, inputs |
| `--color-text` | `#0F172A` | `#F1F5F9` | Body text |
| `--color-text-muted` | `#475569` | `#94A3B8` | Secondary text |

### 3.2 Semantic / Status

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-success` | `#15803D` | `#4ADE80` | Verified, integrity intact, OCR done |
| `--color-warning` | `#B45309` | `#FBBF24` | Needs review, share expiring |
| `--color-danger` | `#B91C1C` | `#F87171` | Tamper detected, revoked, failed |
| `--color-info` | `#0369A1` | `#38BDF8` | Processing, informational |

### 3.3 Classification Badges

| Level | Background | Text |
|---|---|---|
| Public | `#DCFCE7` | `#166534` |
| Restricted | `#DBEAFE` | `#1E40AF` |
| Confidential | `#FEF3C7` | `#92400E` |
| Secret | `#FEE2E2` | `#991B1B` |

### 3.4 Tailwind Config Snippet
```ts
// tailwind.config.ts
export default {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        accent: "var(--color-accent)",
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-alt": "var(--color-surface-alt)",
        border: "var(--color-border)",
        text: "var(--color-text)",
        muted: "var(--color-text-muted)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        info: "var(--color-info)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: { md: "8px", lg: "12px" },
    },
  },
};
```

---

## 4. Typography

| Role | Font | Fallback |
|---|---|---|
| UI / Body / Headings | **Inter** | `system-ui, sans-serif` |
| Hashes, IDs, code, ledger entries | **JetBrains Mono** | `ui-monospace, monospace` |

Load fonts with `next/font` (self-hosted, no external CDN calls, which suits on-prem deployments).

### Type Scale

| Token | Size / Line height | Weight | Use |
|---|---|---|---|
| `display` | 36 / 44 | 700 | Landing / login title |
| `h1` | 28 / 36 | 700 | Page titles |
| `h2` | 22 / 30 | 600 | Section titles |
| `h3` | 18 / 26 | 600 | Card titles |
| `body` | 16 / 24 | 400 | Default text |
| `body-sm` | 14 / 20 | 400 | Tables, helper text |
| `caption` | 12 / 16 | 500 | Badges, labels, timestamps |
| `mono-sm` | 13 / 20 | 400 | SHA-256 hashes (truncate as `a1b2c3…f9e8` with a copy button) |

---

## 5. Spacing, Radius, Elevation

| Item | Value |
|---|---|
| Spacing scale | 4px base: 4, 8, 12, 16, 24, 32, 48, 64 |
| Radius | Inputs and buttons 8px, cards 12px, badges full |
| Shadows | `sm` for cards, `md` for dropdowns, `lg` for modals |
| Max content width | 1280px |
| Sidebar width | 260px (collapsible to 72px) |

---

## 6. Layout

```
┌───────────────────────────────────────────────────────┐
│ Topbar: Unit name │ Global search │ Notifications │ User│
├──────────┬────────────────────────────────────────────┤
│ Sidebar  │  Page header (title + primary action)       │
│ (role-   ├────────────────────────────────────────────┤
│  aware   │  Content: cards / tables / detail panels    │
│  nav)    │                                              │
└──────────┴────────────────────────────────────────────┘
```

Breakpoints: `sm 640`, `md 768`, `lg 1024`, `xl 1280`. Sidebar becomes a drawer below `lg`.

### Navigation by Role

| Role | Menu |
|---|---|
| Admin | Dashboard, Users, Departments, Policies, Audit, Settings |
| Investigator | Dashboard, My Cases, Upload, Search, Shared with me |
| Prosecutor | Dashboard, Cases, Search, Exports |
| Court Officer | Dashboard, Shared with me, Verify Export |
| Records Manager | Dashboard, Records, Retention, Classification |
| Auditor | Dashboard, Audit Log, Integrity Report |

---

## 7. Components

| Component | Notes |
|---|---|
| **Button** | Variants: primary, secondary, ghost, danger. Sizes: sm, md, lg. Loading state with spinner. |
| **Input / Select / Textarea** | Visible label, helper and error text, 2px focus ring in `primary`. |
| **Data Table** | Sticky header, sortable columns, row hover, pagination, empty state. |
| **Badge** | Status and classification (see 3.2 and 3.3). Icon plus text. |
| **Card** | Surface background, border, `sm` shadow. |
| **Modal** | Focus trap, ESC to close, re-auth modal variant for sensitive actions. |
| **Toast** | Success, error, and info with auto-dismiss. Errors stay until closed. |
| **File Dropzone** | Drag and drop, progress bar, scan status steps. |
| **Pipeline Stepper** | Upload → Scan → Hash → OCR → Classify → Index → Stored. Shows current step. |
| **Hash Display** | Mono font, truncated, copy button, full hash on hover. |
| **Integrity Indicator** | Green shield "Verified" or red shield "Tampered" with last-checked time. |
| **Ledger Timeline** | Vertical list of audit events with actor, action, time, and hash link. |
| **Watermark Overlay** | Diagonal, low-opacity text (user, timestamp, case ID) over the document viewer. |
| **Share Expiry Chip** | Shows time remaining and turns warning color under 24h. |

### Key Screens
1. Login and MFA
2. Role Dashboard
3. Case List and Case Detail (tabs: Documents, Members, Timeline, Shares, Exports)
4. Document Viewer (preview, OCR text side panel, version history, verify integrity)
5. Search Results
6. Share Dialog
7. Export and Verify
8. Audit Log and Integrity Report

---

## 8. Iconography
- Library: **lucide-react** (consistent line icons, 1.5px stroke)
- Key icons: `ShieldCheck` (verified), `ShieldAlert` (tampered), `Lock`, `FileText`, `Search`, `Share2`, `Clock` (expiry), `Fingerprint` (hash), `ScrollText` (audit), `Stamp` (signed export)

---

## 9. Motion
- Subtle only: 150–200ms ease-out for hover, dropdowns, and toasts.
- Respect `prefers-reduced-motion`.
- No decorative animations on evidence or integrity screens.

---

## 10. Accessibility Checklist
- [ ] Text contrast ≥ 4.5:1 (3:1 for large text)
- [ ] All interactive elements reachable by keyboard, visible focus ring
- [ ] Form fields have labels; errors are announced (`aria-live`)
- [ ] Status never conveyed by color alone
- [ ] Tables use proper `<th scope>`
- [ ] Modals trap focus and restore it on close

---

## 11. Tone of Voice (UI copy)
- Plain, direct, formal. No slang.
- Error messages say what happened and what to do next.
- Sensitive actions state consequences: "This share will expire on 12 Mar 2026, 18:00 and can be revoked at any time."
- Wording for AI results: "Suggested by OCR, needs human verification".

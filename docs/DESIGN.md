# Office Finance Management System — Design & Implementation Plan

> Status: **Design locked (brainstorming complete)** · Date: 2026-07-02
> Stack: **React (Vite, TS) + NestJS (TS) + PostgreSQL + Redis/BullMQ**, self-hosted via Docker Compose, Turborepo monorepo.

---

## 1. Understanding Summary

A production-grade, **self-hosted Office Finance Management System** with one login portal and two modules over shared masters:

- **Invoice Generation** — per-company invoicing with independent, never-duplicating sequences, automatic tax/total calculation, and a pixel-accurate PDF that replicates an uploaded template.
- **Office Expense Management** — governed lifecycle (Draft → Submitted → Review → Approved/Rejected → Paid and/or Reimbursed → Closed) with OCR-assisted capture and multi-channel intake.

One owning organization operates **multiple registered companies** ("multi-company" is a data dimension, not tenant isolation). Three roles — **Super Admin, Office Admin, User** — with a **dynamic permission system** enforced on both frontend (menu visibility) and backend (policy guards). **Nothing is hard-deleted** (soft delete + immutable audit log). Extensible for future modules (PO, Quotations, Payments, Payroll, Inventory, Projects, Assets, CRM).

### Non-Goals (this phase)
- No multi-org SaaS tenancy · No SSO initially (JWT only, SSO-ready) · WhatsApp intake deferred behind Telegram/Email · No cloud OCR by default · No live FX conversion (schema-ready, off by default).

---

## 2. Assumptions

1. **ORM = Prisma** (migrations, soft-delete middleware, type-safe).
2. **Jobs = BullMQ + Redis** (OCR, email polling, PDF render, notifications).
3. **Storage = local filesystem** behind a `StorageService` interface (swappable to S3/MinIO).
4. **Single organization**; companies are a filter dimension.
5. **FX**: amounts kept in entered currency; dashboards group *by* currency. Optional `fx_rates` table included for later consolidation.
6. **Email intake = polled IMAP mailbox** (cheapest), not a paid inbound-email API.
7. **Notifications**: Email + Telegram + in-app first; WhatsApp later.
8. **Approval = single Office Admin step** (configurable multi-level later).

---

## 3. Decision Log

| # | Decision | Alternatives | Why |
|---|---|---|---|
| 1 | React (TS) frontend | Angular, Vue | User preference; ecosystem |
| 2 | NestJS backend | Express, .NET, Django | Enterprise DI/modules/guards; shared TS types |
| 3 | PostgreSQL | MySQL, Mongo | Transactions, JSONB, relational fit |
| 4 | Self-hosted Docker Compose | Cloud, hybrid | Lowest cost |
| 5 | Modular monolith + monorepo | Polyrepo, microservices | Shared types, single deploy, event-driven without distributed pain |
| 6 | Invoice PDF via HTML/CSS → Puppeteer | pdfmake/react-pdf | Pixel-accurate, editable |
| 7 | Self-managed JWT (access+refresh, argon2) | SSO, Keycloak/Auth0 | No cost, full control; SSO-ready |
| 8 | Tesseract + LLM-vision fallback | Cloud OCR only | Cost-first with accuracy escape hatch |
| 9 | Telegram + Email intake first | WhatsApp-first | Free/cheap, official APIs |
| 10 | Prisma ORM | TypeORM | DX, migrations, middleware |
| 11 | Worker shares api codebase | Separate service | One deployable, reuses services |
| 12 | Reimbursement tracked separately from vendor payment | Single "paid" flag | Admin must confirm employee repaid |
| 13 | FX: group-by-currency, schema-ready | Auto-convert now | Avoid rate maintenance/liability at small scale |

---

## 4. Technology Stack (Recommended)

| Concern | Choice |
|---|---|
| Frontend | React 18 + Vite + TypeScript, React Router, **TanStack Query** (server state), **Zustand** (UI state), **React Hook Form + Zod**, **Tailwind + shadcn/ui** (dark mode built-in), Recharts (dashboards) |
| Backend | NestJS + TypeScript, Prisma, class-validator, Passport-JWT, `@nestjs/event-emitter`, `@nestjs/bullmq` |
| DB / Cache | PostgreSQL 16, Redis 7 |
| Jobs | BullMQ (worker app) |
| PDF | Puppeteer (headless Chromium) rendering an HTML/CSS template |
| OCR | Tesseract.js / native tesseract; OpenAI/Claude Vision fallback for handwriting/low-confidence |
| Files | Local volume via `StorageService` (S3/MinIO adapter later) |
| Auth | JWT access (15m) + refresh (7d, rotating), argon2id hashing |
| Intake | Telegram Bot API (long-poll/webhook), IMAP email poll, WhatsApp Cloud API (Phase 5) |
| Search | Postgres full-text (`tsvector`) now; OpenSearch adapter later |
| Infra | Docker Compose + nginx; GitHub Actions CI |
| Observability | pino logs, Sentry (optional), `/health` endpoints |

---

## 5. System Architecture

**Monorepo (Turborepo):**
```
/apps/api        NestJS HTTP API
/apps/web        React SPA (Vite)
/apps/worker     BullMQ processors (imports api modules)
/packages/types  shared DTOs, enums, permission keys
/packages/config eslint/tsconfig
/infra           docker-compose, Dockerfiles, nginx
```

**Runtime (single VPS):**
```
nginx ─┬─ serves web static
       └─ proxies /api → api
api ── postgres, redis, /storage volume
worker ── redis, postgres, /storage volume
```

**Backend modules** (each = controller + service + repository + policies + events):

| Layer | Modules |
|---|---|
| Platform | auth, users, roles, permissions, audit, notifications, storage, search |
| Masters | companies, customers, tax, currency, invoice-settings, invoice-templates |
| Invoicing | invoices, invoice-items |
| Expenses | expenses, expense-categories, vendors, reimbursements |
| Intake/AI | ocr, intake (telegram/email/whatsapp adapters) |
| Reporting | reports, dashboard |

**Cross-cutting providers:** `AuthGuard` (JWT) → `PermissionsGuard` (policy) → `AuditInterceptor` (who/what/when/IP/device) → `TransactionInterceptor` (DB tx on writes). Prisma **soft-delete middleware** blocks hard deletes globally. A global **EventBus**: domain modules emit events; `audit` + `notifications` subscribe (event-driven, decoupled).

---

## 6. Data Model (Core Tables)

> All tables carry: `id (uuid)`, `created_at`, `updated_at`, `deleted_at (nullable)`, and mutation-audit via the audit log. Money stored as `numeric(18,4)` + `currency_code`.

**Identity & Access**
- `users` (email, password_hash, name, is_active, last_login_at)
- `roles` (name, is_system) — SuperAdmin, OfficeAdmin, User (+ custom)
- `permissions` (key, label, group) — see §7
- `role_permissions` (role_id, permission_id)
- `user_roles` (user_id, role_id)
- `user_company_access` (user_id, company_id, scope) — which companies a user sees
- `resource_grants` (user_id, resource_type, resource_id, permission) — explicit per-record shares (visibility rules)

**Masters**
- `companies` (name, logo_path, address, tax_number(GST/VAT), country, currency_code, invoice_prefix, invoice_number_format, tax_rules JSONB)
- `customers` (company_id, name, address, tax_number, email, currency_code)
- `taxes` (company_id, name, rate, type[GST/VAT/…], is_compound)
- `currencies` (code, symbol, name), `fx_rates` (base, quote, rate, as_of) *(optional/off)*
- `expense_categories` (company_id, name), `vendors` (company_id, name, tax_number)

**Invoicing**
- `invoice_settings` (company_id, template_id, default_tax_id, terms, notes)
- `invoice_templates` (company_id, name, html, css, is_default)
- `invoice_sequences` (company_id, year, month, last_number) — **unique(company_id, year, month)**; atomic increment
- `invoices` (company_id, customer_id, invoice_number, invoice_date, currency_code, subtotal, tax_total, grand_total, notes, status, created_by, approved_by, approved_at)
- `invoice_items` (invoice_id, description, qty, unit_price, tax_id, line_total)

**Expenses**
- `expenses` (company_id, category_id, vendor_id, expense_date, amount, currency_code, tax_id, description, payment_type[COMPANY_PAID/REIMBURSABLE], status, payment_status, reimbursement_status, submitted_by, approved_by, approved_at, paid_at)
- `expense_files` (expense_id, storage_key, kind[IMAGE/PDF], original_name, size)
- `reimbursements` (expense_id, payee_user_id, amount, method, reimbursed_by, reimbursed_at, note)
- `ocr_results` (expense_file_id, engine, confidence, raw_text, extracted JSONB, status)
- `intake_messages` (channel, sender_ref, attachment_key, status, created_expense_id)

**Platform**
- `audit_logs` (actor_id, action, resource_type, resource_id, before JSONB, after JSONB, ip, device, created_at) — **append-only**
- `notifications` (user_id, type, channel, payload JSONB, read_at)

**Key ER relationships:** company 1—N customers/invoices/expenses/taxes/templates; invoice 1—N items; expense 1—N files, 1—N ocr_results, 0/1 reimbursement; user N—N roles; role N—N permissions; user N—N companies (access).

---

## 7. Permission Matrix

**Permission keys** (dynamic, seeded): `invoice.generate`, `invoice.edit`, `invoice.delete`, `invoice.print`, `invoice.view_own`, `invoice.view_company`, `invoice.view_all`, `expense.create`, `expense.approve`, `expense.reject`, `expense.mark_paid`, `expense.reimburse`, `expense.view_own`, `expense.view_company`, `expense.view_all`, `export`, `masters.manage`, `dashboard.view`, `reports.view`, `ocr.use`, `integrations.manage`, `settings.manage`.

| Permission | Super Admin | Office Admin | User (default) |
|---|:--:|:--:|:--:|
| masters.manage / settings / integrations | ✅ | ⛔ | ⛔ |
| invoice.generate/edit/delete/print | ✅ | grant | grant |
| invoice.view_own | ✅ | ✅ | ✅ |
| invoice.view_company / view_all | ✅ | grant | grant |
| expense.create / view_own | ✅ | ✅ | ✅ |
| expense.view_company | ✅ | ✅ | grant |
| expense.view_all | ✅ | ⛔ | grant |
| expense.approve/reject/mark_paid/reimburse | ✅ | ✅ | ⛔ |
| dashboard.view / reports.view / export | ✅ | ✅ | grant |
| ocr.use | ✅ | ✅ | ✅ |

**Visibility rules (enforced in query layer, not just UI):**
- **Invoices:** creator sees own; others only via `resource_grants` or `invoice.view_company/all`; Super Admin always.
- **Expenses:** creator + Office Admin (same company) + Super Admin always; other users only via grant.

Both **frontend** (hide menus/actions) and **backend** (`PermissionsGuard` + scoped repository queries) enforce every rule. Backend is the source of truth.

---

## 8. API Design (REST, versioned `/api/v1`)

Conventions: JWT bearer; standard list params `?page&limit&sort&q&filters`; envelope `{ data, meta }`; problem+json errors.

```
POST   /auth/login | /auth/refresh | /auth/logout   /auth/me
CRUD   /companies  /customers  /taxes  /currencies  /expense-categories  /vendors
GET/PUT /companies/:id/invoice-settings
CRUD   /invoice-templates
POST   /invoices            (draft; server assigns number on finalize)
GET    /invoices?company&customer&status&date_from&date_to
GET/PUT/DELETE /invoices/:id           (soft delete)
POST   /invoices/:id/finalize | /approve | /pdf(download) | /print
CRUD   /expenses            (+ /submit /approve /reject /mark-paid /reimburse /close)
POST   /expenses/:id/files    GET /expenses/:id/files/:fileId
POST   /ocr/scan            (fileId → extracted fields)
GET    /intake/drafts       (My Draft Expenses)
GET    /dashboard/summary?role&company&date_range
GET    /reports/:type?...  &format=pdf|excel|csv
CRUD   /users /roles /permissions   POST /users/:id/roles  /grants
GET    /audit-logs?resource_type&resource_id
GET    /notifications      POST /notifications/:id/read
GET    /search?q           (global search)
```

State-changing invoice/expense endpoints run inside DB transactions and emit domain events (audit + notify).

---

## 9. Invoice Numbering (correctness-critical)

Format from `companies.invoice_number_format` (default `YYMMNNN`), prefix optional. On **finalize**:
```sql
BEGIN;
INSERT INTO invoice_sequences (company_id, year, month, last_number)
VALUES ($c,$y,$m,1)
ON CONFLICT (company_id, year, month)
DO UPDATE SET last_number = invoice_sequences.last_number + 1
RETURNING last_number;      -- atomic, race-safe
-- number = prefix || YY || MM || zeroPad(last_number,3)
COMMIT;
```
`unique(company_id, invoice_number)` as a hard backstop. Sequence resets automatically each month (new row). Numbers assigned only at finalize (drafts have none) so gaps aren't created by abandoned drafts.

---

## 10. Expense Workflow & Reimbursement

```
Draft → Submitted → (Office Admin) Review → Approved / Rejected
Approved →  payment_status: Paid              (COMPANY_PAID)
        →  reimbursement_status: Reimbursed   (REIMBURSABLE)
→ Closed
```
- `payment_type` chosen at creation: **COMPANY_PAID** (company paid vendor) or **REIMBURSABLE** (employee paid out of pocket).
- Office Admin actions: approve/reject; `mark-paid` (vendor settled); **`reimburse`** (records payee, amount, method, reimbursed_by/at) — lets admin confirm each uploader was repaid.
- Every transition writes an `audit_log` row and emits an event (notify submitter).

---

## 11. OCR Comparison & Recommendation

| Engine | Accuracy (printed) | Handwriting | Cost | Ease | Verdict |
|---|---|---|---|---|---|
| **Tesseract** | Good | Weak | **Free** | Easy (self-host) | ✅ Primary |
| OpenAI/Claude Vision | Excellent | **Strong** | Low per-call | Easy (API) | ✅ Fallback for low-confidence/handwritten |
| Google Vision | Excellent | Strong | $$ | Easy | Optional cloud upgrade |
| AWS Textract | Excellent (tables) | Medium | $$ | Medium | Best if heavy table extraction |
| Azure OCR | Excellent | Strong | $$ | Easy | Alternative to Google |

**Recommendation:** **Tesseract first**, with an automatic **LLM-vision fallback** when Tesseract confidence is low or the doc is handwritten. Best cost/accuracy balance for self-hosted. Engine is behind an `OcrProvider` interface → swap/add cloud engines with no code churn.

---

## 12. Messaging Integration Comparison

| Channel | Cost | Ease | Scalability | Official API | Verdict |
|---|---|---|---|---|---|
| **Telegram Bot** | Free | **Easy** | High | ✅ | ✅ Phase 4 (first) |
| **Email (IMAP poll)** | Free* | Easy | Med | ✅ | ✅ Phase 4 (first) |
| WhatsApp Cloud API | Low (per-conv) | Medium | High | ✅ (Meta) | Phase 5 (deferred) |
| SMS/others | $$ | — | — | — | ❌ Not needed |

Intake flow (all channels): **download attachment → store file → run OCR → create Draft Expense → notify sender**. User later sees **"My Draft Expenses"** → review/edit/submit. Each channel is an adapter behind a common `IntakeAdapter` interface.

---

## 13. Bill Storage Strategy

- **No month-folder organization.** Files stored by opaque key (e.g. `/storage/{uuid}`); metadata (year/month/company/expense) lives in DB.
- UI groups **Year → Month → Expense List → Bills** via queries, not folders.
- `StorageService` interface (`put/get/delete/url`) with a `LocalStorage` impl now; `S3Storage`/`MinIO` later — no call-site changes.

---

## 14. Dashboards & Reports

**Dashboards (role-scoped):** Super Admin (all companies), Office Admin (their company), User (own). Widgets: Monthly Expenses, Invoice Revenue, Pending Approvals, Paid/Reimbursed, Expense Categories, Company-wise, Country-wise, Currency-wise, Top Customers, Outstanding Payments.

**Reports:** Invoice, Expense, Monthly, Company, Customer, Tax, Currency, Outstanding — each exportable to **PDF / Excel / CSV** (`export` permission required). Server-side generation via BullMQ for large exports.

---

## 15. Notifications

Channels: **In-App** (always), **Email**, **Telegram**; WhatsApp later. Driven by domain events (expense submitted/approved/rejected/paid/reimbursed, invoice approved, intake draft created). Per-user preferences table (Phase 6).

---

## 16. UI Flow / Wireframes (textual)

- **Login** → role-aware redirect to dashboard.
- **App shell:** left nav (permission-filtered), top bar (global search, company switcher, dark-mode toggle, notifications, profile).
- **Invoices:** list (filters + pagination) → create/edit (customer, line items with live calc, tax dropdown, live grand total) → preview (template render) → finalize/approve/print/download → activity timeline.
- **Expenses:** list grouped Year→Month → create (upload bill → OCR prefill → edit) → submit → (admin) review queue → approve/reject/pay/reimburse → timeline.
- **My Draft Expenses:** inbox of intake-created drafts to review/submit.
- **Masters/Admin:** companies, customers, taxes, currencies, templates, users, roles, permissions, integrations, settings.
- **Reports:** pick type + filters → export.
- Cross-cutting: dark mode, global search, advanced filters, pagination, activity timeline on every record.

---

## 17. Folder Structure (backend module example)

```
apps/api/src/
  main.ts  app.module.ts
  common/            guards, interceptors, filters, prisma, storage, events
  modules/
    auth/  users/  roles/  permissions/  audit/  notifications/
    companies/ customers/ tax/ currency/ invoice-settings/ invoice-templates/
    invoices/  expenses/  reimbursements/  ocr/  intake/  reports/  dashboard/
  # each module: *.controller.ts *.service.ts *.repository.ts *.policy.ts dto/ events/
apps/web/src/
  app/ (router, layout)  features/{invoices,expenses,masters,dashboard,auth}
  components/ui  lib/{api,query,auth}  hooks  store  styles
```

---

## 18. Security Recommendations

- argon2id password hashing; rotating refresh tokens; short-lived access tokens; token revocation list in Redis.
- **Backend enforces every permission** (never trust UI); scoped queries for visibility.
- Input validation (class-validator/Zod) on all DTOs; parameterized queries via Prisma.
- Rate limiting (`@nestjs/throttler`) on auth + OCR; Helmet headers; CORS allowlist.
- File uploads: type/size validation, magic-byte check, store outside webroot, virus-scan hook (ClamAV) optional.
- Audit log append-only; PII minimization; secrets via env/`.env` + Docker secrets.
- HTTPS via nginx + Let's Encrypt.

---

## 19. Backup Strategy

- **Postgres:** nightly `pg_dump` + WAL archiving; 30-day retention; monthly off-site copy; **test restores quarterly**.
- **Files:** nightly `restic`/`rclone` snapshot of `/storage` to off-site/object store.
- **Redis:** ephemeral (jobs) — not backed up; jobs idempotent/retryable.
- Documented one-command restore in `/infra`.

---

## 20. Deployment Strategy

- **Docker Compose** on a VPS: services `api`, `worker`, `web(nginx)`, `postgres`, `redis`.
- **CI (GitHub Actions):** lint → typecheck → test → build images → push → deploy (compose pull/up).
- Prisma migrations run on release (`migrate deploy`) with a pre-deploy DB backup.
- `.env`-driven config; `/health` + `/ready` endpoints; nginx TLS termination; log rotation.
- Zero-downtime not required at this scale (brief restart acceptable); revisit with blue/green later.

---

## 21. Risks & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Invoice number duplication/race | High | Atomic `ON CONFLICT` increment + unique constraint + tx |
| OCR accuracy (handwriting) | Med | LLM-vision fallback; always human-review drafts |
| Permission bypass | High | Backend-enforced guards + scoped queries; tests per rule |
| File storage growth | Med | Storage abstraction; move to object store; retention policy |
| Single-VPS failure | Med | Automated backups + tested restore; upgrade path to managed DB |
| Puppeteer resource use | Med | Render in worker, pooled browser, timeouts |
| Scope creep (future modules) | Med | Modular boundaries + event bus keep additions non-breaking |
| WhatsApp API approval delays | Low | Deferred to Phase 5; Telegram/Email cover intake first |

---

## 22. Suggested Improvements (beyond spec)

- **Company switcher** + per-user company access scoping (cleaner than global filters).
- **Reimbursement ledger** view (who is owed / has been repaid) — natural extension of decision #12.
- **Recurring invoices** and **invoice→payment reconciliation** (Phase 7+, aligns with future Payments module).
- **Optimistic-lock (`updated_at`) on edits** to prevent lost updates.
- **Idempotency keys** on intake to avoid duplicate drafts from resent messages.
- **Number-format validator** to prevent misconfigured company formats.

---

## 23. Implementation Roadmap & Phases

**Phase 0 — Foundation:** monorepo, Docker Compose, Postgres/Redis, NestJS+Prisma skeleton, React shell (Tailwind/shadcn, dark mode, router), CI, health checks, seed script.

**Phase 1 — Auth & RBAC:** users/roles/permissions, JWT+refresh, guards, permission seeding, permission-filtered nav, user/role admin UI, audit interceptor.

**Phase 2 — Masters:** companies (logo, tax rules, invoice format), customers, taxes, currencies, categories, vendors, invoice settings/templates. CRUD + validation + soft delete.

**Phase 3 — Invoicing:** invoice CRUD, line items + live calc, atomic numbering, template→HTML/CSS→PDF (Puppeteer, in worker), finalize/approve/print/download, visibility rules, activity timeline.

**Phase 4 — Expenses + OCR + Intake (Telegram/Email):** expense lifecycle incl. reimbursement, file uploads, Tesseract+LLM fallback OCR, Telegram + IMAP intake → draft expenses, "My Draft Expenses".

**Phase 5 — Dashboards, Reports, Notifications:** role dashboards, all report types + PDF/Excel/CSV export, email/telegram/in-app notifications; WhatsApp intake + notifications.

**Phase 6 — Hardening & Ops:** global search, advanced filters everywhere, rate limiting, backups + restore drill, notification preferences, polish, load test.

**Phase 7+ (Future):** Purchase Orders, Quotations, Payments/reconciliation, Payroll, Inventory, Projects, Assets, CRM — added as new modules via the event bus, no core refactor.

---

## 24. Deliverables Map (from the spec)

Requirements(§4,§1), Feature List(§4–§16), Module Hierarchy(§5), User Flows(§16), DB Schema+ER(§6), API Spec(§8), Folder Structure(§17), Permission Matrix(§7), Wireframes(§16), Roadmap+Phases(§23), Risks(§21), Improvements(§22), Tech Stack(§4), OCR Comparison(§11), Messaging Comparison(§12), Security(§18), Backup(§19), Deployment(§20). ✅ All 20 covered.

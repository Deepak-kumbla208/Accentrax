# Implementation Plan — Office Finance Management System

> Companion to [DESIGN.md](DESIGN.md). Granular, checkable task breakdown per phase.
> Stack: React (Vite/TS) + NestJS (TS) + PostgreSQL + Redis/BullMQ · Turborepo · Docker Compose.
> Convention: each phase ends **green** — lint, typecheck, tests, and a working vertical slice.

---

## Legend
- `[ ]` todo · `[~]` in progress · `[x]` done
- **DoD** = Definition of Done (must all be true to close the phase)

---

## Phase 0 — Foundation & Tooling

**Goal:** Empty-but-runnable monorepo with API, web, worker, DB, and CI wired together.

- [ ] Init Turborepo: `apps/{api,web,worker}`, `packages/{types,config}`
- [ ] Root tooling: pnpm workspaces, shared `tsconfig`, ESLint + Prettier, `.editorconfig`
- [ ] `apps/api`: NestJS skeleton, `ConfigModule` (env schema via Zod), `/health` + `/ready`
- [ ] Prisma: connect Postgres, first migration (empty), `prisma generate`, seed script stub
- [ ] Global infra providers: `PrismaService`, soft-delete middleware, `AllExceptionsFilter`, pino logger
- [ ] `apps/web`: Vite + React + TS, Tailwind + shadcn/ui, dark-mode toggle, React Router shell, TanStack Query + axios client, app layout (nav + topbar placeholders)
- [ ] `apps/worker`: BullMQ bootstrap, connects Redis, sample job round-trips
- [ ] `packages/types`: shared enums (roles, permission keys, statuses), API envelope types
- [ ] `infra/`: `docker-compose.yml` (api, worker, web/nginx, postgres, redis), Dockerfiles, `.env.example`, nginx config
- [ ] CI (GitHub Actions): install → lint → typecheck → test → build
- [ ] `README` dev setup: `docker compose up`, migrate, seed, run

**DoD:** `docker compose up` serves the React shell through nginx, API `/health` returns ok, worker processes a test job, CI passes.

---

## Phase 1 — Auth & RBAC

**Goal:** Secure login + dynamic permission enforcement (backend + frontend).

**Backend**
- [ ] Schema: `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `user_company_access`, `resource_grants`
- [ ] Seed: 3 system roles + all permission keys (§7) + a Super Admin user
- [ ] `auth`: register(admin-only)/login/refresh/logout/me; argon2id; JWT access(15m)+rotating refresh(7d); refresh revocation list in Redis
- [ ] `AuthGuard` (JWT) + `PermissionsGuard` (`@RequirePermissions('key')` decorator)
- [ ] `AuditInterceptor` — capture actor/action/resource/before/after/ip/device on mutations → `audit_logs`
- [ ] `users`/`roles`/`permissions` CRUD (permission-gated); assign roles, company access, resource grants
- [ ] `@nestjs/throttler` rate limit on `/auth/*`

**Frontend**
- [ ] Login page → token storage (httpOnly cookie or memory + refresh), auth context
- [ ] Route guards + permission-aware nav (hide menus without permission)
- [ ] `usePermissions()` hook; `<Can permission="...">` component
- [ ] Admin UI: users list/create, role editor (toggle permissions), grants

**Tests**
- [ ] Unit: permission guard allow/deny matrix
- [ ] E2E: login → refresh → protected route; each visibility rule

**DoD:** A non-Super-Admin user is blocked (API + UI) from any action lacking its permission; all auth flows tested; every mutation writes an audit row.

---

## Phase 2 — Common Masters

**Goal:** All shared master data manageable and validated.

- [ ] Schema: `companies` (logo_path, address, tax_number, country, currency_code, invoice_prefix, invoice_number_format, tax_rules JSONB), `customers`, `taxes`, `currencies`, `fx_rates` (off by default), `expense_categories`, `vendors`, `invoice_settings`, `invoice_templates`
- [ ] Company logo upload via `StorageService` (local impl now)
- [ ] Invoice-number-format validator (reject malformed patterns)
- [ ] CRUD services + repositories (repository pattern), DTO validation (class-validator), soft delete
- [ ] Currency seed (common ISO currencies + symbols)
- [ ] Frontend: master list/detail/form pages with filters + pagination; company switcher in topbar wired to `user_company_access`
- [ ] Tests: CRUD + validation + soft-delete behavior

**DoD:** Super Admin can fully configure a company (incl. logo, tax rules, invoice format) and all masters; company switcher scopes visible data.

---

## Phase 3 — Invoice Generation

**Goal:** Create → calculate → number → render pixel-accurate PDF → govern.

- [ ] Schema: `invoices`, `invoice_items`, `invoice_sequences` (unique `company_id,year,month`)
- [ ] Numbering service: atomic `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`; unique `(company_id, invoice_number)` backstop; number assigned on **finalize** only
- [ ] Calculation service: line totals, tax from Tax Master (compound-aware), subtotal/tax/grand total; recompute server-side (never trust client)
- [ ] Endpoints: CRUD + `/finalize` `/approve` `/pdf` `/print`; all writes in DB transaction, emit events
- [ ] Template engine: store template HTML/CSS per company → render with data → **Puppeteer (in worker)** → PDF; browser pooling + timeouts
- [ ] Visibility rules for invoices (creator/grant/company/all/super-admin) in query layer
- [ ] Audit: created/edited/approved/downloaded/printed/deleted (ip, device)
- [ ] Frontend: invoice list (filters/pagination) → editor (customer, dynamic line items, tax dropdown, **live grand total**) → preview → finalize/approve/print/download; activity timeline
- [ ] **Upload your real invoice design → rebuild as the default HTML/CSS template**
- [ ] Tests: numbering race (concurrent finalize), calc correctness, visibility, PDF smoke

**DoD:** Two companies generate non-colliding, monthly-resetting numbers; totals correct; downloaded PDF matches the uploaded design; every action audited.

---

## Phase 4 — Expenses + OCR + Intake (Telegram/Email)

**Goal:** Full expense lifecycle with reimbursement, OCR-assisted capture, and message intake.

**Expenses**
- [ ] Schema: `expenses` (payment_type COMPANY_PAID/REIMBURSABLE, status, payment_status, reimbursement_status), `expense_files`, `reimbursements`, `ocr_results`, `intake_messages`
- [ ] Lifecycle endpoints: create/submit/approve/reject/mark-paid/**reimburse**/close — transactional + events + audit
- [ ] Reimbursement: record payee/amount/method/reimbursed_by/at
- [ ] File upload (image/pdf) via StorageService; magic-byte + size validation
- [ ] Visibility rules for expenses (creator + Office Admin + Super Admin + grants)
- [ ] Frontend: expense list grouped **Year→Month→list→bills**; create (upload → OCR prefill → edit); admin review queue; approve/reject/pay/reimburse; timeline

**OCR**
- [ ] `OcrProvider` interface; `TesseractProvider` (primary); `LlmVisionProvider` (fallback on low confidence / handwriting)
- [ ] OCR job (worker): extract vendor, invoice no, date, amount, GST/tax, currency, items(best-effort) → `ocr_results.extracted`
- [ ] Confidence routing + human-review always required

**Intake**
- [ ] `IntakeAdapter` interface + `intake` module
- [ ] Telegram Bot adapter (webhook/long-poll): download attachment → store → OCR → **create Draft Expense** → notify sender
- [ ] IMAP email poll adapter (worker cron): same pipeline; idempotency key to avoid duplicate drafts
- [ ] "My Draft Expenses" page → review/edit/submit

**DoD:** A bill sent via Telegram or email becomes a reviewable draft with OCR-prefilled fields; full approve→pay/reimburse→close flow works and is audited.

---

## Phase 5 — Dashboards, Reports, Notifications (+ WhatsApp)

- [ ] Role-scoped dashboards (Super Admin/Office Admin/User): Monthly Expenses, Invoice Revenue, Pending Approvals, Paid/Reimbursed, Categories, Company/Country/Currency-wise, Top Customers, Outstanding
- [ ] Dashboard aggregation queries (grouped by currency; no FX conversion)
- [ ] Reports: Invoice/Expense/Monthly/Company/Customer/Tax/Currency/Outstanding
- [ ] Export: PDF/Excel/CSV (large exports via worker job); `export` permission gate
- [ ] Notifications: in-app + email + Telegram, event-driven; `notifications` table + read state; frontend bell/panel
- [ ] WhatsApp Cloud API: intake adapter + notification channel (Meta app + number)
- [ ] Tests: aggregation correctness, export format smoke, notification fan-out

**DoD:** Each role sees correct scoped dashboard; all report types export in 3 formats; workflow events reach users on chosen channels.

---

## Phase 6 — Hardening & Ops

- [ ] Global search (`tsvector`) across invoices/expenses/customers/vendors, permission-scoped
- [ ] Advanced filters + pagination standardized across all lists
- [ ] Security pass: Helmet, CORS allowlist, rate limits (auth/OCR), upload hardening, optional ClamAV scan
- [ ] Backups: nightly `pg_dump` + WAL, `restic`/`rclone` for `/storage`, documented + **tested restore**
- [ ] Notification preferences per user
- [ ] Optimistic locking (`updated_at`) on edits; idempotency keys on intake
- [ ] Load/perf smoke; Puppeteer resource limits verified
- [ ] Docs: ops runbook, restore drill, `.env` reference

**DoD:** Restore drill succeeds from backup; security checklist green; search + filters work everywhere.

---

## Phase 7+ — Future Modules (post-MVP)

Add as independent modules via the event bus — **no core refactor**:
- [ ] Purchase Orders · [ ] Quotations · [ ] Payments/reconciliation · [ ] Payroll · [ ] Inventory · [ ] Projects · [ ] Assets · [ ] CRM · [ ] SSO (Google/Microsoft) · [ ] FX auto-conversion (enable `fx_rates`) · [ ] S3/MinIO storage adapter · [ ] OpenSearch adapter

---

## Cross-Phase Definition of Done (every PR)
- Lint + typecheck clean · unit/integration tests for new logic · permission + visibility enforced on backend · audit emitted on mutations · soft delete respected · shared types in `packages/types` (no drift) · migration committed.

## Suggested Sequencing / Milestones
- **M1 (usable core):** Phases 0–3 → login, masters, working invoicing with PDF.
- **M2 (expenses):** Phase 4 → expense lifecycle + OCR + Telegram/Email intake.
- **M3 (insight):** Phase 5 → dashboards, reports, notifications.
- **M4 (production):** Phase 6 → hardened + backed up + searchable.

## Open Items to Confirm Before Phase 1
- Approve **Prisma** as ORM (Assumption #1).
- Provide the **real invoice design** file (needed in Phase 3 to build the default template).
- Confirm hosting target/VPS + domain for TLS (needed for deploy + Telegram/WhatsApp webhooks).

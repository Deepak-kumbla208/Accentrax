# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**Office Finance Management System** — a self-hosted, multi-company finance app with two modules over shared masters:
1. **Invoice Generation** — per-company invoicing, race-safe monthly-resetting numbers, auto tax/total calc, pixel-accurate PDF from an HTML/CSS template.
2. **Office Expense Management** — Draft → Submitted → Review → Approved/Rejected → Paid and/or **Reimbursed** → Closed, with OCR capture and Telegram/Email/WhatsApp intake.

Design is finalized in [docs/DESIGN.md](docs/DESIGN.md); build order in [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md). **Read both before implementing.**

## Tech Stack

- **Monorepo:** Turborepo + pnpm workspaces.
- **Backend:** NestJS (TypeScript), Prisma, PostgreSQL, class-validator, Passport-JWT, `@nestjs/event-emitter`, BullMQ.
- **Frontend:** React 18 + Vite + TypeScript, React Router, TanStack Query (server state), Zustand (UI state), React Hook Form + Zod, Tailwind + shadcn/ui (dark mode), Recharts.
- **Worker:** BullMQ processors (`apps/worker`) — OCR, email polling, PDF render, notifications.
- **Cache/Queue:** Redis. **Files:** local volume behind `StorageService`. **PDF:** Puppeteer.
- **Deploy:** Docker Compose + nginx, self-hosted VPS.

## Repository Layout

```
apps/api        NestJS HTTP API
apps/web        React SPA
apps/worker     BullMQ job processors (imports api modules)
packages/types  shared DTOs, enums, permission keys  ← keep FE/BE in sync here
packages/config shared eslint/tsconfig
infra           docker-compose, Dockerfiles, nginx
docs            DESIGN.md, IMPLEMENTATION_PLAN.md
```

Each backend module = `*.controller.ts` + `*.service.ts` + `*.repository.ts` + `*.policy.ts` + `dto/` + `events/`.

## Non-Negotiable Rules (from the design)

1. **Permissions enforced on the backend**, always — never rely on UI hiding alone. Use `@RequirePermissions()` + `PermissionsGuard`, and scope repository queries by visibility rules. UI menu-hiding is additive, not the gate.
2. **Visibility rules** (enforce in query layer):
   - *Invoices:* creator + explicit grant + `view_company/all` + Super Admin.
   - *Expenses:* creator + Office Admin (same company) + Super Admin + explicit grant.
3. **No hard deletes.** Everything is soft delete (`deleted_at`) via Prisma middleware.
4. **Audit every mutation** — actor/action/resource/before/after/ip/device. Audit log is append-only.
5. **Invoice numbers** are assigned atomically on finalize (`INSERT ... ON CONFLICT DO UPDATE ... RETURNING`) with a `unique(company_id, invoice_number)` backstop. Never generate numbers on the client or for drafts.
6. **Money** = `numeric(18,4)` + `currency_code`. Recompute all totals server-side. No FX auto-conversion (group by currency); `fx_rates` table exists but stays off.
7. **Wrap state-changing operations in DB transactions**; emit domain events for audit + notifications (event-driven, decoupled).
8. **Abstractions stay abstract:** file access only through `StorageService`; OCR only through `OcrProvider`; intake only through `IntakeAdapter`. Don't hardcode local FS / Tesseract / a specific channel at call sites.
9. **Shared types live in `packages/types`** — add enums/DTOs there so frontend and backend never drift.
10. **Future modules** (PO, Payroll, Inventory, etc.) plug in via the event bus — don't refactor the core to add them.

## Conventions

- REST under `/api/v1`; list params `?page&limit&sort&q&filters`; envelope `{ data, meta }`; problem+json errors.
- DTO validation with class-validator (backend) / Zod (frontend); parameterized queries via Prisma only.
- Passwords: argon2id. Access JWT 15m + rotating refresh 7d (revocation list in Redis).
- Every list view: filters + pagination. Every record: activity timeline. App-wide: dark mode + global search.

## Workflow Expectations

- Build **phase by phase** per the implementation plan; keep each phase green (lint, typecheck, tests, working slice).
- Every PR: lint + typecheck clean, tests for new logic, permissions + visibility enforced, audit emitted, soft delete respected, migration committed.
- Prefer editing existing modules over adding parallel ones; match surrounding code style.

## Commands (fill in as scaffolding lands)

```
pnpm install
pnpm dev                # all apps (turbo)
pnpm --filter api dev
pnpm --filter web dev
pnpm --filter api prisma migrate dev
pnpm --filter api prisma db seed
pnpm lint | pnpm typecheck | pnpm test
docker compose -f infra/docker-compose.yml up
```

## Current Status

Design + plan complete. **Next: Phase 0 (foundation scaffolding).** Before Phase 1, confirm Prisma as ORM, obtain the real invoice design (Phase 3 template), and confirm VPS/domain for TLS + webhooks.

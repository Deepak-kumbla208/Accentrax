# Accentrax

**Office Finance Management System** — a self-hosted, multi-company platform for invoicing and office expense management.

One login portal, two modules over shared masters:

- **Invoice Generation** — per-company invoicing with race-safe, monthly-resetting numbers, automatic tax/total calculation, and pixel-accurate PDF generation from a configurable template.
- **Office Expense Management** — a governed lifecycle (Draft → Submitted → Review → Approved/Rejected → Paid and/or **Reimbursed** → Closed) with OCR-assisted capture and Telegram/Email/WhatsApp intake.

Built for multiple registered companies under one organization, with dynamic role-based permissions, soft deletes, and full audit trails throughout.

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + TypeScript, Tailwind + shadcn/ui, TanStack Query |
| Backend | NestJS + TypeScript, Prisma, PostgreSQL |
| Jobs | BullMQ + Redis (OCR, email polling, PDF, notifications) |
| PDF / OCR | Puppeteer · Tesseract + LLM-vision fallback |
| Infra | Turborepo monorepo, Docker Compose, nginx (self-hosted) |

## Repository Layout

```
apps/api        NestJS HTTP API
apps/web        React SPA
apps/worker     BullMQ job processors
packages/types  shared DTOs, enums, permission keys
packages/config shared eslint/tsconfig
infra           docker-compose, Dockerfiles, nginx
docs            design & implementation plan
```

## Documentation

- [docs/DESIGN.md](docs/DESIGN.md) — full architecture, data model, API, permission matrix, and analyses.
- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) — phased, checkable build plan.
- [CLAUDE.md](CLAUDE.md) — engineering guardrails and conventions.

## Status

Design finalized. Next: **Phase 0 — Foundation** (monorepo scaffolding, Docker Compose, API/web/worker skeletons).

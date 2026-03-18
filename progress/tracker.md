# MedLifeCycle / Aarogya360 Progress Tracker

Last updated: March 18, 2026  
Audit scope for this update: backend codebase review across `backend/src`, `backend/prisma`, `backend/test`, and backend config files.

## 1. Backend Implementation Status (Code-Verified)

### 1.1 Application Foundation
- [x] NestJS backend scaffolded and modularized.
- [x] Global configuration loaded via `ConfigModule.forRoot({ isGlobal: true })`.
- [x] Global API prefix configured: `/api`.
- [x] Global validation pipe enabled (`whitelist: true`, `transform: true`).
- [x] Runtime port resolved from `PORT` env, fallback to `3005`.

### 1.2 Infrastructure and Local Services
- [x] Docker Compose setup present for:
  - PostgreSQL (`ankane/pgvector:latest`) on `5432`
  - Redis (`redis:alpine`) on `6379`
- [x] Backend environment variables currently expected:
  - `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`, `PORT`, `JWT_SECRET`
  - `LLM_ENDPOINT`, `LLM_MODEL`
  - `STORAGE_PATH`, `ENCRYPTION_KEY`

### 1.3 Database Layer (Prisma)
- [x] Prisma schema implemented with core entities:
  - `Organization`
  - `User`
  - `Patient`
  - `Document`
- [x] Multi-tenant linkage implemented through `organizationId` on users and patients.
- [x] Initial migration exists: `20260317221437_init`.
- [x] Prisma schema validation passes.
- [x] Prisma client generation passes.

### 1.4 Implemented Backend Modules

#### A) Database Module
- [x] `PrismaService` extends `PrismaClient` and connects on module init.
- [x] Database module is global and exported.

#### B) Users Module
- [x] `findByEmail` with organization include.
- [x] `create` user method implemented.
- [x] `createWithOrganization` implemented for org + admin bootstrap.

#### C) Auth Module
- [x] JWT configured with 1-day expiry.
- [x] Passport JWT strategy implemented.
- [x] `POST /auth/register` implemented (org + admin creation).
- [x] `POST /auth/login` implemented.
- [x] Password hashing/verification with `bcrypt`.
- [x] Auth guard (`JwtAuthGuard`) wired and reused across protected modules.

#### D) Patients Module
- [x] `GET /patients` returns org-scoped patient list.
- [x] `GET /patients/:id` returns org-scoped patient detail + documents.
- [x] `POST /patients` creates FHIR-like patient JSON payload.
- [x] `PATCH /patients/:id/stage` updates lifecycle stage.
- [x] Lifecycle stage tracking field present (`lifecycleStage`).

#### E) AI Module
- [x] `POST /ai/query` implemented (prompt -> LLM chat completion).
- [x] `GET /ai/summarize/:patientId` implemented (patient summary for family language).
- [x] Configurable LLM endpoint/model (`LLM_ENDPOINT`, `LLM_MODEL`).
- [x] Structured typing added for chat request/response payloads.

#### F) Documents Module
- [x] `POST /documents/upload/:patientId` implemented using multer disk storage.
- [x] `GET /documents/patient/:patientId` implemented.
- [x] Async "fire-and-forget" processing flow implemented after upload.
- [x] PDF text extraction path implemented via `pdf-parse`.
- [x] AI-based metadata extraction pipeline implemented conceptually.

### 1.5 API Surface Implemented (Current)
- [x] Auth:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
- [x] Patients (JWT protected):
  - `GET /api/patients`
  - `GET /api/patients/:id`
  - `POST /api/patients`
  - `PATCH /api/patients/:id/stage`
- [x] AI (JWT protected):
  - `POST /api/ai/query`
  - `GET /api/ai/summarize/:patientId`
- [x] Documents (JWT protected):
  - `POST /api/documents/upload/:patientId`
  - `GET /api/documents/patient/:patientId`

## 2. Test and Build Health (Current Reality)

### 2.1 Passing Checks
- [x] `npm run build` passes.
- [x] `npm run lint` passes.
- [x] `npm test` passes (all current unit tests green).
- [x] `npm run test:e2e` passes (current smoke e2e test green).
- [x] `npx prisma validate` passes.
- [x] `npx prisma generate` passes.

### 2.2 Resolved in This Sprint
- [x] Document pipeline compile blockers fixed:
  - `Document` create payload now matches Prisma schema fields.
  - PDF extraction updated to `pdf-parse` v2 class API (`PDFParse`).
  - File-type detection aligned to persisted document data (`type` + extension check).
- [x] Unit test dependency wiring fixed with proper provider mocks.
- [x] e2e smoke test made DB-independent for local/CI stability by overriding `PrismaService` in test context.

## 3. Notable Consistency Gaps Found

- [ ] Prisma migration enum and current schema enum differ for `DocStatus`:
  - Migration: `PENDING`, `PROCESSED`, `APPROVED`, `FLAGGED`
  - Current schema: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`
- [ ] Backend README is still default NestJS template; project-specific backend runbook is not yet documented there.
- [ ] Some documentation references older/default ports and setup values that do not fully match current backend code defaults.

## 4. What Is Functionally Done vs What Is In Progress

### Done
- [x] Core backend architecture and modules are in place.
- [x] Auth, patient lifecycle, AI query/summarization, and document upload flows are implemented at endpoint/service level.
- [x] Local infra scaffolding (Postgres + Redis) and Prisma layer are established.

### In Progress / Not Yet Stable
- [ ] Document intelligence flow is operational but still needs production-hardening (input validation, size limits, async job queueing, and stronger error mapping).
- [ ] API DTO validation is still minimal and should be expanded before external integrations.
- [ ] Backend documentation and operational runbook need refresh.

## 5. Recommended Immediate Next Steps (Backend)

1. Add explicit DTOs + validation decorators for auth, patients stage update, AI prompt, and document upload metadata.
2. Introduce authorization checks for document access by tenant/org context.
3. Refresh `backend/README.md` and setup docs to reflect actual env vars, ports, scripts, and current API surface.
4. Add one real integration e2e workflow (`register -> login -> patient create -> stage update -> document upload`) with test database setup.
5. Start Phase 6 backend support for dashboard APIs (patient timeline and role-focused summaries).

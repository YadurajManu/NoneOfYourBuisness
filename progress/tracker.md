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
- [x] Family/consent and notification models added:
  - `PatientFamilyAccess`
  - `FamilyAccessAudit`
  - `NotificationEvent`
- [x] Multi-tenant linkage implemented through `organizationId` on users and patients.
- [x] Initial migration exists: `20260317221437_init`.
- [x] Incremental migration added: `20260318070000_family_access_notifications`.
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

#### G) Dashboard Module (Phase 6 Backend Starter)
- [x] `GET /dashboard/overview` implemented (org-scoped patient/document aggregates).
- [x] `GET /dashboard/patient/:patientId/timeline` implemented (patient timeline + document events).
- [x] Dashboard endpoints protected by JWT and org context.

#### H) Family Access Module (Guide Alignment)
- [x] `POST /family-access/family-member` implemented (create family member account under org).
- [x] `POST /family-access/grant/:patientId` implemented (consent grant with access level).
- [x] `PATCH /family-access/revoke/:accessId` implemented (revoke family access).
- [x] `GET /family-access/patient/:patientId/grants` implemented (doctor/admin grant visibility).
- [x] `GET /family-access/my-patients` implemented (family member authorized patient list).
- [x] `GET /family-access/patient/:patientId` implemented (family-scoped patient view).
- [x] `GET /family-access/notifications` + `PATCH /family-access/notifications/:notificationId/read` implemented.
- [x] Family access audit log creation implemented for grant/revoke/patient-view actions.

#### I) Notifications Module (Event Backbone)
- [x] Notification emission service added for active family access recipients.
- [x] Lifecycle stage change events now emit notifications.
- [x] Document upload/processed/failed events now emit notifications.

#### J) Role-Based Access Control Hardening
- [x] `Roles` decorator + `RolesGuard` implemented.
- [x] Global role guard registered using `APP_GUARD`.
- [x] `patients`, `ai`, `documents`, and `dashboard` controllers restricted to clinical/admin roles.
- [x] Family member routes restricted to `FAMILY_MEMBER` where applicable.

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
- [x] Dashboard (JWT protected):
  - `GET /api/dashboard/overview`
  - `GET /api/dashboard/patient/:patientId/timeline`
- [x] Family Access (JWT protected + role restricted):
  - `POST /api/family-access/family-member`
  - `POST /api/family-access/grant/:patientId`
  - `PATCH /api/family-access/revoke/:accessId`
  - `GET /api/family-access/patient/:patientId/grants`
  - `GET /api/family-access/my-patients`
  - `GET /api/family-access/patient/:patientId`
  - `GET /api/family-access/notifications`
  - `PATCH /api/family-access/notifications/:notificationId/read`

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
- [x] DTO-based request validation added for:
  - auth login/register payloads
  - AI query payload
  - patient stage updates
  - patient creation minimum FHIR shape (`resourceType`)
- [x] Organization-safe access control enforced for document upload/list endpoints:
  - patient ownership verified against authenticated user organization
  - UUID validation added for patient/document route params
- [x] Patient safety fixes:
  - `findOne` now returns 404 for non-org/non-existent patient
  - lifecycle stage update now validates org ownership before update

## 3. Notable Consistency Gaps Found

- [x] Prisma migration/state mismatch for `DocStatus` is now resolved by new incremental migration.
- [ ] Backend README is still default NestJS template; project-specific backend runbook is not yet documented there.
- [ ] Some documentation references older/default ports and setup values that do not fully match current backend code defaults.

## 4. What Is Functionally Done vs What Is In Progress

### Done
- [x] Core backend architecture and modules are in place.
- [x] Auth, patient lifecycle, AI query/summarization, and document upload flows are implemented at endpoint/service level.
- [x] Local infra scaffolding (Postgres + Redis) and Prisma layer are established.
- [x] Family member consent/access workflow now has backend implementation.
- [x] Event-based family notification backbone exists and is wired to key workflow changes.

### In Progress / Not Yet Stable
- [ ] Document intelligence flow is operational but still needs production-hardening (input validation, size limits, async job queueing, and stronger error mapping).
- [ ] API DTO validation is still minimal and should be expanded before external integrations.
- [ ] Backend documentation and operational runbook need refresh.

## 5. Recommended Immediate Next Steps (Backend)

1. Refresh `backend/README.md` and setup docs to reflect actual env vars, ports, role model, and API surface.
2. Add strong integration tests for full family workflow (`create family user -> grant -> list my patients -> patient view -> notifications`).
3. Add clinical event entities (orders, meds, follow-ups) and feed them into dashboard/notification pipelines.
4. Add consent expiry/revocation automation jobs and notification delivery channels (websocket/email/SMS adapters).
5. Implement role-specific AI policy layers (different prompts/context windows per Patient/Family/Doctor/Specialist).

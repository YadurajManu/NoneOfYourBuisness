# MedLifeCycle Backend Progress Tracker

Last updated: March 18, 2026 (local)

## 1) Backend Completion Summary

### Foundation
- NestJS modular backend established.
- Prisma + PostgreSQL schema and migration flow active.
- Redis-ready local infrastructure available.
- Multi-tenant organization isolation enforced through service-layer checks.

### Security and Session Layer
- Auth endpoints fully implemented:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- Access + refresh session design implemented:
  - short-lived access JWT
  - HttpOnly refresh cookie (`ml_refresh_token`)
  - refresh token rotation and revocation (`RefreshSession`)
- Account controls:
  - user suspension (`isSuspended`, `suspendedAt`)
- HTTP hardening:
  - CORS allowlist + credential support
  - helmet
  - body size limits
  - public endpoint rate limits

## 2) Domain Modules Implemented

### Patients and Lifecycle
- Patient create/list/detail in organization scope
- Lifecycle stage transitions with strict progression controls
- Lifecycle blocker checks before stage change
- Transition history + audit entries
- Lifecycle hook execution tracking

### Documents + AI
- Patient document upload with async processing pipeline
- Document status flow (`PENDING -> PROCESSING -> COMPLETED/FAILED`)
- AI query and patient summary endpoints
- Binary-safe document processing for report photos/images (no text parse failure path)
- Report download endpoints for clinical roles and patient self-service
- Upload hardening with centralized type/size policy (`DOCUMENT_UPLOAD_MAX_MB`) and storage abstraction (`DOCUMENT_STORAGE_DRIVER`, `DOCUMENT_STORAGE_LOCAL_DIR`)
- OCR extraction for image reports using `tesseract.js` (configurable language/timeout)
- Structured clinical extraction persisted in metadata (`structuredExtraction`, `searchableText`, `extractionEngine`, `ocrConfidence`)

### Family Access + Notification System
- Family member account creation
- Consent-first grant/revoke access workflows
- Invite-based family access request workflow (`ADMIN/DOCTOR` -> `PATIENT` consent)
- Patient approve/reject invite endpoints with access activation on approval
- Family-safe patient view and access logs
- Family report upload/download endpoints scoped by consent/access level (VIEW_ONLY blocked for uploads)
- Family notification list/read
- Notification preference management
- Realtime SSE notifications stream
- Notification delivery queue/dispatch endpoints (ops side)

### Clinical Operations
- Clinical events creation and listing
- Alert creation/acknowledge/resolve workflow
- Clinical orders, care tasks, medication plans
- Prior authorization workflow
- Referral handoff workflow
- Overdue automation escalation endpoint
- Workflow audit tracking

### Dashboard and Portal APIs
- Dashboard overview aggregates
- Patient timeline endpoint
- Role-aware caseload endpoint (`/api/dashboard/my-caseload`)
- Patient self-service namespace (`/api/patient/*`)
- Patient family consent endpoints (`/api/patient/family-access/invites`, `/respond`, `/audit`)
- Family structured question flow (`/api/family-access/questions/*`)

### Admin and Public Growth APIs
- Public lead intake (`POST /api/public/leads`)
- Admin lead management list/detail/status update
- Admin user operations list/create/role change/suspend
- Starter audit feed endpoint

## 3) Latest Schema/Migration State

Migration:
- `20260318150000_family_access_invites`

New schema entities in this phase:
- `RefreshSession`
- `DemoLead` (+ `DemoLeadStatus`)
- `FamilyQuestion` (+ `FamilyQuestionStatus`)
- `FamilyAccessInvite`
- User extensions for production auth/account control

## 4) Known Backend Fixes Done Recently

- Resolved admin user creation org FK failure path by deriving admin organization from DB context (`actorUserId`) instead of trusting potentially stale token org payload.
- This protects user creation from stale-session org mismatch scenarios.

## 5) Verification Status

Latest backend checks executed:
- `npm run build` ✅
- `npm run lint` ✅
- `npm test -- --runInBand` ✅
- `npm run test:e2e` ✅

## 6) Remaining Backend Work for Full Production Depth

1. Interoperability adapters:
- EHR/FHIR connectors and sync workflows
- payer callback and packet orchestration

2. Notification channel maturity:
- provider-native delivery adapters (email/SMS/push)
- delivery receipts, bounce/error classification, alerting

3. Operational hardening:
- deeper metrics/trace instrumentation
- production-grade background processing and retry supervision

4. Policy depth:
- richer role-scoped contracts and compliance boundaries across specialist/doctor/family/patient workflows

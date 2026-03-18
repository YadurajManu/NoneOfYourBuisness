# MedLifeCycle / Aarogya360 Project Tracker

Last updated: March 18, 2026 (local)
Status owner: engineering implementation snapshot

## 1) Delivery Snapshot

### Overall
- Backend platform: **implemented and running**
- Frontend portal shell + role routing: **implemented and running**
- Landing to backend integration (`/contact` -> demo lead): **implemented and running**
- Full role-by-role connected portal UX: **implemented (production-style baseline)**
- Detailed doctor/specialist patient profile workspace: **implemented and routed**
- Admin patient onboarding workspace: **implemented and routed**

### Milestone view
- Milestone A (auth, portal shell, role routing, live leads): **done**
- Milestone B (admin overview/leads/users, doctor ops screens): **done**
- Milestone C (specialist/family operational screens): **done**
- Milestone D (patient dashboard + consent controls): **done**
- Production hardening phase (workflow depth + integrations + observability): **in progress**

## 2) What Is Implemented (Code Truth)

### Backend
- Auth/session model:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- Session storage and rotation:
  - `RefreshSession` model with hashed token, expiry, revoke/replace chain
  - refresh cookie name: `ml_refresh_token` (HttpOnly)
- Security middleware:
  - CORS allowlist (`CORS_ALLOWED_ORIGINS`) + credentials
  - `helmet`
  - request size limits
  - rate limiting on `/api/public/*`
- Public + admin operations:
  - `POST /api/public/leads`
  - `GET /api/admin/leads`
  - `GET /api/admin/leads/:id`
  - `PATCH /api/admin/leads/:id/status`
  - admin users list/create/role update/suspend + audit feed
- Admin patient operations:
  - `GET /api/users/doctors`
  - `PATCH /api/patients/:id/profile`
  - `PATCH /api/patients/:id/care-team`
  - optional onboarding bootstrap (doctor intake task + specialist consult/referral)
- Clinical platform modules:
  - patient lifecycle (10-stage transitions + blocker checks + transition audit)
  - documents upload/processing
  - AI query + summary
  - family consent access + notifications + SSE stream
  - family invitation workflow with patient approval/rejection endpoints
  - clinical events + alerts
  - clinical workflows (orders/tasks/medications/prior-auth/referrals/overdue automation)
  - dashboard (overview, patient timeline, my-caseload)
  - patient portal endpoints (`/api/patient/*`)
  - family questions flow (`/api/family-access/questions/*`)

### Frontend (single app)
- Public landing pages preserved
- Portal auth + role guards working
- Implemented route groups:
  - `/portal/login`
  - `/portal/admin`, `/portal/admin/patients`, `/portal/admin/leads`, `/portal/admin/users`
  - `/portal/doctor`, `/portal/doctor/caseload`, `/portal/doctor/patient/:patientId`
  - `/portal/specialist`, `/portal/specialist/caseload`, `/portal/specialist/patient/:patientId`
  - `/portal/patient`, `/portal/patient/family-access`
  - `/portal/family`, `/portal/family/questions`
- Admin patient workspace includes:
  - intake form (FHIR profile create + optional stage set)
  - patient registry search/filter
  - profile editing
  - doctor/specialist assignment
  - lifecycle stage updates
  - optional bootstrap actions (doctor task + specialist referral)
  - family invitation request form + invite queue + access grants + audit view
- Doctor/specialist patient detail screens now include:
  - profile snapshot, timeline, documents, events, orders/tasks, meds, prior auth, referrals
  - role actions for lifecycle, order/referral status updates, event logging, and (doctor) order/referral creation
- Patient family access screen includes:
  - pending invite consent inbox (approve/reject)
  - access level + expiry visibility
  - audit trail visibility
- API client with:
  - `VITE_API_BASE_URL` support
  - `credentials: include`
  - in-memory access token + refresh retry on 401
- Contact form is connected to real lead intake endpoint

## 3) User Type Coverage (Guide Alignment)

Startup guide perspectives tracked:
1. Patient
2. Family Member
3. Primary Doctor
4. Specialist Doctor
5. Administrator
6. AI assistant surface (service-driven)

Current implementation state:
- Login roles implemented in auth model: **5** (`ADMIN`, `DOCTOR`, `SPECIALIST`, `PATIENT`, `FAMILY_MEMBER`)
- AI implemented as backend service surface (non-login role): **1**
- Total guide perspectives accounted for in implementation model: **6/6**

## 4) Database / Migration Status

Latest migration in repo:
- `20260318150000_family_access_invites`

Key new entities already in schema:
- `RefreshSession`
- `DemoLead`
- `FamilyQuestion`
- `FamilyAccessInvite`
- `User` extensions: `isSuspended`, `suspendedAt`, `patientProfileId`

## 5) Validation Status

### Backend (latest completed run)
- `npm run build` ✅
- `npm run lint` ✅
- `npm test -- --runInBand` ✅
- `npm run test:e2e` ✅

### Frontend (latest completed run)
- `npm run build` ✅
- `npm test` ⚠️ blocked in this machine by local native dependency (`canvas` / `pixman` dylib), not by TS compile errors in app code.

## 6) Known Gaps (Important)

1. Core portal screens are now styled and connected, but some role workflows still need deeper domain actions (for example richer specialist/doctor task-level CRUD and bulk operations).
2. Cross-system integrations (EHR/FHIR adapters, payer callback pipelines, provider-native email/SMS/push adapters) are not complete.
3. Advanced observability and incident operations (metrics dashboards, alerting policies, SLOs) need hardening.

## 7) Immediate Next Build Order

1. Complete role-specific workflow UIs (doctor/specialist/patient/family) from summary cards to full task-driven CRUD flows.
2. Add richer admin operations (user profile detail, role constraints, audit filtering/export).
3. Implement integration adapters (EHR/FHIR + payer exchange + notification providers).
4. Add stronger production observability + background job operations.

## 8) Local Connectivity Notes

- Backend local port from current `.env`: `3100`
- Frontend local port: `8080`
- Vite proxy target should be backend base (currently defaults to `http://localhost:3100`)
- If auth/portal requests fail locally, verify:
  - backend is running
  - frontend proxy target matches backend port
  - browser cookies are not blocked

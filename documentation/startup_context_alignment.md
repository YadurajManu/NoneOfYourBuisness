# MediLifecycle Source-of-Truth Context (Implementation Alignment)

Last updated: March 18, 2026  
Primary source: `documentation/MediLifecycle_Comprehensive_Guide_v2.docx.pdf`

## 1. Decision Rule for This Project

From this point forward, implementation should follow the startup guide as the product source-of-truth.  
If code and guide differ, we treat guide requirements as target behavior and mark code as gap/in-progress.

Note: Poppler tools (`pdftoppm`, `pdftotext`) were not available in this environment during analysis, so text was extracted via Python (`pypdf`).

## 2. User Types in the Startup Guide

The guide defines the core multi-experience architecture around these user perspectives:

1. Patient (`2.1 The Patient Experience`)
2. Family Member (`2.2 The Family Member Experience`)
3. Primary Doctor (`2.3 The Primary Doctor Experience`)
4. Specialist Doctor (`2.4 The Specialist Doctor Experience`)
5. AI Assistant / AI Engine (`2.5 The AI Assistant — Architecture Overview`)
6. Hospital/Clinic Administration perspective (`Section 10`)

## 3. User Types Currently Accounted in Backend

Current role model in backend schema (`backend/prisma/schema.prisma`):

- `ADMIN`
- `DOCTOR`
- `SPECIALIST`
- `PATIENT`
- `FAMILY_MEMBER`

Current AI support in backend:

- AI exists as service/module endpoints (`/api/ai/*`) but not as login user account type.

### Coverage Count

- Startup guide user perspectives: **6**
- Explicit backend account roles: **5**
- AI engine implemented as service (non-account): **1**

Practical interpretation:

- All core perspectives now have backend representation, but several are still partial in depth.

## 4. How Current Users Work in Backend

### Implemented Behavior

1. `ADMIN`
- Can register organization and receive JWT.
- Currently shares generic backend capabilities; no dedicated admin workflow module yet.

2. `DOCTOR` (used for Primary Doctor in current model)
- Accesses protected patient/document/AI/dashboard APIs via JWT.
- Can create patients, move lifecycle stage, query AI, review timelines, and record/triage clinical events + alerts.

3. `SPECIALIST`
- Role exists in schema/JWT payload.
- Can access the same current clinical surface as doctor (patients, docs, AI, dashboard, clinical alerts).
- No specialist-specific filtered API behavior yet.

4. `PATIENT`
- Role exists in schema/JWT payload.
- No dedicated patient portal API surface yet (currently no patient-specific controller/policy layer).

5. `AI` (engine, not account)
- `/api/ai/query` and `/api/ai/summarize/:patientId` available.
- Document pipeline can call AI for structured extraction.

## 5. Workflow Alignment vs Guide

### A) 10-stage lifecycle
- Guide target: complete lifecycle orchestration.
- Current: stage is stored as integer (`1..10`) and updatable (`PATCH /patients/:id/stage`).
- Status: **Partial** (state storage exists; full stage-specific workflows/automation not yet built).

### B) Document intelligence
- Guide target: robust upload, classification, extraction, governance.
- Current: upload, async processing, PDF extraction, AI metadata storage.
- Status: **Partial** (core pipeline exists; needs hardening, richer metadata schema, controls).

### C) Role-aware AI
- Guide target: deeply role-calibrated AI behavior.
- Current: generic chat and patient summary endpoints.
- Status: **Partial**.

### D) Real-time family updates/notifications
- Guide target: live multi-channel updates and family communication.
- Current: notification event backbone implemented (DB events + family notification APIs), wired to stage/document events.
- Status: **Partial** (channel delivery adapters still pending).

### E) Clinical events and order workflows
- Guide target: ordering, coordination, medication/PA workflows.
- Current: backend now supports clinical event capture and alert triage APIs:
  - `POST /api/clinical-events/patient/:patientId`
  - `GET /api/clinical-events/patient/:patientId`
  - `GET /api/clinical-events/alerts/open`
  - `GET /api/clinical-events/alerts/patient/:patientId`
  - `PATCH /api/clinical-events/alerts/:alertId/status`
- Status: **Partial** (core event/alert domain exists; full order/medication/PA workflows still pending).

### F) EHR/FHIR integration adapters
- Guide target: interoperability adapters and integration flows.
- Current: only FHIR-like patient JSON storage; no external adapter services yet.
- Status: **Not implemented**.

### G) Dashboards and analytics
- Guide target: broad reporting/performance dashboards.
- Current: backend now has starter dashboard APIs:
  - `GET /api/dashboard/overview`
  - `GET /api/dashboard/patient/:patientId/timeline`
- Includes clinical totals/open alerts and patient clinical timeline items.
- Status: **Partial**.

## 6. Immediate Product Gaps to Reach Guide Fidelity

1. Implement role-specific API policies/views (Primary vs Specialist vs Patient vs Family).
2. Add channel delivery for notifications (websocket/push/email/SMS adapters).
3. Build notification/alert expansion for broader transition event types.
4. Add workflow modules for orders, medications, and prior-authorization/care coordination.
5. Expand dashboard KPIs with SLA, turnaround, outcomes, and role-specific drilldowns.
6. Add integration module layer for EHR/FHIR exchange.

## 7. Build Sequence (Strict Guide-First)

1. Lifecycle orchestration layer (rules per stage, transition hooks).
2. Notification/event engine expansion for family and care-team updates across all workflows.
3. Delivery channel adapters (websocket/push/email/SMS) on top of notification events.
4. Clinical workflow expansion (orders, meds, PA, follow-ups, escalation on top of events/alerts).
5. Dashboard/reporting expansion mapped to Section 11 KPIs and operational SLA metrics.
6. EHR integration adapters and deployment hardening.

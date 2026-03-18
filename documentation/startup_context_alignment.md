# Startup Context Alignment (Guide -> Current Implementation)

Last updated: March 18, 2026 (local)
Primary product source: `documentation/MediLifecycle_Comprehensive_Guide_v2.docx`

## 1) Alignment Rule

The startup guide remains the product source-of-truth.  
Current backend/frontend implementation is measured against that guide and tracked as:
- Implemented
- Partially implemented
- Not implemented yet

## 2) User Types Accounted For

Guide user perspectives:
1. Patient
2. Family Member
3. Primary Doctor
4. Specialist Doctor
5. Administrator
6. AI assistant surface

Current implementation mapping:
- Login roles in system: `ADMIN`, `DOCTOR`, `SPECIALIST`, `PATIENT`, `FAMILY_MEMBER`
- AI assistant surface: implemented as service endpoints (`/api/ai/*`), not a login account role

Coverage count:
- Guide perspectives: **6**
- Account roles: **5**
- AI service surface: **1**
- Total perspectives represented in architecture: **6/6**

## 3) Workflow Spine Alignment

### 3.1 10-stage lifecycle progression
- Status: **Partially implemented**
- Implemented now:
  - stage transition API
  - transition blocker checks
  - transition history + audit
  - lifecycle hook execution log
- Remaining:
  - deeper stage-specific policy/actions and advanced orchestration rules

### 3.2 Role-aware shared patient record
- Status: **Partially implemented**
- Implemented now:
  - organization-scoped records
  - role guards
  - role-specific portal route separation
- Remaining:
  - richer role-specific read/write contracts and production-grade UX depth

### 3.3 Consent-first family access
- Status: **Implemented (baseline)**
- Implemented now:
  - grant/revoke access
  - family-safe view
  - audit trail
  - patient self-service family access controls
- Remaining:
  - expanded consent policy variants and compliance workflows

### 3.4 Event/alert/workflow operations
- Status: **Implemented (baseline)**
- Implemented now:
  - clinical events and alerts
  - clinical orders/tasks/medications/prior-auth/referrals
  - overdue automation and workflow audit
- Remaining:
  - external payer/provider integration depth and advanced SLA automation

### 3.5 Dashboard and timeline views
- Status: **Implemented (baseline)**
- Implemented now:
  - dashboard overview
  - patient timeline
  - role-aware caseload endpoint
- Remaining:
  - advanced KPI drilldowns and full operational dashboard depth

## 4) Portal UI Reality vs Guide

Implemented now:
- Single app with landing + portal
- Role-protected routes for admin/doctor/specialist/patient/family
- Core connected screens for each role

Still required for full guide parity:
- full workflow-heavy UI depth per role
- advanced UX around clinical operations, collaboration, and governance

## 5) Current Priority Sequence (Guide-first)

1. Expand role workflow depth from baseline pages to production operations screens.
2. Complete integrations (EHR/FHIR, payer pipelines, provider notifications).
3. Add stronger production observability, operational alerts, and resilience controls.

# Portal Frontend Structure (Production Context)

Last updated: March 18, 2026
Codebase: `landing_page`

## 1) Current Folder Structure

```text
landing_page/src
├── lib/api/
│   ├── client.ts
│   └── types.ts
├── portal/
│   ├── auth-context.tsx
│   ├── protected-route.tsx
│   ├── portal-shell.tsx
│   ├── panel.tsx
│   ├── patient-detail-workspace.tsx
│   └── pages/
│       ├── auth/
│       │   ├── PortalIndexPage.tsx
│       │   └── PortalLoginPage.tsx
│       ├── admin/
│       │   ├── AdminOverviewPage.tsx
│       │   ├── AdminLeadsPage.tsx
│       │   ├── AdminUsersPage.tsx
│       │   └── AdminPatientsPage.tsx
│       ├── doctor/
│       │   ├── DoctorDashboardPage.tsx
│       │   ├── DoctorCaseloadPage.tsx
│       │   └── DoctorPatientDetailPage.tsx
│       ├── specialist/
│       │   ├── SpecialistDashboardPage.tsx
│       │   ├── SpecialistCaseloadPage.tsx
│       │   └── SpecialistPatientDetailPage.tsx
│       ├── patient/
│       │   ├── PatientDashboardPage.tsx
│       │   └── PatientFamilyAccessPage.tsx
│       ├── help/
│       │   └── PortalHelpPage.tsx
│       └── family/
│           ├── FamilyDashboardPage.tsx
│           └── FamilyQuestionsPage.tsx
└── App.tsx
```

## 2) Structure Principles (Keep Strict)

1. Keep all portal concerns inside `src/portal/*`.
2. Keep reusable HTTP/auth primitives inside `src/lib/api/*`.
3. Keep route ownership by role folder:
- each role folder should own its screens and role-specific subcomponents.
4. Keep shared portal layout primitives centralized (`portal-shell`, `panel`, guards).
5. Avoid mixing public landing page components into portal folders.

## 3) Routing Contract

Defined in `src/App.tsx`:
- Public marketing routes remain outside `/portal/*`.
- Portal auth route: `/portal/login`
- Shared authenticated route: `/portal/help`
- Protected role routes:
  - admin: `/portal/admin*`
  - doctor: `/portal/doctor*`
  - specialist: `/portal/specialist*`
  - patient: `/portal/patient*`
  - family: `/portal/family*`
- Deep clinical detail routes:
  - `/portal/doctor/patient/:patientId`
  - `/portal/specialist/patient/:patientId`
- Admin operational route:
  - `/portal/admin/patients`

## 4) API Integration Contract

- Base URL: `VITE_API_BASE_URL` (fallback `/api`)
- Dev proxy in Vite forwards `/api` to `VITE_DEV_API_PROXY` (default `http://localhost:3100`)
- Access token lifecycle:
  - token in memory only
  - refresh via HttpOnly cookie at `/api/auth/refresh`
  - retry once on 401 for authenticated calls

## 5) Screen Readiness Snapshot

- Admin:
  - overview connected to dashboard totals
  - leads list + status update connected
  - users create/role/suspend connected
  - patients intake + registry + profile edit + care-team assignment + stage update connected
  - upgraded production-style operations UX
- Doctor/Specialist:
  - dashboards + caseload command surfaces connected
  - stage/order/referral/event actions wired in specialist flow
  - shared detailed patient workspace connected for both roles (profile + full timeline + data blocks + actions)
- Patient:
  - profile/timeline/documents connected
  - document upload + consent-first family access controls connected
- Family:
  - patient list + patient detail + notifications connected
  - question submission + thread history + notification preference updates connected
  - consent-level report upload/download from selected patient context connected
- Shared:
  - role-aware Help/Workflow guide page (`/portal/help`) connected to shell navigation

## 6) Next UI Structure Expansion

For each role folder, add subfolders as depth grows:
- `components/` for role-shared widgets
- `features/` for workflow domains (for example `orders`, `alerts`, `documents`)
- `hooks/` for role-scoped React Query hooks
- `types/` for role DTO/view-model adapters

This keeps code modular as screens become fully production-grade.

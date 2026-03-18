# MedLifeCycle Backend Progress Tracker

Last updated: March 18, 2026

## Completed (Implemented and Working)

1. Core platform foundation
- NestJS backend scaffold with modular structure.
- Prisma + PostgreSQL schema and migrations.
- Docker compose for local Postgres/Redis.
- Environment-based configuration and local runbook.

2. Authentication and tenant boundary
- `POST /api/auth/register` and `POST /api/auth/login`.
- JWT auth strategy and guard.
- Role decorator + global role guard.
- Organization-level data isolation in service layer queries.

3. Lifecycle + patient domain
- Patient creation/list/detail APIs.
- Strict lifecycle stage transition engine (`1..10`) via `PATCH /api/patients/:id/stage`.
- Adjacent transition enforcement + prerequisite blockers.
- Lifecycle status endpoint with allowed transitions and blockers.
- Immutable lifecycle transition audit history endpoint.
- Idempotent stage hooks to trigger connected workflows during stage progression.
- Lifecycle updates connected to family notification events.

4. Document intelligence baseline
- Patient document upload endpoint and storage pipeline.
- Async extraction/classification flow with AI metadata parsing.
- Document listing endpoint by patient.
- Processing status model (`PENDING/PROCESSING/COMPLETED/FAILED`).

5. Family consent and notification backbone
- Family member account creation in-org.
- Consent grant/revoke APIs with audit records.
- Family-safe patient views and patient list for family accounts.
- Notification event stream + mark-as-read APIs.
- Notification triggers for grant, lifecycle change, and document events.

6. Clinical events + alerts (new)
- Clinical event model and alert model added to schema.
- APIs:
  - `POST /api/clinical-events/patient/:patientId`
  - `GET /api/clinical-events/patient/:patientId`
  - `GET /api/clinical-events/alerts/open`
  - `GET /api/clinical-events/alerts/patient/:patientId`
  - `PATCH /api/clinical-events/alerts/:alertId/status`
- Automatic alert creation on critical events.
- Family notifications for clinical events/alerts.
- Alert acknowledgement/resolution audit fields.

7. Clinical workflows baseline (orders + tasks + medications + prior-auth + referrals)
- Clinical order, care task, medication plan, prior authorization, referral handoff, and workflow audit models added.
- APIs:
  - `POST /api/clinical-workflows/patient/:patientId/orders`
  - `GET /api/clinical-workflows/patient/:patientId/orders`
  - `PATCH /api/clinical-workflows/orders/:orderId/status`
  - `POST /api/clinical-workflows/orders/:orderId/tasks`
  - `PATCH /api/clinical-workflows/tasks/:taskId/status`
  - `POST /api/clinical-workflows/patient/:patientId/medications`
  - `PATCH /api/clinical-workflows/medications/:planId`
  - `POST /api/clinical-workflows/patient/:patientId/prior-auths`
  - `PATCH /api/clinical-workflows/prior-auths/:priorAuthId/status`
  - `POST /api/clinical-workflows/patient/:patientId/referrals`
  - `PATCH /api/clinical-workflows/referrals/:referralId/status`
  - `POST /api/clinical-workflows/automation/overdue/run`
  - `GET /api/clinical-workflows/patient/:patientId/summary`
- Family notifications wired for order create/escalate/complete, medication updates, prior-auth submissions/decisions, and referral transitions.
- Workflow audit trail captures status transitions, including overdue automation escalations.

8. Dashboard baseline
- `GET /api/dashboard/overview`
- `GET /api/dashboard/patient/:patientId/timeline`
- Overview now includes clinical totals, open alerts, workflow KPIs (pending/escalated/overdue), prior-auth load, and referral load.
- Patient timeline now includes document + clinical event/alert + order/task/medication + prior-auth/referral timeline entries.

9. Automated validation
- Unit tests and e2e tests passing.
- e2e covers end-to-end admin -> patient -> family workflow, clinical alert flow, order/task/medication lifecycle, prior-auth updates, referral handoff, and overdue automation.
- Build/lint gates passing.

10. Realtime + channel delivery backbone
- Family realtime notification SSE stream endpoint added.
- Per-family-user channel preferences (in-app/email/sms/push/webhook) implemented.
- Durable `NotificationDelivery` outbox with retry/backoff and delivery status tracking added.
- Delivery dispatch operations API for care/admin teams added.
- Notification processing supports in-app + external webhook fanout pipelines.

## In Progress / Remaining for Guide-Level Parity

1. Advanced clinical workflow depth
- Rich prior-auth document exchange, payer polling callbacks, referral packet generation, and cross-team SLA assignment rules.

2. Real-time delivery channels expansion
- Dashboard-side realtime streams (doctor/admin operations surfaces) still pending.
- Provider-grade adapters (Twilio/SES/FCM, delivery receipts, templates) still pending.

3. Role-specific experiences
- Separate policy/view contracts for primary doctor vs specialist vs patient vs family.

4. Analytics depth
- KPI pack from startup guide section targets (SLA, turnaround, outcomes, escalation metrics).

5. Interoperability layer
- External EHR/FHIR connectors and sync pipelines.

6. Production hardening
- Secret management, observability, background worker scaling, and deployment pipeline checks.

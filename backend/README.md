# Aarogya360 Backend (MediLifecycle)

Production-oriented NestJS backend for multi-tenant patient lifecycle management, family consent access, and AI-assisted document workflows.

## Stack
- NestJS (TypeScript)
- PostgreSQL (Prisma ORM)
- Redis (local container available)
- JWT auth + role-based guards
- Multer upload pipeline + async document processing

## Roles
- `ADMIN`
- `DOCTOR`
- `SPECIALIST`
- `PATIENT`
- `FAMILY_MEMBER`

## Key Modules
- `auth`: register/login, JWT issuance
- `patients`: lifecycle and patient record CRUD
- `documents`: upload + parse + AI metadata extraction
- `ai`: query + clinical summaries
- `family-access`: consent grants/revocation, family patient views
- `notifications`: family event stream, realtime SSE updates, and multi-channel delivery dispatch
- `clinical-events`: event logging, alerting, acknowledgement/resolution workflows
- `clinical-workflows`: clinical orders, care tasks, medication plans, prior auth, referral handoffs, workflow audit + overdue automation
- `patients/lifecycle`: strict stage orchestration, transition audit, and stage hooks
- `dashboard`: org overview and patient timeline

## Prerequisites
- Node.js 20+
- npm 10+
- PostgreSQL running at `localhost:5432`
- Redis running at `localhost:6379` (if used by future jobs)

## Environment
Create `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/medlifecycle
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3005
JWT_SECRET=replace_with_strong_secret
LLM_ENDPOINT=http://localhost:1234/v1
LLM_MODEL=local-model
STORAGE_PATH=./data/uploads
ENCRYPTION_KEY=32_character_key_placeholder
NOTIFY_AUTO_DISPATCH=true
NOTIFY_MAX_ATTEMPTS=5
NOTIFY_WEBHOOK_TIMEOUT_MS=5000
NOTIFY_EMAIL_WEBHOOK_URL=
NOTIFY_EMAIL_WEBHOOK_TOKEN=
NOTIFY_SMS_WEBHOOK_URL=
NOTIFY_SMS_WEBHOOK_TOKEN=
NOTIFY_PUSH_WEBHOOK_URL=
NOTIFY_PUSH_WEBHOOK_TOKEN=
NOTIFY_WEBHOOK_TOKEN=
```

## Local Infrastructure
Start containers (Postgres + Redis):

```bash
cd /Users/sujeetkumarsingh/Desktop/MedLifeCycle/backend
docker compose up -d
```

## Install + Generate Client
```bash
cd /Users/sujeetkumarsingh/Desktop/MedLifeCycle/backend
npm install
npx prisma generate
```

## Migrations
Apply migrations (required before running server):

```bash
cd /Users/sujeetkumarsingh/Desktop/MedLifeCycle/backend
npx prisma migrate deploy
```

Current migration set includes:
- `20260317221437_init`
- `20260318000000_notification_type_bootstrap`
- `20260318005247_clinical_events_alerts`
- `20260318006000_notification_type_shadow_cleanup`
- `20260318070000_family_access_notifications`
- `20260318080000_notification_type_clinical_values`
- `20260318010635_clinical_workflows_orders_medications`
- `20260318013500_prior_auth_referral_handoffs`
- `20260318020000_lifecycle_orchestration`
- `20260318024500_notification_realtime_delivery`

## Run
Development:

```bash
cd /Users/sujeetkumarsingh/Desktop/MedLifeCycle/backend
npm run start:dev
```

Base URL:
- `http://localhost:3005/api` (or your `PORT`)

## Quality Gates
Run all backend checks:

```bash
cd /Users/sujeetkumarsingh/Desktop/MedLifeCycle/backend
npm run build
npm run lint
npm test -- --runInBand
npm run test:e2e
```

## Production API Surface
Reference:
- `/Users/sujeetkumarsingh/Desktop/MedLifeCycle/api_docs/api_documentation.txt`

Major endpoint groups:
- `/auth/*`
- `/patients/*`
- `/documents/*`
- `/ai/*`
- `/family-access/*`
- `/notifications/*`
- `/clinical-events/*`
- `/clinical-workflows/*`
- `/dashboard/*`

## Notes for Production Readiness
- Keep migrations versioned and applied in deploy pipeline.
- Use strong `JWT_SECRET` and environment-specific secrets management.
- Put upload storage on secure persistent storage for production.
- Keep notification channel adapters configured and monitored (`NOTIFY_*` envs).
- Expand integration tests for clinical workflows and incident paths.

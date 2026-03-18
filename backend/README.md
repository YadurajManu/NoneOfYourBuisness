# Aarogya360 Backend (MediLifecycle)

Production-oriented NestJS backend for multi-tenant patient lifecycle management, role-based portal APIs, family consent access, demo lead intake, and AI-assisted document workflows.

## Stack
- NestJS (TypeScript)
- PostgreSQL (Prisma ORM)
- Redis (optional local container available)
- JWT auth + role-based guards
- Multer upload pipeline + async document processing

## Roles
- `ADMIN`
- `DOCTOR`
- `SPECIALIST`
- `PATIENT`
- `FAMILY_MEMBER`

## Key Modules
- `auth`: register/login/refresh/logout/me session flow
- `patients`: patient lifecycle and stage transitions
- `documents`: upload + processing + metadata extraction
- `ai`: query + summary endpoints
- `family-access`: consent grants, notifications, SSE stream, structured questions
- `notifications`: delivery queue operations
- `clinical-events`: event and alert workflows
- `clinical-workflows`: orders/tasks/medications/prior-auth/referrals/automation
- `dashboard`: overview, patient timeline, role-aware caseload
- `leads`: public lead intake + admin lead operations
- `admin`: org user management + audit feed
- `patient-portal`: patient self-service APIs

## Prerequisites
- Node.js 20+
- npm 10+
- PostgreSQL at `localhost:5432`
- Redis at `localhost:6379` (if enabled)

## Environment
Create `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/medlifecycle
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3100
JWT_SECRET=replace_with_strong_secret
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN_DAYS=14
COOKIE_DOMAIN=
COOKIE_SAME_SITE=lax
CORS_ALLOWED_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
PUBLIC_RATE_LIMIT_WINDOW_MS=60000
PUBLIC_RATE_LIMIT_MAX=30
ENABLE_PUBLIC_LEADS=true
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

```bash
cd /Users/sujeetkumarsingh/Desktop/MedLifeCycle/backend
docker compose up -d
```

## Install + Prisma Client

```bash
cd /Users/sujeetkumarsingh/Desktop/MedLifeCycle/backend
npm install
npx prisma generate
```

## Migrations

```bash
cd /Users/sujeetkumarsingh/Desktop/MedLifeCycle/backend
npx prisma migrate deploy
```

## Run Backend Locally

```bash
cd /Users/sujeetkumarsingh/Desktop/MedLifeCycle/backend
npm run start:dev
```

Local base URL:
- `http://localhost:3100/api` (from current `.env`)
- If `PORT` is not set, app fallback is `3005`.

## Quality Checks

```bash
cd /Users/sujeetkumarsingh/Desktop/MedLifeCycle/backend
npm run build
npm run lint
npm test -- --runInBand
npm run test:e2e
```

## API Documentation
- `/Users/sujeetkumarsingh/Desktop/MedLifeCycle/api_docs/api_documentation.txt`

## Production Notes
- Keep migrations in deployment pipeline.
- Use strong secrets manager for `JWT_SECRET` and webhook tokens.
- Configure CORS and cookie domain/same-site before hosted use.
- Move upload storage to persistent secure storage in production.

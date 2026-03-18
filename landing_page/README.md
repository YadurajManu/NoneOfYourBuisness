# Aarogya360 Landing + Portal Frontend

Single React/Vite app containing:
- public marketing pages
- authenticated role-based portal under `/portal/*`

## Setup

```bash
cd /Users/sujeetkumarsingh/Desktop/MedLifeCycle/landing_page
npm install
```

Create `.env` (or `.env.local`):

```env
VITE_API_BASE_URL=/api
VITE_APP_ENV=development
VITE_DEV_API_PROXY=http://localhost:3100
```

Notes:
- `VITE_API_BASE_URL=/api` works for same-domain reverse proxy or Vite dev proxy.
- For separate API domain, set `VITE_API_BASE_URL` to full backend URL, for example `https://api.yourdomain.com/api`.
- `VITE_DEV_API_PROXY` should match your local backend port.

## Run

```bash
cd /Users/sujeetkumarsingh/Desktop/MedLifeCycle/landing_page
npm run dev
```

Local frontend:
- `http://localhost:8080`

## Build

```bash
npm run build
npm run preview
```

## Portal Routes

- `/portal/login`
- `/portal/admin`, `/portal/admin/leads`, `/portal/admin/users`
- `/portal/doctor`, `/portal/doctor/caseload`
- `/portal/specialist`, `/portal/specialist/caseload`
- `/portal/patient`, `/portal/patient/family-access`
- `/portal/family`, `/portal/family/questions`

## Auth Session Model

- Access token in memory only
- Refresh token in HttpOnly cookie (`/api/auth`)
- Refresh on app bootstrap when prior session marker exists
- One retry-on-401 strategy for authenticated API calls

## Structure Reference
- `/Users/sujeetkumarsingh/Desktop/MedLifeCycle/documentation/portal_frontend_structure.md`

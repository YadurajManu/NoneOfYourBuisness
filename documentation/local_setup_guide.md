# MedLifeCycle: Local Setup & Development Guide

Follow these steps to get the MedLifeCycle backend running on your local machine.

## 1. Prerequisites
Ensure you have the following installed:
- **Node.js** (v18 or higher)
- **PostgreSQL** (v14 or higher) with `pgvector` extension
- **Redis** (running locally on port 6379)
- **Docker & Docker Compose** (optional, for a quick start)

## 2. Environment Configuration
Create a `.env` file in the root directory:
```bash
PORT=3001
DB_URL=postgresql://localhost:5432/medlifecycle
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_key
STORAGE_PATH=./documentation/storage
ENCRYPTION_KEY=32_character_hex_key
```

## 3. Database Initialization
1. Create the database: `createdb medlifecycle`
2. Run migrations: `npm run migrate`
3. (Optional) Seed with test patients: `npm run seed`

## 4. Running the Backend
```bash
# Install dependencies
npm install

# Start in development mode
npm run dev
```

## 5. Local Services Summary
- **API Endpoints:** `http://localhost:3001/api/...`
- **Patient Portal:** Accessible via local frontend build.
- **Admin Dashboard:** `http://localhost:3001/admin`
- **Document Store:** Files located in `./documentation/storage`.

## 6. Testing the Workflow
1. **Register a Patient:** Use the API or Admin UI.
2. **Upload a Document:** The file will be saved locally and encrypted.
3. **Trigger AI:** The AI will process the local file and generate a summary in the DB.
4. **Stage Transition:** Advance the patient through the 10-stage lifecycle.

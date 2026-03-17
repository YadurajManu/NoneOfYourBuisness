# MedLifeCycle: Backend Implementation Roadmap

This document outlines the step-by-step plan to build the MedLifeCycle backend locally on your laptop.

## 1. Technical Stack (Local-First)

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | **NestJS (TypeScript)** | Enterprise-grade, modular, and highly scalable. |
| **Database** | **PostgreSQL + pgvector** | Reliable relational data + local vector search for AI. |
| **ORM** | **Prisma** | Modern type-safe database access and easy migrations. |
| **Cache/Queue**| **Redis** | Fast background task processing (AI extraction/alerts). |
| **AI Engine** | **LangChain + Ollama** | Running LLMs (like Llama 3) entirely on your laptop. |
| **Storage** | **Local Filesystem** | Simple, fast, and secure for development. |
| **Orchestration**| **Docker Compose** | One command to start all local services. |

---

## 2. Phase-by-Phase Plan

### Phase 1: The Foundation (Week 1)
*   **Init Project:** Scaffold NestJS application with standard workspace structure.
*   **Infrastructure:** Create `docker-compose.yml` for local Postgres and Redis.
*   **Database:** Define FHIR-first schema in Prisma and run initial migrations.
*   **Multi-Tenancy:** Implement Row-Level Security (RLS) or organizational guards.

### Phase 2: Identity & Access (Week 1-2)
*   **User Auth:** Local JWT-based authentication (Login/Register).
*   **Role Mapping:** Implement RBAC for Doctors, Admins, and Patients.
*   **Audit Trail:** Setup a middleware to log every clinical record change.

### Phase 3: Patient Lifecycle (Week 2-3)
*   **Patient CRUD:** Basic FHIR-compliant patient management.
*   **State Machine:** Implement the 10-stage lifecycle logic (Referral -> Intake -> ... -> Care).
*   **Clinical Records:** Support for Vitals, Lab results, and Medications.

### Phase 4: AI & Document Intelligence (Week 3-4)
*   **Local Storage:** Encrypted file upload logic.
*   **AI Orchestrator:** Integration with Ollama for local document summarization.
*   **Vector Search:** Store clinical notes in `pgvector` for semantic querying.

---

## 3. How We Start (The First Command)
We will begin by creating the backend folder and setting up the core NestJS structure.

```bash
# We will run this soon:
mkdir backend
cd backend
npx -y nest new . --package-manager npm
```

## 4. Documentation We'll Use
We will constantly reference the following files during implementation:
- [local_architecture.md](local_architecture.md): The overall system blueprint.
- [data_schema.md](data_schema.md): The database structure.
- [local_setup_guide.md](local_setup_guide.md): Environment config templates.

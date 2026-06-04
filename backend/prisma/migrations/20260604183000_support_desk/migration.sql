CREATE TYPE "SupportTicketCategory" AS ENUM (
  'ACCOUNT_LOGIN',
  'PATIENT_INTAKE',
  'DOCUMENT_UPLOAD',
  'CARE_TEAM_ASSIGNMENT',
  'FAMILY_ACCESS_CONSENT',
  'CLINICAL_WORKFLOW',
  'BILLING_ADMIN',
  'TECHNICAL_ISSUE',
  'OTHER'
);

CREATE TYPE "SupportTicketPriority" AS ENUM (
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT'
);

CREATE TYPE "SupportTicketStatus" AS ENUM (
  'OPEN',
  'IN_REVIEW',
  'WAITING_ON_USER',
  'RESOLVED',
  'CLOSED'
);

CREATE TABLE "SupportTicket" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "assignedToUserId" TEXT,
  "patientId" TEXT,
  "category" "SupportTicketCategory" NOT NULL,
  "priority" "SupportTicketPriority" NOT NULL DEFAULT 'NORMAL',
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
  "subject" TEXT NOT NULL,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportMessage" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "senderUserId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportTicket_organizationId_status_priority_createdAt_idx" ON "SupportTicket"("organizationId", "status", "priority", "createdAt");
CREATE INDEX "SupportTicket_createdByUserId_status_createdAt_idx" ON "SupportTicket"("createdByUserId", "status", "createdAt");
CREATE INDEX "SupportTicket_assignedToUserId_status_createdAt_idx" ON "SupportTicket"("assignedToUserId", "status", "createdAt");
CREATE INDEX "SupportTicket_patientId_status_createdAt_idx" ON "SupportTicket"("patientId", "status", "createdAt");
CREATE INDEX "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");
CREATE INDEX "SupportMessage_senderUserId_createdAt_idx" ON "SupportMessage"("senderUserId", "createdAt");

ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

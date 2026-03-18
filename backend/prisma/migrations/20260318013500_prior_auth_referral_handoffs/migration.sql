-- CreateEnum
CREATE TYPE "PriorAuthorizationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'DENIED', 'APPEALED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReferralDestinationType" AS ENUM ('INTERNAL_PROVIDER', 'EXTERNAL_PROVIDER', 'FACILITY', 'HOME_CARE');

-- CreateEnum
CREATE TYPE "ReferralHandoffStatus" AS ENUM ('CREATED', 'ACCEPTED', 'IN_PROGRESS', 'ESCALATED', 'COMPLETED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReferralPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PRIOR_AUTH_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PRIOR_AUTH_DECISION';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFERRAL_CREATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFERRAL_STATUS_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFERRAL_OVERDUE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkflowAuditAction" ADD VALUE IF NOT EXISTS 'PRIOR_AUTH_CREATED';
ALTER TYPE "WorkflowAuditAction" ADD VALUE IF NOT EXISTS 'PRIOR_AUTH_STATUS_UPDATED';
ALTER TYPE "WorkflowAuditAction" ADD VALUE IF NOT EXISTS 'REFERRAL_CREATED';
ALTER TYPE "WorkflowAuditAction" ADD VALUE IF NOT EXISTS 'REFERRAL_STATUS_UPDATED';
ALTER TYPE "WorkflowAuditAction" ADD VALUE IF NOT EXISTS 'AUTOMATION_OVERDUE_RUN';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkflowEntityType" ADD VALUE IF NOT EXISTS 'PRIOR_AUTH';
ALTER TYPE "WorkflowEntityType" ADD VALUE IF NOT EXISTS 'REFERRAL';

-- CreateTable
CREATE TABLE "PriorAuthorization" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicalOrderId" TEXT,
    "requestedByUserId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "payerName" TEXT NOT NULL,
    "policyNumber" TEXT,
    "serviceCodes" JSONB,
    "requestPayload" JSONB,
    "status" "PriorAuthorizationStatus" NOT NULL DEFAULT 'DRAFT',
    "externalReference" TEXT,
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriorAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralHandoff" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicalOrderId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "destinationType" "ReferralDestinationType" NOT NULL,
    "destinationName" TEXT NOT NULL,
    "reason" TEXT,
    "priority" "ReferralPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ReferralHandoffStatus" NOT NULL DEFAULT 'CREATED',
    "dueAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralHandoff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriorAuthorization_organizationId_status_createdAt_idx" ON "PriorAuthorization"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PriorAuthorization_patientId_status_createdAt_idx" ON "PriorAuthorization"("patientId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PriorAuthorization_clinicalOrderId_status_createdAt_idx" ON "PriorAuthorization"("clinicalOrderId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ReferralHandoff_organizationId_status_priority_dueAt_idx" ON "ReferralHandoff"("organizationId", "status", "priority", "dueAt");

-- CreateIndex
CREATE INDEX "ReferralHandoff_patientId_status_dueAt_idx" ON "ReferralHandoff"("patientId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "ReferralHandoff_clinicalOrderId_status_dueAt_idx" ON "ReferralHandoff"("clinicalOrderId", "status", "dueAt");

-- AddForeignKey
ALTER TABLE "PriorAuthorization" ADD CONSTRAINT "PriorAuthorization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorAuthorization" ADD CONSTRAINT "PriorAuthorization_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorAuthorization" ADD CONSTRAINT "PriorAuthorization_clinicalOrderId_fkey" FOREIGN KEY ("clinicalOrderId") REFERENCES "ClinicalOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorAuthorization" ADD CONSTRAINT "PriorAuthorization_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorAuthorization" ADD CONSTRAINT "PriorAuthorization_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralHandoff" ADD CONSTRAINT "ReferralHandoff_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralHandoff" ADD CONSTRAINT "ReferralHandoff_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralHandoff" ADD CONSTRAINT "ReferralHandoff_clinicalOrderId_fkey" FOREIGN KEY ("clinicalOrderId") REFERENCES "ClinicalOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralHandoff" ADD CONSTRAINT "ReferralHandoff_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralHandoff" ADD CONSTRAINT "ReferralHandoff_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

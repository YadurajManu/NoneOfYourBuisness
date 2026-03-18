-- CreateEnum
CREATE TYPE "ClinicalOrderType" AS ENUM ('LAB_TEST', 'IMAGING', 'PROCEDURE', 'MEDICATION', 'CONSULTATION', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "ClinicalOrderPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'STAT');

-- CreateEnum
CREATE TYPE "ClinicalOrderStatus" AS ENUM ('DRAFT', 'ACTIVE', 'IN_PROGRESS', 'ESCALATED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MedicationPlanStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "CareTaskType" AS ENUM ('PRE_AUTH', 'SCHEDULING', 'FOLLOW_UP', 'LAB_COLLECTION', 'MEDICATION_REVIEW', 'PATIENT_EDUCATION');

-- CreateEnum
CREATE TYPE "CareTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'ESCALATED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkflowAuditAction" AS ENUM ('ORDER_CREATED', 'ORDER_STATUS_UPDATED', 'ORDER_ESCALATED', 'ORDER_COMPLETED', 'TASK_CREATED', 'TASK_STATUS_UPDATED', 'MEDICATION_PLAN_CREATED', 'MEDICATION_PLAN_UPDATED');

-- CreateEnum
CREATE TYPE "WorkflowEntityType" AS ENUM ('ORDER', 'TASK', 'MEDICATION_PLAN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CLINICAL_ORDER_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'CLINICAL_ORDER_ESCALATED';
ALTER TYPE "NotificationType" ADD VALUE 'CLINICAL_ORDER_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE 'MEDICATION_PLAN_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'CARE_TASK_OVERDUE';

-- CreateTable
CREATE TABLE "ClinicalOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "type" "ClinicalOrderType" NOT NULL,
    "priority" "ClinicalOrderPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ClinicalOrderStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicalOrderId" TEXT,
    "prescribedByUserId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "route" TEXT,
    "instructions" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "MedicationPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareTask" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicalOrderId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "type" "CareTaskType" NOT NULL,
    "status" "CareTaskStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowAudit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" "WorkflowAuditAction" NOT NULL,
    "entityType" "WorkflowEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicalOrder_organizationId_status_priority_createdAt_idx" ON "ClinicalOrder"("organizationId", "status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "ClinicalOrder_patientId_status_dueAt_idx" ON "ClinicalOrder"("patientId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "ClinicalOrder_assignedToUserId_status_dueAt_idx" ON "ClinicalOrder"("assignedToUserId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "MedicationPlan_organizationId_status_startDate_idx" ON "MedicationPlan"("organizationId", "status", "startDate");

-- CreateIndex
CREATE INDEX "MedicationPlan_patientId_status_startDate_idx" ON "MedicationPlan"("patientId", "status", "startDate");

-- CreateIndex
CREATE INDEX "CareTask_organizationId_status_dueAt_idx" ON "CareTask"("organizationId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "CareTask_patientId_status_dueAt_idx" ON "CareTask"("patientId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "CareTask_clinicalOrderId_status_dueAt_idx" ON "CareTask"("clinicalOrderId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "WorkflowAudit_organizationId_patientId_createdAt_idx" ON "WorkflowAudit"("organizationId", "patientId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowAudit_entityType_entityId_createdAt_idx" ON "WorkflowAudit"("entityType", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationPlan" ADD CONSTRAINT "MedicationPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationPlan" ADD CONSTRAINT "MedicationPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationPlan" ADD CONSTRAINT "MedicationPlan_clinicalOrderId_fkey" FOREIGN KEY ("clinicalOrderId") REFERENCES "ClinicalOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationPlan" ADD CONSTRAINT "MedicationPlan_prescribedByUserId_fkey" FOREIGN KEY ("prescribedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_clinicalOrderId_fkey" FOREIGN KEY ("clinicalOrderId") REFERENCES "ClinicalOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAudit" ADD CONSTRAINT "WorkflowAudit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAudit" ADD CONSTRAINT "WorkflowAudit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAudit" ADD CONSTRAINT "WorkflowAudit_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

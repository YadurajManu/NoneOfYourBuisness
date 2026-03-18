-- CreateEnum
CREATE TYPE "FamilyAccessLevel" AS ENUM ('VIEW_ONLY', 'FULL_UPDATES', 'EMERGENCY_CONTACT');

-- CreateEnum
CREATE TYPE "FamilyAccessStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "FamilyAccessAction" AS ENUM ('GRANTED', 'REVOKED', 'VIEWED_PATIENT', 'VIEWED_DOCUMENTS', 'VIEWED_NOTIFICATIONS');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ACCESS_GRANTED', 'ACCESS_REVOKED', 'LIFECYCLE_STAGE_CHANGED', 'DOCUMENT_UPLOADED', 'DOCUMENT_PROCESSED', 'DOCUMENT_FAILED');

-- AlterEnum
BEGIN;
CREATE TYPE "DocStatus_new" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
ALTER TABLE "Document" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Document" ALTER COLUMN "status" TYPE "DocStatus_new" USING ("status"::text::"DocStatus_new");
ALTER TYPE "DocStatus" RENAME TO "DocStatus_old";
ALTER TYPE "DocStatus_new" RENAME TO "DocStatus";
DROP TYPE "DocStatus_old";
ALTER TABLE "Document" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'FAMILY_MEMBER';

-- CreateTable
CREATE TABLE "PatientFamilyAccess" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "familyUserId" TEXT NOT NULL,
    "grantedByUserId" TEXT NOT NULL,
    "accessLevel" "FamilyAccessLevel" NOT NULL DEFAULT 'VIEW_ONLY',
    "status" "FamilyAccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "consentNote" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientFamilyAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "familyUserId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "payload" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyAccessAudit" (
    "id" TEXT NOT NULL,
    "accessId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "familyUserId" TEXT NOT NULL,
    "action" "FamilyAccessAction" NOT NULL,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyAccessAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientFamilyAccess_familyUserId_status_idx" ON "PatientFamilyAccess"("familyUserId", "status");

-- CreateIndex
CREATE INDEX "PatientFamilyAccess_patientId_status_idx" ON "PatientFamilyAccess"("patientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PatientFamilyAccess_patientId_familyUserId_key" ON "PatientFamilyAccess"("patientId", "familyUserId");

-- CreateIndex
CREATE INDEX "NotificationEvent_familyUserId_isRead_createdAt_idx" ON "NotificationEvent"("familyUserId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationEvent_patientId_createdAt_idx" ON "NotificationEvent"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "FamilyAccessAudit_patientId_createdAt_idx" ON "FamilyAccessAudit"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "FamilyAccessAudit_familyUserId_createdAt_idx" ON "FamilyAccessAudit"("familyUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "PatientFamilyAccess" ADD CONSTRAINT "PatientFamilyAccess_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientFamilyAccess" ADD CONSTRAINT "PatientFamilyAccess_familyUserId_fkey" FOREIGN KEY ("familyUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientFamilyAccess" ADD CONSTRAINT "PatientFamilyAccess_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_familyUserId_fkey" FOREIGN KEY ("familyUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyAccessAudit" ADD CONSTRAINT "FamilyAccessAudit_accessId_fkey" FOREIGN KEY ("accessId") REFERENCES "PatientFamilyAccess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyAccessAudit" ADD CONSTRAINT "FamilyAccessAudit_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyAccessAudit" ADD CONSTRAINT "FamilyAccessAudit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

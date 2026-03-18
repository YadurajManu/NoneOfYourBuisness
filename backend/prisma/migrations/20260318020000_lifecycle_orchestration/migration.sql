-- CreateEnum
CREATE TYPE "LifecycleTransitionType" AS ENUM ('MANUAL', 'AUTOMATED');

-- CreateEnum
CREATE TYPE "LifecycleHookStatus" AS ENUM ('PENDING', 'APPLIED', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "PatientLifecycleTransition" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "fromStage" INTEGER NOT NULL,
    "toStage" INTEGER NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "transitionType" "LifecycleTransitionType" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientLifecycleTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LifecycleHookExecution" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "fromStage" INTEGER NOT NULL,
    "toStage" INTEGER NOT NULL,
    "hookKey" TEXT NOT NULL,
    "status" "LifecycleHookStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "errorMessage" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LifecycleHookExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientLifecycleTransition_organizationId_patientId_created_idx" ON "PatientLifecycleTransition"("organizationId", "patientId", "createdAt");

-- CreateIndex
CREATE INDEX "PatientLifecycleTransition_patientId_fromStage_toStage_crea_idx" ON "PatientLifecycleTransition"("patientId", "fromStage", "toStage", "createdAt");

-- CreateIndex
CREATE INDEX "LifecycleHookExecution_organizationId_patientId_executedAt_idx" ON "LifecycleHookExecution"("organizationId", "patientId", "executedAt");

-- CreateIndex
CREATE INDEX "LifecycleHookExecution_organizationId_status_executedAt_idx" ON "LifecycleHookExecution"("organizationId", "status", "executedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LifecycleHookExecution_patientId_toStage_hookKey_key" ON "LifecycleHookExecution"("patientId", "toStage", "hookKey");

-- AddForeignKey
ALTER TABLE "PatientLifecycleTransition" ADD CONSTRAINT "PatientLifecycleTransition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientLifecycleTransition" ADD CONSTRAINT "PatientLifecycleTransition_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientLifecycleTransition" ADD CONSTRAINT "PatientLifecycleTransition_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifecycleHookExecution" ADD CONSTRAINT "LifecycleHookExecution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifecycleHookExecution" ADD CONSTRAINT "LifecycleHookExecution_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifecycleHookExecution" ADD CONSTRAINT "LifecycleHookExecution_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


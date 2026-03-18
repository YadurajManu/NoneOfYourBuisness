-- CreateTable
CREATE TABLE "FamilyAccessInvite" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "familyUserId" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "accessLevel" "FamilyAccessLevel" NOT NULL,
    "consentNote" TEXT,
    "expiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "responseNote" TEXT,
    "respondedByUserId" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyAccessInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FamilyAccessInvite_organizationId_patientId_status_createdAt_idx" ON "FamilyAccessInvite"("organizationId", "patientId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "FamilyAccessInvite_familyUserId_status_createdAt_idx" ON "FamilyAccessInvite"("familyUserId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "FamilyAccessInvite" ADD CONSTRAINT "FamilyAccessInvite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyAccessInvite" ADD CONSTRAINT "FamilyAccessInvite_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyAccessInvite" ADD CONSTRAINT "FamilyAccessInvite_familyUserId_fkey" FOREIGN KEY ("familyUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyAccessInvite" ADD CONSTRAINT "FamilyAccessInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyAccessInvite" ADD CONSTRAINT "FamilyAccessInvite_respondedByUserId_fkey" FOREIGN KEY ("respondedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TYPE "DirectMessagePriority" AS ENUM ('NORMAL', 'IMPORTANT', 'URGENT');

ALTER TABLE "DirectMessage"
ADD COLUMN "patientId" TEXT,
ADD COLUMN "documentId" TEXT,
ADD COLUMN "priority" "DirectMessagePriority" NOT NULL DEFAULT 'NORMAL';

CREATE INDEX "DirectMessage_patientId_createdAt_idx" ON "DirectMessage"("patientId", "createdAt");
CREATE INDEX "DirectMessage_documentId_createdAt_idx" ON "DirectMessage"("documentId", "createdAt");
CREATE INDEX "DirectMessage_priority_createdAt_idx" ON "DirectMessage"("priority", "createdAt");

ALTER TABLE "DirectMessage"
ADD CONSTRAINT "DirectMessage_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DirectMessage"
ADD CONSTRAINT "DirectMessage_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "Document"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

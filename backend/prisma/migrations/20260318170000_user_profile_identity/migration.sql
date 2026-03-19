ALTER TABLE "User"
  ADD COLUMN "displayName" TEXT,
  ADD COLUMN "avatarPath" TEXT,
  ADD COLUMN "avatarMimeType" TEXT,
  ADD COLUMN "avatarUpdatedAt" TIMESTAMP(3);

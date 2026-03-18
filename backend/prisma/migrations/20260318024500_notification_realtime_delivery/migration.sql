-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "NotificationChannelPreference" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "familyUserId" TEXT NOT NULL,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "webhookEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailAddress" TEXT,
    "phoneNumber" TEXT,
    "pushToken" TEXT,
    "webhookUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationChannelPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "notificationEventId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "familyUserId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "providerResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationChannelPreference_familyUserId_idx" ON "NotificationChannelPreference"("familyUserId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationChannelPreference_organizationId_familyUserId_key" ON "NotificationChannelPreference"("organizationId", "familyUserId");

-- CreateIndex
CREATE INDEX "NotificationDelivery_organizationId_status_nextAttemptAt_cr_idx" ON "NotificationDelivery"("organizationId", "status", "nextAttemptAt", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_familyUserId_status_createdAt_idx" ON "NotificationDelivery"("familyUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_notificationEventId_channel_idx" ON "NotificationDelivery"("notificationEventId", "channel");

-- AddForeignKey
ALTER TABLE "NotificationChannelPreference" ADD CONSTRAINT "NotificationChannelPreference_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationChannelPreference" ADD CONSTRAINT "NotificationChannelPreference_familyUserId_fkey" FOREIGN KEY ("familyUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationEventId_fkey" FOREIGN KEY ("notificationEventId") REFERENCES "NotificationEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_familyUserId_fkey" FOREIGN KEY ("familyUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "NotificationDelivery"
ADD CONSTRAINT "NotificationDelivery_notificationEventId_fkey"
FOREIGN KEY ("notificationEventId")
REFERENCES "NotificationEvent"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

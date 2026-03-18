DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'NotificationType'
  ) AND to_regclass('"NotificationEvent"') IS NULL THEN
    DROP TYPE "NotificationType";
  END IF;
END
$$;

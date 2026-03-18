DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'NotificationType'
  ) THEN
    CREATE TYPE "NotificationType" AS ENUM (
      'ACCESS_GRANTED',
      'ACCESS_REVOKED',
      'LIFECYCLE_STAGE_CHANGED',
      'DOCUMENT_UPLOADED',
      'DOCUMENT_PROCESSED',
      'DOCUMENT_FAILED'
    );
  END IF;
END
$$;

CREATE TYPE "RecurrenceFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'YEARLY');

ALTER TABLE "Transaction"
ADD COLUMN "recurrenceFrequency" "RecurrenceFrequency",
ADD COLUMN "nextOccurrenceAt" TIMESTAMPTZ(6);

ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_recurrence_schedule_consistency_check"
CHECK (
  ("recurrenceFrequency" IS NULL AND "nextOccurrenceAt" IS NULL)
  OR ("recurrenceFrequency" IS NOT NULL AND "nextOccurrenceAt" IS NOT NULL)
);

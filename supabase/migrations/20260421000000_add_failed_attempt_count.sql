-- Session 7c: track Stripe's invoice.attempt_count at the most recent
-- payment failure. Drives which banner variant (1/2/3) renders on
-- /app/record when subscriptions.status = 'past_due'.
-- 0 = no failed attempts (default). 1+ = failed attempts.

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS last_failed_attempt_count INTEGER NOT NULL DEFAULT 0;

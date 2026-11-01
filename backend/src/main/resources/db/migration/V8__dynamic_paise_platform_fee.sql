-- V8: Dynamic Paise Allocation Engine & Platform Verification Fee Hardening

-- 1. Add base_amount and platform_fee to payment_attempts
ALTER TABLE payment_attempts
    ADD COLUMN IF NOT EXISTS base_amount NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(12, 2) DEFAULT 0.00 NOT NULL;

-- 2. Backfill existing records
UPDATE payment_attempts
SET base_amount = amount, platform_fee = 0.00
WHERE base_amount IS NULL;

-- 3. Make base_amount NOT NULL now that it is backfilled
ALTER TABLE payment_attempts
    ALTER COLUMN base_amount SET NOT NULL;

-- 4. Constraint for multi-user concurrency on same receiving account:
-- Uniqueness on (receiving_account, amount) where status IN ('INITIATED', 'AWAITING_PAYMENT', 'PROCESSING')
-- Ensures each active checkout waiting for payment has a globally unique fractional amount
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_attempts_active_account_amount
    ON payment_attempts (receiving_account, amount)
    WHERE status IN ('INITIATED', 'AWAITING_PAYMENT', 'PROCESSING')
      AND receiving_account IS NOT NULL;

-- 5. Index for fast active attempts lookup by base_amount and receiving_account for the allocation engine
CREATE INDEX IF NOT EXISTS idx_payment_attempts_active_base_amount
    ON payment_attempts (receiving_account, base_amount)
    WHERE status IN ('INITIATED', 'AWAITING_PAYMENT', 'PROCESSING');

-- V6: YouPI-PG payment hardening, observer support, idempotent deduplication, and reconciliation

-- 1. Enhance payment_attempts
ALTER TABLE payment_attempts
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS checkout_url TEXT,
    ADD COLUMN IF NOT EXISTS queue_position INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS receiving_account VARCHAR(100),
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS utr VARCHAR(64),
    ADD COLUMN IF NOT EXISTS verification_level INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS settlement_status VARCHAR(50) DEFAULT 'NOT_RECONCILED',
    ADD COLUMN IF NOT EXISTS request_fingerprint VARCHAR(128);

-- Backfill user_id from orders where missing
UPDATE payment_attempts pa
SET user_id = o.user_id
FROM orders o
WHERE pa.order_id = o.id AND pa.user_id IS NULL;

-- 2. Constraints and Indexes on payment_attempts
-- Provider-scoped reference uniqueness when set
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_attempts_provider_ref
    ON payment_attempts (provider, provider_reference)
    WHERE provider_reference IS NOT NULL;

-- Account-scoped transaction reference (UTR) deduplication
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_attempts_account_utr
    ON payment_attempts (receiving_account, utr)
    WHERE receiving_account IS NOT NULL AND utr IS NOT NULL;

-- Only ONE active payment attempt per order at any time
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_attempts_active_order
    ON payment_attempts (order_id)
    WHERE status IN ('INITIATED', 'QUEUED', 'AWAITING_PAYMENT', 'PROCESSING');

-- 3. Enhance webhook_event_inbox
ALTER TABLE webhook_event_inbox
    ADD COLUMN IF NOT EXISTS payload_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS attempt_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS order_id UUID,
    ADD COLUMN IF NOT EXISTS payment_attempt_id UUID;

-- 4. Manual bank reconciliation audit records
CREATE TABLE IF NOT EXISTS bank_reconciliation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_attempt_id UUID NOT NULL REFERENCES payment_attempts(id),
    bank_reference_number VARCHAR(64) NOT NULL,
    receiving_account VARCHAR(100) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    reconciled_by UUID NOT NULL REFERENCES users(id),
    statement_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Manual refund audit records
CREATE TABLE IF NOT EXISTS payment_refund_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_attempt_id UUID NOT NULL REFERENCES payment_attempts(id),
    order_id UUID NOT NULL REFERENCES orders(id),
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    reason TEXT NOT NULL,
    reference_number VARCHAR(100),
    recorded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

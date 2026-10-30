-- BakeConnect Database Schema Migration V5
-- Adds Bakery Manager role, Staff Notifications inbox, Customer Support Issues workflow,
-- Inventory Audit Trail, and Offline Payment Records.

-- 1. Staff Notifications Table (for real-time order notifications and persistent inbox)
CREATE TABLE IF NOT EXISTS staff_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    order_number VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'B2C',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_notifications_read ON staff_notifications (is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_order_id ON staff_notifications (order_id);

-- 2. Customer & Retailer Issues (Support Tickets associated with orders)
CREATE TABLE IF NOT EXISTS customer_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL,
    short_description VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_issues_user_id ON customer_issues (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_issues_status ON customer_issues (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_issues_order_id ON customer_issues (order_id);

-- 3. Customer Issue Messages & Staff Notes
CREATE TABLE IF NOT EXISTS issue_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES customer_issues(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_internal_note BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_issue_messages_issue_id ON issue_messages (issue_id, created_at ASC);

-- 4. Inventory Audit Logs (Reason code and staff tracking for stock adjustments)
CREATE TABLE IF NOT EXISTS inventory_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    adjusted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    previous_quantity INT NOT NULL,
    new_quantity INT NOT NULL,
    change_amount INT NOT NULL,
    reason_code VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_audit_product ON inventory_audit_logs (product_id, created_at DESC);

-- 5. Offline Recorded Payments
CREATE TABLE IF NOT EXISTS offline_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    recorded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_offline_payments_order ON offline_payments (order_id);
CREATE INDEX IF NOT EXISTS idx_offline_payments_invoice ON offline_payments (invoice_id);

-- 6. Seed Default Bakery Manager (Password: Password@123)
INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active, is_email_verified, created_at, updated_at)
VALUES (
    '66666666-6666-6666-6666-666666666666',
    'manager@bakeconnect.com',
    '$2b$12$Dp6ryG/A4iuhbqvZeex4qe8q8o6hu5Lqc.wNmXDn8EyBBmm1Vq9Lu',
    'Sunil Joshi (Bakery Manager)',
    '9820598205',
    'BAKERY_MANAGER',
    TRUE,
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET role = 'BAKERY_MANAGER';

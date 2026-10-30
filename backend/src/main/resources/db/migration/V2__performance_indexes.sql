-- BakeConnect Database Performance Indexes V2
-- Optimized for 1,000 Concurrent Virtual Users (VUs) and Real-Time Operational Latency

-- 1. Catalog & Search Queries
CREATE INDEX idx_products_active_available_cat ON products(is_active, is_available, category_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_categories_active_display ON categories(is_active, display_order);

-- 2. Orders & Order Items
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX idx_orders_order_type ON orders(order_type);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_status_history_order ON order_status_history(order_id, created_at ASC);

-- 3. Billing, Invoices & Retailer Ledger
CREATE INDEX idx_invoices_retailer_status_due ON invoices(retailer_id, status, due_date ASC);
CREATE INDEX idx_invoices_order_id ON invoices(order_id);
CREATE INDEX idx_retailer_ledger_retailer_time ON retailer_ledger(retailer_id, entry_timestamp DESC);

-- 4. Payments & Webhook Inbox
CREATE INDEX idx_payment_attempts_order ON payment_attempts(order_id);
CREATE INDEX idx_payment_attempts_idempotency ON payment_attempts(idempotency_key);
CREATE INDEX idx_webhook_inbox_delivery ON webhook_event_inbox(delivery_id);
CREATE INDEX idx_webhook_inbox_status ON webhook_event_inbox(processing_status);

-- 5. Notification Outbox Worker (Poller efficiency)
CREATE INDEX idx_outbox_status_retry ON notification_outbox(status, next_retry_at ASC);

-- 6. Verified Reviews
CREATE INDEX idx_reviews_product_status ON product_reviews(product_id, status, created_at DESC);

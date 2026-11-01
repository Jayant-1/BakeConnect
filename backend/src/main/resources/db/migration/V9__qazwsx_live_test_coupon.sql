-- V9: Live UPI Verification Test Coupon 'qazwsx'
-- Caps base order total to exactly ₹1.00 so that dynamic paise engine produces ₹1.{key} for live UPI testing

INSERT INTO discount_rules (
    id,
    name,
    code,
    description,
    discount_type,
    discount_value,
    min_order_threshold,
    channel_eligibility,
    valid_from,
    valid_to,
    is_active,
    priority,
    is_stackable,
    created_at
) VALUES (
    'f9999999-ffff-ffff-ffff-ffffffffffff',
    'Live UPI Test Verification (₹1.00 Base)',
    'qazwsx',
    'Special live UPI verification coupon reducing order base payable to ₹1.00',
    'FIXED_FINAL_TOTAL',
    1.00,
    0.00,
    'ALL',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '3650 days',
    TRUE,
    100,
    FALSE,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO UPDATE SET
    code = 'qazwsx',
    discount_type = 'FIXED_FINAL_TOTAL',
    discount_value = 1.00,
    is_active = TRUE;

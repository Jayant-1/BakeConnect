-- BakeConnect Seed Data Migration V3
-- Provides baseline demo users, retailer profiles, addresses, catalog categories, products, and discount rules.

-- 1. Baseline Users (Default Password for all: Password@123)
-- Hash: $2b$12$Dp6ryG/A4iuhbqvZeex4qe8q8o6hu5Lqc.wNmXDn8EyBBmm1Vq9Lu

INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active, created_at, updated_at)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin@bakeconnect.com', '$2b$12$Dp6ryG/A4iuhbqvZeex4qe8q8o6hu5Lqc.wNmXDn8EyBBmm1Vq9Lu', 'Master Baker (Owner)', '9820098200', 'BAKERY_ADMIN', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('22222222-2222-2222-2222-222222222222', 'retailer1@bakeconnect.com', '$2b$12$Dp6ryG/A4iuhbqvZeex4qe8q8o6hu5Lqc.wNmXDn8EyBBmm1Vq9Lu', 'Rajesh Sharma', '9820198201', 'RETAILER', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('33333333-3333-3333-3333-333333333333', 'retailer2@bakeconnect.com', '$2b$12$Dp6ryG/A4iuhbqvZeex4qe8q8o6hu5Lqc.wNmXDn8EyBBmm1Vq9Lu', 'Priya Patel', '9820298202', 'RETAILER', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('44444444-4444-4444-4444-444444444444', 'customer1@bakeconnect.com', '$2b$12$Dp6ryG/A4iuhbqvZeex4qe8q8o6hu5Lqc.wNmXDn8EyBBmm1Vq9Lu', 'Aarav Mehta', '9820398203', 'DIRECT_CUSTOMER', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('55555555-5555-5555-5555-555555555555', 'customer2@bakeconnect.com', '$2b$12$Dp6ryG/A4iuhbqvZeex4qe8q8o6hu5Lqc.wNmXDn8EyBBmm1Vq9Lu', 'Ananya Iyer', '9820498204', 'DIRECT_CUSTOMER', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 2. Retailer Profiles & Commercial Terms
INSERT INTO retailer_profiles (id, user_id, business_name, gst_number, contact_person_name, contact_phone, approval_status, payment_terms, custom_term_days, credit_limit, created_at, updated_at)
VALUES
    ('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Sharma Gourmet Mart', '27AAPFU0939F1ZV', 'Rajesh Sharma', '9820198201', 'APPROVED', 'NET_15_DAYS', NULL, 100000.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Patel Organic Supermarket', '24AAACP1234A1Z5', 'Priya Patel', '9820298202', 'APPROVED', 'IMMEDIATE', NULL, 50000.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 3. Customer & Retailer Delivery Addresses
INSERT INTO addresses (id, user_id, type, contact_name, contact_phone, address_line1, address_line2, city, state, postal_code, is_default, created_at, updated_at)
VALUES
    ('b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'SHIPPING', 'Rajesh Sharma', '9820198201', 'Shop 4, Horizon Tower', 'Linking Road, Bandra West', 'Mumbai', 'Maharashtra', '400050', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'SHIPPING', 'Priya Patel', '9820298202', 'Plot 12, Commercial Hub', 'CG Road, Navrangpura', 'Ahmedabad', 'Gujarat', '380009', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('b3333333-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'SHIPPING', 'Aarav Mehta', '9820398203', 'Flat 802, Gulmohar Apartments', 'Juhu Tara Road', 'Mumbai', 'Maharashtra', '400049', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('b4444444-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'SHIPPING', 'Ananya Iyer', '9820498204', 'Bungalow 14, Palm Grove', 'Koregaon Park', 'Pune', 'Maharashtra', '411001', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 4. Product Categories
INSERT INTO categories (id, name, slug, description, image_url, display_order, is_active, created_at, updated_at)
VALUES
    ('c1111111-cccc-cccc-cccc-cccccccccccc', 'Artisan Breads', 'artisan-breads', 'Stone-baked sourdoughs, rustic baguettes, and multigrain loaves', 'https://images.unsplash.com/photo-1509440159596-0249088772ff', 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('c2222222-cccc-cccc-cccc-cccccccccccc', 'Viennoiserie & Pastries', 'pastries', 'Pure butter croissants, pain au chocolat, danishes, and brioche', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a', 2, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('c3333333-cccc-cccc-cccc-cccccccccccc', 'Savory & Buns', 'savory-buns', 'Gourmet brioche burger buns, focaccia, and herb rolls', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90', 3, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('c4444444-cccc-cccc-cccc-cccccccccccc', 'Tea Cakes & Cookies', 'cakes-cookies', 'Artisanal loaf cakes, shortbreads, and cookies', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587', 4, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 5. Products (With dual-tier pricing, unit costs, MOQs, and increments)
INSERT INTO products (id, category_id, name, slug, description, image_url, retail_price, wholesale_price, unit_cost, unit_of_measure, moq, moq_increment, stock_quantity, is_available, is_active, version, created_at, updated_at)
VALUES
    ('d1111111-dddd-dddd-dddd-dddddddddddd', 'c1111111-cccc-cccc-cccc-cccccccccccc', 'Classic Country Sourdough (800g)', 'classic-country-sourdough', '36-hour cold fermented sourdough made with stoneground organic flour', 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04', 220.00, 160.00, 85.00, 'LOAF', 5, 5, 2000, TRUE, TRUE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('d2222222-dddd-dddd-dddd-dddddddddddd', 'c1111111-cccc-cccc-cccc-cccccccccccc', 'French Artisan Baguette (250g)', 'french-artisan-baguette', 'Traditional French baguette with thin crisp crust and open airy crumb', 'https://images.unsplash.com/photo-1534620808146-d33bb39128b2', 90.00, 65.00, 32.00, 'PIECE', 10, 5, 3000, TRUE, TRUE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('d3333333-dddd-dddd-dddd-dddddddddddd', 'c1111111-cccc-cccc-cccc-cccccccccccc', 'Multigrain Seed Loaf (600g)', 'multigrain-seed-loaf', 'Packed with flaxseeds, sunflower seeds, pumpkin seeds, and rolled oats', 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73', 190.00, 140.00, 72.00, 'LOAF', 5, 5, 1500, TRUE, TRUE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('d4444444-dddd-dddd-dddd-dddddddddddd', 'c2222222-cccc-cccc-cccc-cccccccccccc', 'Pure Butter Croissant Pack', 'pure-butter-croissant', 'Laminated with 82% Normandy French butter, flaky golden layers', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a', 120.00, 85.00, 42.00, 'PIECE', 12, 6, 2500, TRUE, TRUE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('d5555555-dddd-dddd-dddd-dddddddddddd', 'c2222222-cccc-cccc-cccc-cccccccccccc', 'Pain Au Chocolat', 'pain-au-chocolat', 'Filled with two batons of Belgian 54% dark chocolate', 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec', 140.00, 95.00, 48.00, 'PIECE', 12, 6, 2500, TRUE, TRUE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('d6666666-dddd-dddd-dddd-dddddddddddd', 'c3333333-cccc-cccc-cccc-cccccccccccc', 'Brioche Burger Buns (Pack of 4)', 'brioche-burger-buns', 'Rich, pillowy, shiny egg-washed brioche buns, ideal for burgers', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90', 160.00, 110.00, 55.00, 'PACK', 10, 5, 4000, TRUE, TRUE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('d7777777-dddd-dddd-dddd-dddddddddddd', 'c3333333-cccc-cccc-cccc-cccccccccccc', 'Rosemary Sea Salt Focaccia Slab (500g)', 'rosemary-focaccia-slab', 'Dimpled high-hydration dough soaked in extra virgin olive oil and fresh rosemary', 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df', 200.00, 145.00, 68.00, 'SLAB', 4, 2, 1000, TRUE, TRUE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('d8888888-dddd-dddd-dddd-dddddddddddd', 'c4444444-cccc-cccc-cccc-cccccccccccc', 'Belgian Chocolate Brownie Slab', 'belgian-chocolate-brownie', 'Fudgy, dense, rich Callebaut chocolate brownie slab with crinkly top', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c', 180.00, 125.00, 62.00, 'PIECE', 8, 4, 1500, TRUE, TRUE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 6. Conditional Discount Rules
INSERT INTO discount_rules (id, name, code, description, discount_type, discount_value, min_order_threshold, channel_eligibility, valid_from, valid_to, is_active, priority, is_stackable, created_at)
VALUES
    ('e1111111-eeee-eeee-eeee-eeeeeeeeeeee', 'Volume Wholesale Discount (2.5% on >= 10,000 INR)', 'BULK10K', 'Automatic 2.5% volume discount on orders exceeding 10,000 INR', 'PERCENTAGE', 2.50, 10000.00, 'ALL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '365 days', TRUE, 10, FALSE, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

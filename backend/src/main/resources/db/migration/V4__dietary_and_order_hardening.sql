-- BakeConnect Database Schema Migration V4
-- Adds dietary & packaging attributes for Indian bakery context, and seeds authentic Indian bakery products.

-- 1. Add Dietary & Packaging Columns to Products
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_eggless BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_vegetarian BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS dietary_tags VARCHAR(255) DEFAULT 'VEGETARIAN';
ALTER TABLE products ADD COLUMN IF NOT EXISTS allergens VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS pack_details VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS shelf_life_days INT DEFAULT 3;

-- 2. Seed Indian Bakery Categories
INSERT INTO categories (id, name, slug, description, image_url, display_order, is_active, created_at, updated_at)
VALUES
    ('c5555555-cccc-cccc-cccc-cccccccccccc', 'Pav & Heritage Breads', 'pav-breads', 'Traditional soft morning ladi pav, sandwich loaves, and stoneground sourdough', 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04', 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('c6666666-cccc-cccc-cccc-cccccccccccc', 'Puffs & Savouries', 'puffs-savouries', 'Flaky hot bakery puffs, vegetable patties, and savory rolls', 'https://images.unsplash.com/photo-1621303837174-89787a7d4729', 2, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('c7777777-cccc-cccc-cccc-cccccccccccc', 'Khari, Rusk & Biscuits', 'khari-rusk-biscuits', 'Pure butter khari, twice-baked saunf toast, and traditional nankhatai', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35', 3, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('c8888888-cccc-cccc-cccc-cccccccccccc', 'Tea Cakes & Patisserie', 'tea-cakes-patisserie', 'Irani chai mawa cakes, fruit loaves, and single-origin pastries', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587', 4, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('c9999999-cccc-cccc-cccc-cccccccccccc', 'Celebration Cakes', 'celebration-cakes', 'Fresh cream cakes and rich chocolate truffle celebration cakes', 'https://images.unsplash.com/photo-1535141192574-5d4897c13136', 5, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Authentic Indian Bakery Products
INSERT INTO products (
    id, category_id, name, slug, description, image_url,
    retail_price, wholesale_price, unit_cost, unit_of_measure,
    moq, moq_increment, stock_quantity, is_available, is_active,
    is_eggless, is_vegetarian, dietary_tags, allergens, pack_details, shelf_life_days,
    version, created_at, updated_at
)
VALUES
    -- 1. Fresh Ladi Pav
    ('d9111111-dddd-dddd-dddd-dddddddddddd', 'c5555555-cccc-cccc-cccc-cccccccccccc',
     'Fresh Bakery Ladi Pav (Pack of 6)', 'fresh-ladi-pav',
     'Ultra-soft, golden-topped morning pav baked fresh at 4:30 AM. Perfect with chai, bhaji, or maska.',
     'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04',
     45.00, 30.00, 18.00, 'PACK',
     10, 5, 2000, TRUE, TRUE,
     TRUE, TRUE, 'EGGLESS,VEGETARIAN', 'Wheat (Gluten)', 'Pack of 6 connected soft buns', 2,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- 2. Crispy Pure Butter Khari
    ('d9222222-dddd-dddd-dddd-dddddddddddd', 'c7777777-cccc-cccc-cccc-cccccccccccc',
     'Crispy Pure Butter Khari (250g Box)', 'pure-butter-khari',
     'Melt-in-mouth laminated puff biscuits made with cultured butter. Light, flaky, and non-greasy.',
     'https://images.unsplash.com/photo-1555507036-ab1f4038808a',
     85.00, 60.00, 35.00, 'BOX',
     12, 6, 1500, TRUE, TRUE,
     TRUE, TRUE, 'EGGLESS,VEGETARIAN', 'Wheat (Gluten), Milk (Butter)', '250g airtight sealed box (~18 pieces)', 30,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- 3. Irani Chai Mawa Cake
    ('d9333333-dddd-dddd-dddd-dddddddddddd', 'c8888888-cccc-cccc-cccc-cccccccccccc',
     'Classic Irani Mawa Cake (Pack of 2)', 'irani-mawa-cake',
     'Traditional Mumbai-style rich sponge infused with reduced milk solids (mawa) and green cardamom.',
     'https://images.unsplash.com/photo-1578985545062-69928b1d9587',
     90.00, 65.00, 38.00, 'PACK',
     8, 4, 1200, TRUE, TRUE,
     FALSE, FALSE, 'NON_VEGETARIAN,CONTAINS_EGG', 'Wheat, Eggs, Dairy (Mawa)', '2 individually wrapped foil cups', 5,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- 4. Golden Crispy Veg Puff
    ('d9444444-dddd-dddd-dddd-dddddddddddd', 'c6666666-cccc-cccc-cccc-cccccccccccc',
     'Spiced Vegetable Bakery Puff', 'spiced-veg-puff',
     'Golden brown multi-layered puff pastry packed with aromatic spiced potatoes, green peas, and fresh coriander.',
     'https://images.unsplash.com/photo-1621303837174-89787a7d4729',
     35.00, 25.00, 14.00, 'PIECE',
     15, 5, 1800, TRUE, TRUE,
     TRUE, TRUE, 'EGGLESS,VEGETARIAN', 'Wheat (Gluten)', 'Individual golden puff pastry triangle', 1,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- 5. Classic Egg Puff
    ('d9555555-dddd-dddd-dddd-dddddddddddd', 'c6666666-cccc-cccc-cccc-cccccccccccc',
     'Classic Bakery Egg Puff', 'classic-egg-puff',
     'Crispy French-style lamination wrapped around a roasted half egg tossed in spicy onion-tomato masala.',
     'https://images.unsplash.com/photo-1608198093002-ad4e005484ec',
     45.00, 32.00, 18.00, 'PIECE',
     12, 6, 1400, TRUE, TRUE,
     FALSE, FALSE, 'NON_VEGETARIAN,CONTAINS_EGG', 'Wheat, Eggs', 'Individual pastry parcel with whole roasted egg half', 1,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- 6. Traditional Cardamom Nankhatai
    ('d9666666-dddd-dddd-dddd-dddddddddddd', 'c7777777-cccc-cccc-cccc-cccccccccccc',
     'Desi Ghee Nankhatai (300g Tin)', 'desi-ghee-nankhatai',
     'Crumbly shortbread biscuits slow-baked with pure desi ghee, semolina, and freshly ground cardamom.',
     'https://images.unsplash.com/photo-1558961363-fa8fdf82db35',
     150.00, 105.00, 62.00, 'TIN',
     10, 5, 1000, TRUE, TRUE,
     TRUE, TRUE, 'EGGLESS,VEGETARIAN', 'Wheat, Dairy (Desi Ghee)', '300g keepsake vintage tin (~15 biscuits)', 45,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- 7. Twice-Baked Saunf Rusk
    ('d9777777-dddd-dddd-dddd-dddddddddddd', 'c7777777-cccc-cccc-cccc-cccccccccccc',
     'Double-Baked Saunf Rusk (350g)', 'double-baked-saunf-rusk',
     'Crunchy golden tea toast flavoured with aromatic Lucknowi fennel seeds. Built for dunking.',
     'https://images.unsplash.com/photo-1509440159596-0249088772ff',
     75.00, 50.00, 28.00, 'PACK',
     15, 5, 2000, TRUE, TRUE,
     TRUE, TRUE, 'EGGLESS,VEGETARIAN', 'Wheat (Gluten), Fennel', '350g moisture-barrier family pack', 60,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- 8. Belgian Dark Truffle Celebration Cake
    ('d9888888-dddd-dddd-dddd-dddddddddddd', 'c9999999-cccc-cccc-cccc-cccccccccccc',
     'Belgian Dark Chocolate Truffle Cake (500g)', 'belgian-dark-chocolate-truffle-cake',
     'Moist Dutch chocolate sponge layered with silky 54% dark chocolate ganache. Rich, glossy, and celebratory.',
     'https://images.unsplash.com/photo-1578985545062-69928b1d9587',
     550.00, 420.00, 230.00, 'CAKE',
     4, 2, 300, TRUE, TRUE,
     TRUE, TRUE, 'EGGLESS,VEGETARIAN', 'Wheat, Dairy, Soy', '500g round cake in rigid bakery handle box', 3,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

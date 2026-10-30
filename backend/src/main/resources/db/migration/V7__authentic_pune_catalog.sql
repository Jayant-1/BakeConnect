-- BakeConnect Database Schema Migration V7
-- Standardizes the product catalog for authentic Pune, India bakery identity.
-- Updates categories, consolidates 16 authentic bakery products with local image URLs,
-- exact INR pricing, dietary flags, and packaging specifications.

-- 1. Ensure Categories are correctly established
INSERT INTO categories (id, name, slug, description, image_url, display_order, is_active, created_at, updated_at)
VALUES
    ('c5555555-cccc-cccc-cccc-cccccccccccc', 'Pav & Heritage Breads', 'pav-breads', 'Traditional soft morning ladi pav, sliced sandwich loaves, and crusty baguettes', '/images/products/fresh-ladi-pav.png', 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('c6666666-cccc-cccc-cccc-cccccccccccc', 'Puffs & Savouries', 'puffs-savouries', 'Flaky hot bakery puffs, spiced vegetable patties, and classic egg puffs', '/images/products/spiced-veg-puff.png', 2, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('c7777777-cccc-cccc-cccc-cccccccccccc', 'Khari, Rusk & Biscuits', 'khari-rusk-biscuits', 'Pure butter khari, twice-baked saunf toast, desi ghee nankhatai, and jeera biscuits', '/images/products/pure-butter-khari.png', 3, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('c8888888-cccc-cccc-cccc-cccccccccccc', 'Pastries & Tea Cakes', 'pastries-cakes', 'Classic Irani chai mawa cakes, crispy cream rolls, and Dutch chocolate pastry', '/images/products/irani-mawa-cake.png', 4, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('c9999999-cccc-cccc-cccc-cccccccccccc', 'Celebration Cakes', 'celebration-cakes', 'Fresh cream cakes and rich dark chocolate truffle celebration cakes', '/images/products/eggless-chocolate-cake.png', 5, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('c3333333-cccc-cccc-cccc-cccccccccccc', 'Savory & Buns', 'savory-buns', 'Soft bakery sesame burger buns, sweet tutti frutti fruit buns, and tea bakes', '/images/products/soft-burger-buns.png', 6, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    display_order = EXCLUDED.display_order,
    is_active = TRUE,
    updated_at = CURRENT_TIMESTAMP;

-- 2. Upsert All 16 Authentic Pune Bakery Products
-- Group 1: Pav & Heritage Breads
INSERT INTO products (
    id, category_id, name, slug, description, image_url,
    retail_price, wholesale_price, unit_cost, unit_of_measure,
    moq, moq_increment, stock_quantity, is_available, is_active,
    is_eggless, is_vegetarian, dietary_tags, allergens, pack_details, shelf_life_days,
    version, created_at, updated_at
)
VALUES
    ('d9111111-dddd-dddd-dddd-dddddddddddd', 'c5555555-cccc-cccc-cccc-cccccccccccc',
     'Fresh Bakery Ladi Pav (Pack of 6)', 'fresh-ladi-pav',
     'Ultra-soft, golden-topped morning pav baked fresh at 4:30 AM. Perfect with chai, bhaji, or maska.',
     '/images/products/fresh-ladi-pav.png',
     45.00, 30.00, 18.00, 'PACK',
     10, 5, 2000, TRUE, TRUE,
     TRUE, TRUE, 'EGGLESS,VEGETARIAN', 'Wheat (Gluten)', 'Pack of 6 connected soft buns', 2,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    retail_price = EXCLUDED.retail_price,
    wholesale_price = EXCLUDED.wholesale_price,
    unit_cost = EXCLUDED.unit_cost,
    unit_of_measure = EXCLUDED.unit_of_measure,
    moq = EXCLUDED.moq,
    moq_increment = EXCLUDED.moq_increment,
    stock_quantity = EXCLUDED.stock_quantity,
    is_available = TRUE,
    is_active = TRUE,
    is_eggless = EXCLUDED.is_eggless,
    is_vegetarian = EXCLUDED.is_vegetarian,
    dietary_tags = EXCLUDED.dietary_tags,
    allergens = EXCLUDED.allergens,
    pack_details = EXCLUDED.pack_details,
    shelf_life_days = EXCLUDED.shelf_life_days,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO products (
    id, category_id, name, slug, description, image_url,
    retail_price, wholesale_price, unit_cost, unit_of_measure,
    moq, moq_increment, stock_quantity, is_available, is_active,
    is_eggless, is_vegetarian, dietary_tags, allergens, pack_details, shelf_life_days,
    version, created_at, updated_at
)
VALUES
    ('d1111111-dddd-dddd-dddd-dddddddddddd', 'c5555555-cccc-cccc-cccc-cccccccccccc',
     'Classic Sliced Milk Bread (400g)', 'classic-milk-bread',
     'Soft, fine-crumbed morning sandwich bread enriched with dairy milk. Ideal for morning toast and chutney sandwiches.',
     '/images/products/classic-milk-bread.png',
     50.00, 38.00, 22.00, 'LOAF',
     8, 4, 1500, TRUE, TRUE,
     TRUE, TRUE, 'EGGLESS,VEGETARIAN', 'Wheat (Gluten), Milk', 'Pre-sliced 400g family loaf', 4,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    retail_price = EXCLUDED.retail_price,
    wholesale_price = EXCLUDED.wholesale_price,
    unit_cost = EXCLUDED.unit_cost,
    unit_of_measure = EXCLUDED.unit_of_measure,
    moq = EXCLUDED.moq,
    moq_increment = EXCLUDED.moq_increment,
    stock_quantity = EXCLUDED.stock_quantity,
    is_available = TRUE,
    is_active = TRUE,
    is_eggless = EXCLUDED.is_eggless,
    is_vegetarian = EXCLUDED.is_vegetarian,
    dietary_tags = EXCLUDED.dietary_tags,
    allergens = EXCLUDED.allergens,
    pack_details = EXCLUDED.pack_details,
    shelf_life_days = EXCLUDED.shelf_life_days,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO products (
    id, category_id, name, slug, description, image_url,
    retail_price, wholesale_price, unit_cost, unit_of_measure,
    moq, moq_increment, stock_quantity, is_available, is_active,
    is_eggless, is_vegetarian, dietary_tags, allergens, pack_details, shelf_life_days,
    version, created_at, updated_at
)
VALUES
    ('d3333333-dddd-dddd-dddd-dddddddddddd', 'c5555555-cccc-cccc-cccc-cccccccccccc',
     '100% Whole Wheat Atta Bread (400g)', 'whole-wheat-bread',
     'Milled from 100% whole grain wheat flour with natural bran and toasted seed crust. High fiber, nutritious, and hearty.',
     '/images/products/whole-wheat-bread.png',
     60.00, 45.00, 26.00, 'LOAF',
     6, 2, 1200, TRUE, TRUE,
     TRUE, TRUE, 'EGGLESS,VEGETARIAN', 'Wheat (Gluten)', '400g sliced wholesome loaf', 4,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    retail_price = EXCLUDED.retail_price,
    wholesale_price = EXCLUDED.wholesale_price,
    unit_cost = EXCLUDED.unit_cost,
    unit_of_measure = EXCLUDED.unit_of_measure,
    moq = EXCLUDED.moq,
    moq_increment = EXCLUDED.moq_increment,
    stock_quantity = EXCLUDED.stock_quantity,
    is_available = TRUE,
    is_active = TRUE,
    is_eggless = EXCLUDED.is_eggless,
    is_vegetarian = EXCLUDED.is_vegetarian,
    dietary_tags = EXCLUDED.dietary_tags,
    allergens = EXCLUDED.allergens,
    pack_details = EXCLUDED.pack_details,
    shelf_life_days = EXCLUDED.shelf_life_days,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO products (
    id, category_id, name, slug, description, image_url,
    retail_price, wholesale_price, unit_cost, unit_of_measure,
    moq, moq_increment, stock_quantity, is_available, is_active,
    is_eggless, is_vegetarian, dietary_tags, allergens, pack_details, shelf_life_days,
    version, created_at, updated_at
)
VALUES
    ('d2222222-dddd-dddd-dddd-dddddddddddd', 'c5555555-cccc-cccc-cccc-cccccccccccc',
     'Crusty French Baguette (250g)', 'french-artisan-baguette',
     'Hearth-baked European style baguette with a crackling golden crust and light, airy honeycomb interior.',
     '/images/products/french-artisan-baguette.png',
     90.00, 65.00, 32.00, 'PIECE',
     10, 5, 800, TRUE, TRUE,
     TRUE, TRUE, 'EGGLESS,VEGETARIAN', 'Wheat (Gluten)', 'Individual 250g artisan baguette baton', 1,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    retail_price = EXCLUDED.retail_price,
    wholesale_price = EXCLUDED.wholesale_price,
    unit_cost = EXCLUDED.unit_cost,
    unit_of_measure = EXCLUDED.unit_of_measure,
    moq = EXCLUDED.moq,
    moq_increment = EXCLUDED.moq_increment,
    stock_quantity = EXCLUDED.stock_quantity,
    is_available = TRUE,
    is_active = TRUE,
    is_eggless = EXCLUDED.is_eggless,
    is_vegetarian = EXCLUDED.is_vegetarian,
    dietary_tags = EXCLUDED.dietary_tags,
    allergens = EXCLUDED.allergens,
    pack_details = EXCLUDED.pack_details,
    shelf_life_days = EXCLUDED.shelf_life_days,
    updated_at = CURRENT_TIMESTAMP;

-- Group 2: Khari, Rusk & Biscuits
INSERT INTO products (
    id, category_id, name, slug, description, image_url,
    retail_price, wholesale_price, unit_cost, unit_of_measure,
    moq, moq_increment, stock_quantity, is_available, is_active,
    is_eggless, is_vegetarian, dietary_tags, allergens, pack_details, shelf_life_days,
    version, created_at, updated_at
)
VALUES
    ('d9222222-dddd-dddd-dddd-dddddddddddd', 'c7777777-cccc-cccc-cccc-cccccccccccc',
     'Crispy Pure Butter Khari (250g Box)', 'pure-butter-khari',
     'Melt-in-mouth laminated puff biscuits made with cultured butter. Light, flaky, and non-greasy.',
     '/images/products/pure-butter-khari.png',
     85.00, 60.00, 35.00, 'BOX',
     12, 6, 1500, TRUE, TRUE,
     TRUE, TRUE, 'EGGLESS,VEGETARIAN', 'Wheat (Gluten), Milk (Butter)', '250g airtight sealed box (~18 pieces)', 30,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    retail_price = EXCLUDED.retail_price,
    wholesale_price = EXCLUDED.wholesale_price,
    unit_cost = EXCLUDED.unit_cost,
    unit_of_measure = EXCLUDED.unit_of_measure,
    moq = EXCLUDED.moq,
    moq_increment = EXCLUDED.moq_increment,
    stock_quantity = EXCLUDED.stock_quantity,
    is_available = TRUE,
    is_active = TRUE,
    is_eggless = EXCLUDED.is_eggless,
    is_vegetarian = EXCLUDED.is_vegetarian,
    dietary_tags = EXCLUDED.dietary_tags,
    allergens = EXCLUDED.allergens,
    pack_details = EXCLUDED.pack_details,
    shelf_life_days = EXCLUDED.shelf_life_days,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO products (
    id, category_id, name, slug, description, image_url,
    retail_price, wholesale_price, unit_cost, unit_of_measure,
    moq, moq_increment, stock_quantity, is_available, is_active,
    is_eggless, is_vegetarian, dietary_tags, allergens, pack_details, shelf_life_days,
    version, created_at, updated_at
)
VALUES
    ('d9777777-dddd-dddd-dddd-dddddddddddd', 'c7777777-cccc-cccc-cccc-cccccccccccc',
     'Double-Baked Saunf Rusk (350g)', 'double-baked-saunf-rusk',
     'Crunchy golden tea toast flavoured with aromatic Lucknowi fennel seeds. Built for dunking into hot kadak chai.',
     '/images/products/double-baked-saunf-rusk.png',
     75.00, 50.00, 28.00, 'PACK',
     15, 5, 2000, TRUE, TRUE,
     TRUE, TRUE, 'EGGLESS,VEGETARIAN', 'Wheat (Gluten), Fennel', '350g moisture-barrier family pack', 60,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    retail_price = EXCLUDED.retail_price,
    wholesale_price = EXCLUDED.wholesale_price,
    unit_cost = EXCLUDED.unit_cost,
    unit_of_measure = EXCLUDED.unit_of_measure,
    moq = EXCLUDED.moq,
    moq_increment = EXCLUDED.moq_increment,
    stock_quantity = EXCLUDED.stock_quantity,
    is_available = TRUE,
    is_active = TRUE,
    is_eggless = EXCLUDED.is_eggless,
    is_vegetarian = EXCLUDED.is_vegetarian,
    dietary_tags = EXCLUDED.dietary_tags,
    allergens = EXCLUDED.allergens,
    pack_details = EXCLUDED.pack_details,
    shelf_life_days = EXCLUDED.shelf_life_days,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO products (
    id, category_id, name, slug, description, image_url,
    retail_price, wholesale_price, unit_cost, unit_of_measure,
    moq, moq_increment, stock_quantity, is_available, is_active,
    is_eggless, is_vegetarian, dietary_tags, allergens, pack_details, shelf_life_days,
    version, created_at, updated_at
)
VALUES
    ('d9666666-dddd-dddd-dddd-dddddddddddd', 'c7777777-cccc-cccc-cccc-cccccccccccc',
     'Desi Ghee Nankhatai (300g Tin)', 'desi-ghee-nankhatai',
     'Crumbly shortbread biscuits slow-baked with pure desi ghee, semolina, and freshly ground cardamom topped with pistachio.',
     '/images/products/desi-ghee-nankhatai.png',
     150.00, 105.00, 62.00, 'TIN',
     10, 5, 1000, TRUE, TRUE,
     TRUE, TRUE, 'EGGLESS,VEGETARIAN', 'Wheat, Dairy (Desi Ghee), Tree Nuts (Pistachio)', '300g vintage keepsake tin (~15 biscuits)', 45,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    retail_price = EXCLUDED.retail_price,
    wholesale_price = EXCLUDED.wholesale_price,
    unit_cost = EXCLUDED.unit_cost,
    unit_of_measure = EXCLUDED.unit_of_measure,
    moq = EXCLUDED.moq,
    moq_increment = EXCLUDED.moq_increment,
    stock_quantity = EXCLUDED.stock_quantity,
    is_available = TRUE,
    is_active = TRUE,
    is_eggless = EXCLUDED.is_eggless,
    is_vegetarian = EXCLUDED.is_vegetarian,
    dietary_tags = EXCLUDED.dietary_tags,
    allergens = EXCLUDED.allergens,
    pack_details = EXCLUDED.pack_details,
    shelf_life_days = EXCLUDED.shelf_life_days,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO products (
    id, category_id, name, slug, description, image_url,
    retail_price, wholesale_price, unit_cost, unit_of_measure,
    moq, moq_increment, stock_quantity, is_available, is_active,
    is_eggless, is_vegetarian, dietary_tags, allergens, pack_details, shelf_life_days,
    version, created_at, updated_at
)
VALUES
    ('d8888888-dddd-dddd-dddd-dddddddddddd', 'c7777777-cccc-cccc-cccc-cccccccccccc',
     'Jeera Butter Biscuits (250g Box)', 'jeera-butter-biscuits',
     'Savory-sweet golden bakery biscuits tempered with roasted cumin seeds and farm butter.',
     '/images/products/jeera-butter-biscuits.png',
     95.00, 70.00, 38.00, 'BOX',
     12, 6, 1400, TRUE, TRUE,
     TRUE, TRUE, 'EGGLESS,VEGETARIAN', 'Wheat, Milk (Butter)', '250g box (~20 crunchy biscuits)', 45,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    retail_price = EXCLUDED.retail_price,
    wholesale_price = EXCLUDED.wholesale_price,
    unit_cost = EXCLUDED.unit_cost,
    unit_of_measure = EXCLUDED.unit_of_measure,
    moq = EXCLUDED.moq,
    moq_increment = EXCLUDED.moq_increment,
    stock_quantity = EXCLUDED.stock_quantity,
    is_available = TRUE,
    is_active = TRUE,
    is_eggless = EXCLUDED.is_eggless,
    is_vegetarian = EXCLUDED.is_vegetarian,
    dietary_tags = EXCLUDED.dietary_tags,
    allergens = EXCLUDED.allergens,
    pack_details = EXCLUDED.pack_details,
    shelf_life_days = EXCLUDED.shelf_life_days,
    updated_at = CURRENT_TIMESTAMP;

-- Group 3: Puffs & Savouries
INSERT INTO products (
    id, category_id, name, slug, description, image_url,
    retail_price, wholesale_price, unit_cost, unit_of_measure,
    moq, moq_increment, stock_quantity, is_available, is_active,
    is_eggless, is_vegetarian, dietary_tags, allergens, pack_details, shelf_life_days,
    version, created_at, updated_at
)
VALUES
    ('d9444444-dddd-dddd-dddd-dddddddddddd', 'c6666666-cccc-cccc-cccc-cccccccccccc',
     'Spiced Vegetable Bakery Puff', 'spiced-veg-puff',
     'Golden brown multi-layered puff pastry packed with aromatic spiced potatoes, green peas, and fresh coriander.',
     '/images/products/spiced-veg-puff.png',
     35.00, 25.00, 14.00, 'PIECE',
     15, 5, 1800, TRUE, TRUE,
     TRUE, TRUE, 'EGGLESS,VEGETARIAN', 'Wheat (Gluten)', 'Individual golden puff pastry triangle', 1,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    retail_price = EXCLUDED.retail_price,
    wholesale_price = EXCLUDED.wholesale_price,
    unit_cost = EXCLUDED.unit_cost,
    unit_of_measure = EXCLUDED.unit_of_measure,
    moq = EXCLUDED.moq,
    moq_increment = EXCLUDED.moq_increment,
    stock_quantity = EXCLUDED.stock_quantity,
    is_available = TRUE,
    is_active = TRUE,
    is_eggless = EXCLUDED.is_eggless,
    is_vegetarian = EXCLUDED.is_vegetarian,
    dietary_tags = EXCLUDED.dietary_tags,
    allergens = EXCLUDED.allergens,
    pack_details = EXCLUDED.pack_details,
    shelf_life_days = EXCLUDED.shelf_life_days,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO products (
    id, category_id, name, slug, description, image_url,
    retail_price, wholesale_price, unit_cost, unit_of_measure,
    moq, moq_increment, stock_quantity, is_available, is_active,
    is_eggless, is_vegetarian, dietary_tags, allergens, pack_details, shelf_life_days,
    version, created_at, updated_at
)
VALUES
    ('d9555555-dddd-dddd-dddd-dddddddddddd', 'c6666666-cccc-cccc-cccc-cccccccccccc',
     'Classic Bakery Egg Puff', 'classic-egg-puff',
     'Crispy bakery puff lamination wrapped around a roasted half egg tossed in spicy onion-tomato masala.',
     '/images/products/classic-egg-puff.png',
     45.00, 32.00, 18.00, 'PIECE',
     12, 6, 1400, TRUE, TRUE,
     FALSE, FALSE, 'NON_VEGETARIAN,CONTAINS_EGG', 'Wheat, Eggs', 'Individual pastry parcel with roasted egg half', 1,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    retail_price = EXCLUDED.retail_price,
    wholesale_price = EXCLUDED.wholesale_price,
    unit_cost = EXCLUDED.unit_cost,
    unit_of_measure = EXCLUDED.unit_of_measure,
    moq = EXCLUDED.moq,
    moq_increment = EXCLUDED.moq_increment,
    stock_quantity = EXCLUDED.stock_quantity,
    is_available = TRUE,
    is_active = TRUE,
    is_eggless = EXCLUDED.is_eggless,
    is_vegetarian = EXCLUDED.is_vegetarian,
    dietary_tags = EXCLUDED.dietary_tags,
    allergens = EXCLUDED.allergens,
    pack_details = EXCLUDED.pack_details,
    shelf_life_days = EXCLUDED.shelf_life_days,
    updated_at = CURRENT_TIMESTAMP;

-- Group 4: Savory & Buns
INSERT INTO products (
    id, category_id, name, slug, description, image_url,
    retail_price, wholesale_price, unit_cost, unit_of_measure,
    moq, moq_increment, stock_quantity, is_available, is_active,
    is_eggless, is_vegetarian, dietary_tags, allergens, pack_details, shelf_life_days,
    version, created_at, updated_at
)
VALUES
    ('d6666666-dddd-dddd-dddd-dddddddddddd', 'c3333333-cccc-cccc-cccc-cccccccccccc',
     'Soft Bakery Burger Buns (Pack of 4)', 'soft-burger-buns',
     'Pillowy, golden glazed soft buns topped with toasted white sesame seeds. Perfect for burgers and veg patties.',
     '/images/products/soft-burger-buns.png',
     60.00, 42.00, 24.00, 'PACK',
     10, 5, 2500, TRUE, TRUE,
     TRUE, TRUE, 'EGGLESS,VEGETARIAN', 'Wheat (Gluten), Sesame Seeds', 'Pack of 4 pillowy sesame buns', 3,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    retail_price = EXCLUDED.retail_price,
    wholesale_price = EXCLUDED.wholesale_price,
    unit_cost = EXCLUDED.unit_cost,
    unit_of_measure = EXCLUDED.unit_of_measure,
    moq = EXCLUDED.moq,
    moq_increment = EXCLUDED.moq_increment,
    stock_quantity = EXCLUDED.stock_quantity,
    is_available = TRUE,
    is_active = TRUE,
    is_eggless = EXCLUDED.is_eggless,
    is_vegetarian = EXCLUDED.is_vegetarian,
    dietary_tags = EXCLUDED.dietary_tags,
    allergens = EXCLUDED.allergens,
    pack_details = EXCLUDED.pack_details,
    shelf_life_days = EXCLUDED.shelf_life_days,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO products (
    id, category_id, name, slug, description, image_url,
    retail_price, wholesale_price, unit_cost, unit_of_measure,
    moq, moq_increment, stock_quantity, is_available, is_active,
    is_eggless, is_vegetarian, dietary_tags, allergens, pack_details, shelf_life_days,
    version, created_at, updated_at
)
VALUES
    ('d7777777-dddd-dddd-dddd-dddddddddddd', 'c3333333-cccc-cccc-cccc-cccccccccccc',
     'Sweet Tutti Frutti Fruit Bun (Pack of 2)', 'tutti-frutti-fruit-bun',
     'Nostalgic sweet milk buns loaded with colorful candied fruit pieces. Soft, aromatic, and loved by kids.',
     '/images/products/tutti-frutti-fruit-bun.png',
     50.00, 35.00, 19.00, 'PACK',
     10, 5, 1500, TRUE, TRUE,
     TRUE, TRUE, 'EGGLESS,VEGETARIAN', 'Wheat (Gluten), Milk', 'Pack of 2 soft sweet fruit buns', 3,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    retail_price = EXCLUDED.retail_price,
    wholesale_price = EXCLUDED.wholesale_price,
    unit_cost = EXCLUDED.unit_cost,
    unit_of_measure = EXCLUDED.unit_of_measure,
    moq = EXCLUDED.moq,
    moq_increment = EXCLUDED.moq_increment,
    stock_quantity = EXCLUDED.stock_quantity,
    is_available = TRUE,
    is_active = TRUE,
    is_eggless = EXCLUDED.is_eggless,
    is_vegetarian = EXCLUDED.is_vegetarian,
    dietary_tags = EXCLUDED.dietary_tags,
    allergens = EXCLUDED.allergens,
    pack_details = EXCLUDED.pack_details,
    shelf_life_days = EXCLUDED.shelf_life_days,
    updated_at = CURRENT_TIMESTAMP;

-- Group 5: Pastries & Tea Cakes
INSERT INTO products (
    id, category_id, name, slug, description, image_url,
    retail_price, wholesale_price, unit_cost, unit_of_measure,
    moq, moq_increment, stock_quantity, is_available, is_active,
    is_eggless, is_vegetarian, dietary_tags, allergens, pack_details, shelf_life_days,
    version, created_at, updated_at
)
VALUES
    ('d4444444-dddd-dddd-dddd-dddddddddddd', 'c8888888-cccc-cccc-cccc-cccccccccccc',
     'Crispy Cream Roll (Pack of 2)', 'crispy-cream-roll',
     'Crunchy spiral puff pastry horns packed with fluffy sweet vanilla buttercream.',
     '/images/products/crispy-cream-roll.png',
     50.00, 36.00, 20.00, 'PACK',
     12, 6, 1600, TRUE, TRUE,
     TRUE, TRUE, 'EGGLESS,VEGETARIAN', 'Wheat (Gluten), Milk', 'Pack of 2 crispy cream horns', 5,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    retail_price = EXCLUDED.retail_price,
    wholesale_price = EXCLUDED.wholesale_price,
    unit_cost = EXCLUDED.unit_cost,
    unit_of_measure = EXCLUDED.unit_of_measure,
    moq = EXCLUDED.moq,
    moq_increment = EXCLUDED.moq_increment,
    stock_quantity = EXCLUDED.stock_quantity,
    is_available = TRUE,
    is_active = TRUE,
    is_eggless = EXCLUDED.is_eggless,
    is_vegetarian = EXCLUDED.is_vegetarian,
    dietary_tags = EXCLUDED.dietary_tags,
    allergens = EXCLUDED.allergens,
    pack_details = EXCLUDED.pack_details,
    shelf_life_days = EXCLUDED.shelf_life_days,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO products (
    id, category_id, name, slug, description, image_url,
    retail_price, wholesale_price, unit_cost, unit_of_measure,
    moq, moq_increment, stock_quantity, is_available, is_active,
    is_eggless, is_vegetarian, dietary_tags, allergens, pack_details, shelf_life_days,
    version, created_at, updated_at
)
VALUES
    ('d5555555-dddd-dddd-dddd-dddddddddddd', 'c8888888-cccc-cccc-cccc-cccccccccccc',
     'Dutch Chocolate Cream Pastry (Slice)', 'dutch-chocolate-pastry',
     'Layered dark chocolate sponge filled with velvety chocolate mousse and topped with Dutch cocoa ganache.',
     '/images/products/dutch-chocolate-pastry.png',
     90.00, 65.00, 36.00, 'PIECE',
     8, 4, 1200, TRUE, TRUE,
     TRUE, TRUE, 'EGGLESS,VEGETARIAN', 'Wheat, Milk, Soy', 'Single triangle pastry slice with cake collar', 3,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    retail_price = EXCLUDED.retail_price,
    wholesale_price = EXCLUDED.wholesale_price,
    unit_cost = EXCLUDED.unit_cost,
    unit_of_measure = EXCLUDED.unit_of_measure,
    moq = EXCLUDED.moq,
    moq_increment = EXCLUDED.moq_increment,
    stock_quantity = EXCLUDED.stock_quantity,
    is_available = TRUE,
    is_active = TRUE,
    is_eggless = EXCLUDED.is_eggless,
    is_vegetarian = EXCLUDED.is_vegetarian,
    dietary_tags = EXCLUDED.dietary_tags,
    allergens = EXCLUDED.allergens,
    pack_details = EXCLUDED.pack_details,
    shelf_life_days = EXCLUDED.shelf_life_days,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO products (
    id, category_id, name, slug, description, image_url,
    retail_price, wholesale_price, unit_cost, unit_of_measure,
    moq, moq_increment, stock_quantity, is_available, is_active,
    is_eggless, is_vegetarian, dietary_tags, allergens, pack_details, shelf_life_days,
    version, created_at, updated_at
)
VALUES
    ('d9333333-dddd-dddd-dddd-dddddddddddd', 'c8888888-cccc-cccc-cccc-cccccccccccc',
     'Classic Irani Mawa Cake (Pack of 2)', 'irani-mawa-cake',
     'Traditional Irani cafe rich sponge infused with slow-reduced milk solids (mawa) and freshly crushed green cardamom.',
     '/images/products/irani-mawa-cake.png',
     90.00, 65.00, 38.00, 'PACK',
     8, 4, 1200, TRUE, TRUE,
     FALSE, FALSE, 'NON_VEGETARIAN,CONTAINS_EGG', 'Wheat, Eggs, Dairy (Mawa)', '2 individually wrapped foil cups', 5,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    retail_price = EXCLUDED.retail_price,
    wholesale_price = EXCLUDED.wholesale_price,
    unit_cost = EXCLUDED.unit_cost,
    unit_of_measure = EXCLUDED.unit_of_measure,
    moq = EXCLUDED.moq,
    moq_increment = EXCLUDED.moq_increment,
    stock_quantity = EXCLUDED.stock_quantity,
    is_available = TRUE,
    is_active = TRUE,
    is_eggless = EXCLUDED.is_eggless,
    is_vegetarian = EXCLUDED.is_vegetarian,
    dietary_tags = EXCLUDED.dietary_tags,
    allergens = EXCLUDED.allergens,
    pack_details = EXCLUDED.pack_details,
    shelf_life_days = EXCLUDED.shelf_life_days,
    updated_at = CURRENT_TIMESTAMP;

-- Group 6: Celebration Cakes
INSERT INTO products (
    id, category_id, name, slug, description, image_url,
    retail_price, wholesale_price, unit_cost, unit_of_measure,
    moq, moq_increment, stock_quantity, is_available, is_active,
    is_eggless, is_vegetarian, dietary_tags, allergens, pack_details, shelf_life_days,
    version, created_at, updated_at
)
VALUES
    ('d9888888-dddd-dddd-dddd-dddddddddddd', 'c9999999-cccc-cccc-cccc-cccccccccccc',
     'Eggless Dark Chocolate Truffle Cake (500g)', 'eggless-chocolate-cake',
     'Moist Dutch chocolate sponge layered with silky 54% dark chocolate ganache. Rich, glossy, and celebratory.',
     '/images/products/eggless-chocolate-cake.png',
     550.00, 420.00, 230.00, 'CAKE',
     4, 2, 300, TRUE, TRUE,
     TRUE, TRUE, 'EGGLESS,VEGETARIAN', 'Wheat, Dairy, Soy', '500g round cake in rigid bakery handle box', 3,
     0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    retail_price = EXCLUDED.retail_price,
    wholesale_price = EXCLUDED.wholesale_price,
    unit_cost = EXCLUDED.unit_cost,
    unit_of_measure = EXCLUDED.unit_of_measure,
    moq = EXCLUDED.moq,
    moq_increment = EXCLUDED.moq_increment,
    stock_quantity = EXCLUDED.stock_quantity,
    is_available = TRUE,
    is_active = TRUE,
    is_eggless = EXCLUDED.is_eggless,
    is_vegetarian = EXCLUDED.is_vegetarian,
    dietary_tags = EXCLUDED.dietary_tags,
    allergens = EXCLUDED.allergens,
    pack_details = EXCLUDED.pack_details,
    shelf_life_days = EXCLUDED.shelf_life_days,
    updated_at = CURRENT_TIMESTAMP;

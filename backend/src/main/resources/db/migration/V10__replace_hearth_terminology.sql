-- V10: Replace European 'Hearth' terminology with authentic Indian bakery phrasing

UPDATE products 
SET pack_details = '1 Kg Fresh Bakery Portion' 
WHERE pack_details = '1 Kg Fresh Hearth Portion';

UPDATE products 
SET description = 'Fresh oven-baked European style baguette with a crackling golden crust and light, airy honeycomb interior.' 
WHERE slug = 'french-artisan-baguette';

-- Check the structure of key tables
SELECT 'event_products table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'event_products' 
ORDER BY ordinal_position;

SELECT 'products table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;

SELECT 'recipes table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'recipes' 
ORDER BY ordinal_position;

-- Check sample data
SELECT 'Sample event_products data:' as info;
SELECT event_name, product_name, quantity, unit
FROM event_products 
WHERE event_name = 'Orion Leuchten'
LIMIT 10;

SELECT 'Sample recipes data:' as info;
SELECT r.id, r.product_id, r.ingredient_id, r.amount,
       p1.name as product_name,
       p2.name as ingredient_name
FROM recipes r
JOIN products p1 ON r.product_id = p1.id
JOIN products p2 ON r.ingredient_id = p2.id
LIMIT 10;

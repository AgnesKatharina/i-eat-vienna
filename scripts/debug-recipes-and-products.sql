-- Debug script to check recipes and products data

-- Check if we have any recipes in the database
SELECT 'Total recipes count:' as info, COUNT(*) as count FROM recipes;

-- Check sample recipes
SELECT 'Sample recipes:' as info;
SELECT r.id, r.product_id, r.ingredient_id, r.amount, 
       p1.name as product_name, p2.name as ingredient_name
FROM recipes r
LEFT JOIN products p1 ON r.product_id = p1.id
LEFT JOIN products p2 ON r.ingredient_id = p2.id
LIMIT 10;

-- Check if Schönbrunner Burger exists as a product
SELECT 'Schönbrunner Burger product:' as info;
SELECT id, name, unit FROM products WHERE name ILIKE '%schönbrunn%' OR name ILIKE '%burger%';

-- Check recipes for burger products
SELECT 'Recipes for burger products:' as info;
SELECT r.id, r.product_id, r.ingredient_id, r.amount,
       p1.name as product_name, p2.name as ingredient_name
FROM recipes r
LEFT JOIN products p1 ON r.product_id = p1.id  
LEFT JOIN products p2 ON r.ingredient_id = p2.id
WHERE p1.name ILIKE '%burger%';

-- Check event_products table
SELECT 'Sample event_products:' as info;
SELECT ep.id, ep.event_id, ep.product_id, ep.product_name, ep.quantity, ep.unit
FROM event_products ep
LIMIT 10;

-- Check if we have event_products for recent events
SELECT 'Event products for recent events:' as info;
SELECT e.name as event_name, ep.product_name, ep.quantity, ep.unit
FROM event_products ep
JOIN events e ON ep.event_id = e.id
ORDER BY e.created_at DESC
LIMIT 20;

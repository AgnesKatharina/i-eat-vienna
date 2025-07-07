-- Verify the food_type column exists and works correctly
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN food_type = 'food' THEN 1 END) as food_products,
  COUNT(CASE WHEN food_type = 'non_food' THEN 1 END) as non_food_products,
  COUNT(CASE WHEN food_type IS NULL THEN 1 END) as unclassified_products
FROM products;

-- Test inserting different food_type values
INSERT INTO products (name, category_id, unit, food_type, created_at, updated_at) 
VALUES 
  ('Test Food Item', 1, 'piece', 'food', NOW(), NOW()),
  ('Test Non-Food Item', 1, 'piece', 'non_food', NOW(), NOW()),
  ('Test Unclassified Item', 1, 'piece', NULL, NOW(), NOW());

-- Verify the test inserts worked
SELECT name, food_type FROM products WHERE name LIKE 'Test%';

-- Clean up test data
DELETE FROM products WHERE name LIKE 'Test%';

-- Show the constraint is working
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'products'::regclass 
AND conname LIKE '%food_type%';

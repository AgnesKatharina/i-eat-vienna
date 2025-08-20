-- Debug script to check product matching and recipe availability
-- This shows which event products have matching database products and recipes

WITH event_products_for_orion AS (
  SELECT DISTINCT product_name, quantity, unit
  FROM event_products 
  WHERE event_name = 'Orion Leuchten'
),
product_matches AS (
  SELECT 
    ep.product_name as event_product_name,
    p.name as matching_product_name,
    p.id as product_id,
    ep.quantity,
    ep.unit
  FROM event_products_for_orion ep
  JOIN products p ON LOWER(TRIM(ep.product_name)) = LOWER(TRIM(p.name))
),
recipe_counts AS (
  SELECT 
    pm.*,
    COUNT(r.id) as recipe_count
  FROM product_matches pm
  LEFT JOIN recipes r ON r.product_id = pm.product_id
  GROUP BY pm.event_product_name, pm.matching_product_name, pm.product_id, pm.quantity, pm.unit
)
SELECT 
  event_product_name,
  matching_product_name,
  product_id,
  recipe_count
FROM recipe_counts
ORDER BY recipe_count DESC;

-- Also show some sample ingredients for the top products
SELECT 'Sample ingredients for Veggie Box:' as info;
SELECT 
  r.amount,
  p.name as ingredient_name,
  p.unit as ingredient_unit
FROM recipes r
JOIN products p ON r.ingredient_id = p.id
WHERE r.product_id = 155  -- Veggie Box
LIMIT 10;

SELECT 'Sample ingredients for Veggie Burger:' as info;
SELECT 
  r.amount,
  p.name as ingredient_name,
  p.unit as ingredient_unit
FROM recipes r
JOIN products p ON r.ingredient_id = p.id
WHERE r.product_id = 156  -- Veggie Burger
LIMIT 10;

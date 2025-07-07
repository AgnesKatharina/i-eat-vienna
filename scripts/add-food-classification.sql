-- Add food_type column to products table
ALTER TABLE products 
ADD COLUMN food_type TEXT CHECK (food_type IN ('food', 'non_food'));

-- Add index for better performance
CREATE INDEX idx_products_food_type ON products(food_type);

-- Add comment for documentation
COMMENT ON COLUMN products.food_type IS 'Classification of product as food, non_food, or NULL for unclassified';

-- Verify the column was added successfully
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'food_type';

-- Show sample of products table structure
SELECT id, name, food_type FROM products LIMIT 5;

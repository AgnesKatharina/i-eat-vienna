-- Update foodtruck_equipment table to support multiple foodtrucks per equipment
-- This migration safely converts single foodtruck values to arrays

-- First, let's see the current structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'foodtruck_equipment' 
ORDER BY ordinal_position;

-- Step 1: Add a temporary column for the new array structure
ALTER TABLE foodtruck_equipment 
ADD COLUMN foodtruck_new text[] DEFAULT '{}';

-- Step 2: Migrate existing data from single values to arrays
UPDATE foodtruck_equipment 
SET foodtruck_new = ARRAY[foodtruck] 
WHERE foodtruck IS NOT NULL;

-- Step 3: Drop the old column and rename the new one
ALTER TABLE foodtruck_equipment DROP COLUMN foodtruck;
ALTER TABLE foodtruck_equipment RENAME COLUMN foodtruck_new TO foodtruck;

-- Step 4: Add constraints to ensure data integrity
ALTER TABLE foodtruck_equipment 
ALTER COLUMN foodtruck SET NOT NULL;

-- Add check constraint to ensure valid foodtruck values
ALTER TABLE foodtruck_equipment 
ADD CONSTRAINT check_valid_foodtrucks 
CHECK (
  array_length(foodtruck, 1) > 0 AND
  foodtruck <@ ARRAY['FT 1', 'FT 2', 'FT 3', 'FT 4', 'FT 5']
);

-- Step 5: Create index for efficient array queries
CREATE INDEX idx_foodtruck_equipment_foodtruck_gin 
ON foodtruck_equipment USING GIN (foodtruck);

-- Verify the migration
SELECT id, name, foodtruck, unit, description 
FROM foodtruck_equipment 
LIMIT 5;

-- Add is_packed column to nachbestellung_items table
ALTER TABLE nachbestellung_items 
ADD COLUMN IF NOT EXISTS is_packed BOOLEAN DEFAULT false;

-- Update existing records to have is_packed = false
UPDATE nachbestellung_items 
SET is_packed = false 
WHERE is_packed IS NULL;

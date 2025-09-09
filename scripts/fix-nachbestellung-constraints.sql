-- Update the item_type constraint to include 'equipment'
ALTER TABLE nachbestellung_items 
DROP CONSTRAINT IF EXISTS nachbestellung_items_item_type_check;

ALTER TABLE nachbestellung_items 
ADD CONSTRAINT nachbestellung_items_item_type_check 
CHECK (item_type IN ('product', 'ingredient', 'equipment'));

-- Update the status constraint to include 'erledigt' 
ALTER TABLE nachbestellung_items 
DROP CONSTRAINT IF EXISTS nachbestellung_items_status_check;

ALTER TABLE nachbestellung_items 
ADD CONSTRAINT nachbestellung_items_status_check 
CHECK (status IN ('offen', 'bestellt', 'erhalten', 'storniert', 'erledigt'));

-- Update the comment to reflect the new allowed values
COMMENT ON COLUMN nachbestellung_items.item_type IS 'Type: product, ingredient, or equipment';
COMMENT ON COLUMN nachbestellung_items.status IS 'Item status: offen, bestellt, erhalten, storniert, erledigt';

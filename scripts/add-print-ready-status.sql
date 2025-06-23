-- Add the is_ready_for_print column to the events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS is_ready_for_print BOOLEAN DEFAULT false;

-- Update existing events to have the default value
UPDATE events 
SET is_ready_for_print = false 
WHERE is_ready_for_print IS NULL;

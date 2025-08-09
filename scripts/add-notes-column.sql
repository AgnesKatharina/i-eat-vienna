-- Add notes column to events table
ALTER TABLE events ADD COLUMN notes TEXT DEFAULT '';

-- Update existing events to have empty notes
UPDATE events SET notes = '' WHERE notes IS NULL;

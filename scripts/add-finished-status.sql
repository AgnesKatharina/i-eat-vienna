-- Add finished column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS finished BOOLEAN DEFAULT FALSE;

-- Add comment to describe the column
COMMENT ON COLUMN events.finished IS 'Indicates if the event is marked as finished/completed';

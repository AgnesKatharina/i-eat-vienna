-- Create nachbestellungen table to store reorder records
CREATE TABLE IF NOT EXISTS nachbestellungen (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'in_bearbeitung', 'abgeschlossen', 'storniert')),
  total_items INTEGER NOT NULL DEFAULT 0,
  total_products INTEGER NOT NULL DEFAULT 0,
  total_ingredients INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT, -- user_id who created the reorder
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by TEXT -- user_id who completed the reorder
);

-- Create nachbestellung_items table to store individual items in each reorder
CREATE TABLE IF NOT EXISTS nachbestellung_items (
  id SERIAL PRIMARY KEY,
  nachbestellung_id INTEGER REFERENCES nachbestellungen(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('product', 'ingredient')),
  item_id INTEGER NOT NULL, -- references products.id or ingredients.id
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit TEXT NOT NULL,
  packaging_unit TEXT,
  category TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'bestellt', 'erhalten', 'storniert')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_nachbestellungen_event_id ON nachbestellungen(event_id);
CREATE INDEX IF NOT EXISTS idx_nachbestellungen_status ON nachbestellungen(status);
CREATE INDEX IF NOT EXISTS idx_nachbestellungen_created_at ON nachbestellungen(created_at);
CREATE INDEX IF NOT EXISTS idx_nachbestellung_items_nachbestellung_id ON nachbestellung_items(nachbestellung_id);
CREATE INDEX IF NOT EXISTS idx_nachbestellung_items_status ON nachbestellung_items(status);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_nachbestellungen_updated_at 
  BEFORE UPDATE ON nachbestellungen 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nachbestellung_items_updated_at 
  BEFORE UPDATE ON nachbestellung_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add some helpful comments
COMMENT ON TABLE nachbestellungen IS 'Main table for storing reorder records';
COMMENT ON TABLE nachbestellung_items IS 'Individual items within each reorder';
COMMENT ON COLUMN nachbestellungen.status IS 'Status: offen, in_bearbeitung, abgeschlossen, storniert';
COMMENT ON COLUMN nachbestellung_items.item_type IS 'Type: product or ingredient';
COMMENT ON COLUMN nachbestellung_items.status IS 'Item status: offen, bestellt, erhalten, storniert';

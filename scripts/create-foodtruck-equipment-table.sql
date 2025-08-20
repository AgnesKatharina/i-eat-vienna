-- Create the foodtruck_equipment table
CREATE TABLE IF NOT EXISTS foodtruck_equipment (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL DEFAULT 'Stück',
  foodtruck VARCHAR(10) NOT NULL CHECK (foodtruck IN ('ft1', 'ft2', 'ft3', 'ft4', 'ft5')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_foodtruck_equipment_foodtruck ON foodtruck_equipment(foodtruck);
CREATE INDEX IF NOT EXISTS idx_foodtruck_equipment_name ON foodtruck_equipment(name);

-- Enable Row Level Security
ALTER TABLE foodtruck_equipment ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to view foodtruck equipment" ON foodtruck_equipment
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert foodtruck equipment" ON foodtruck_equipment
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update foodtruck equipment" ON foodtruck_equipment
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete foodtruck equipment" ON foodtruck_equipment
  FOR DELETE TO authenticated USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_foodtruck_equipment_updated_at
  BEFORE UPDATE ON foodtruck_equipment
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO foodtruck_equipment (name, unit, foodtruck, notes) VALUES
  ('Grill', 'Stück', 'ft1', 'Hauptgrill für FT1'),
  ('Kühlbox', 'Stück', 'ft1', 'Große Kühlbox'),
  ('Gaskocher', 'Stück', 'ft2', 'Backup Kocher'),
  ('Pfanne groß', 'Stück', 'ft2', '32cm Pfanne'),
  ('Messer Set', 'Set', 'ft3', 'Professionelle Messer'),
  ('Schneidebrett', 'Stück', 'ft3', 'Holz Schneidebrett'),
  ('Fritteuse', 'Stück', 'ft4', 'Elektrische Fritteuse'),
  ('Mixer', 'Stück', 'ft4', 'Standmixer'),
  ('Kaffeemaschine', 'Stück', 'ft5', 'Espressomaschine'),
  ('Wasserkocher', 'Stück', 'ft5', 'Elektrischer Wasserkocher')
ON CONFLICT DO NOTHING;

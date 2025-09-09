-- Rename foodtruck_equipment table to foodtruck_geschirr
ALTER TABLE foodtruck_equipment RENAME TO foodtruck_geschirr;

-- Update any indexes that reference the old table name
-- (Indexes are automatically renamed when the table is renamed in PostgreSQL)

-- Update any foreign key constraints if they exist
-- (These will be automatically updated when the table is renamed)

-- Update RLS policies to reference the new table name
DROP POLICY IF EXISTS "Enable read access for all users" ON foodtruck_geschirr;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON foodtruck_geschirr;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON foodtruck_geschirr;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON foodtruck_geschirr;

-- Recreate RLS policies with the new table name
CREATE POLICY "Enable read access for all users" ON foodtruck_geschirr FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON foodtruck_geschirr FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON foodtruck_geschirr FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users only" ON foodtruck_geschirr FOR DELETE USING (true);

-- Update table comment
COMMENT ON TABLE foodtruck_geschirr IS 'Foodtruck Geschirr items and their assignments to foodtrucks';

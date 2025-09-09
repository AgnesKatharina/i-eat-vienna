-- Create script to rename Foodtruck Equipment references in database
-- Update any comments or descriptions that reference "Foodtruck Equipment"
COMMENT ON TABLE foodtruck_equipment IS 'Foodtruck Geschirr items and their assignments';

-- Update policy descriptions
DROP POLICY IF EXISTS "Allow authenticated users to view Foodtruck Equipment" ON foodtruck_equipment;
CREATE POLICY "Allow authenticated users to view Foodtruck Geschirr" ON foodtruck_equipment
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to insert Foodtruck Equipment" ON foodtruck_equipment;
CREATE POLICY "Allow authenticated users to insert Foodtruck Geschirr" ON foodtruck_equipment
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to update Foodtruck Equipment" ON foodtruck_equipment;
CREATE POLICY "Allow authenticated users to update Foodtruck Geschirr" ON foodtruck_equipment
    FOR UPDATE USING (auth.role() = 'authenticated');

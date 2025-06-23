-- Check if all required tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('categories', 'products', 'recipes', 'packaging_units', 'events', 'event_products', 'user_preferences');

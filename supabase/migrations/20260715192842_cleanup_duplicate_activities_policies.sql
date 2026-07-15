/*
# Remove duplicate activities policies from earlier migration

The earlier migration (create_activities_table) added redundant policies
because the activities table already existed. Drop those duplicates.
*/

DROP POLICY IF EXISTS "select_activities" ON activities;
DROP POLICY IF EXISTS "insert_activities" ON activities;
DROP POLICY IF EXISTS "update_activities" ON activities;
DROP POLICY IF EXISTS "delete_activities" ON activities;

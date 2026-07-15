/*
# Create activities table

1. New Tables
  - `activities`
    - `id` (uuid, primary key)
    - `client_id` (uuid, FK to clients, cascade delete)
    - `type` (text, constrained to Call/Email/Meeting/Note/Task/SMS)
    - `description` (text, optional note or summary)
    - `scheduled_at` (timestamptz, for meetings/scheduled events)
    - `completed_at` (timestamptz, when the activity was completed)
    - `created_by` (uuid, FK to auth.users)
    - `created_at` (timestamptz, auto-set)

2. Security
  - RLS enabled.
  - Authenticated users can SELECT, INSERT, UPDATE, DELETE their own activities.

3. Indexes
  - client_id for filtering by client
  - created_by for filtering by user
  - created_at for ordering
*/

CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('Call', 'Email', 'Meeting', 'Note', 'Task', 'SMS')),
  description text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_activities" ON activities;
CREATE POLICY "select_activities" ON activities FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_activities" ON activities;
CREATE POLICY "insert_activities" ON activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "update_activities" ON activities;
CREATE POLICY "update_activities" ON activities FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "delete_activities" ON activities;
CREATE POLICY "delete_activities" ON activities FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS idx_activities_client_id ON activities(client_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_by ON activities(created_by);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);

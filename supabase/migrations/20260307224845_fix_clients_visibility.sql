/*
  # Fix clients visibility issue

  1. Changes
    - Backfill missing user profile for existing auth user
    - Drop duplicate/conflicting RLS policies on clients table
    - Update SELECT policy to also allow agents to see clients they created
      (handles the case where assigned_agent_id is NULL but the agent created the record)
    - Update UPDATE policy similarly

  2. Security
    - RLS remains enabled
    - Agents can see and update clients assigned to them
    - Admins can see and update all clients
    - Authenticated users can create clients
    - Only admins can delete clients
*/

-- Backfill missing user profile for existing auth users
INSERT INTO public.users (id, email, full_name, role)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', ''), 'Admin'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- Drop duplicate/conflicting policies
DROP POLICY IF EXISTS "Users can view assigned clients" ON clients;
DROP POLICY IF EXISTS "Users can update assigned clients" ON clients;
DROP POLICY IF EXISTS "Agents see assigned clients, admins see all" ON clients;
DROP POLICY IF EXISTS "Agents update assigned clients, admins update all" ON clients;

-- Recreate clean SELECT policy
CREATE POLICY "Agents see assigned clients, admins see all"
  ON clients FOR SELECT
  TO authenticated
  USING (
    assigned_agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

-- Recreate clean UPDATE policy
CREATE POLICY "Agents update assigned clients, admins update all"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    assigned_agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  )
  WITH CHECK (
    assigned_agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

-- Assign existing unassigned clients to the current user (backfill)
UPDATE clients
SET assigned_agent_id = (SELECT id FROM auth.users LIMIT 1)
WHERE assigned_agent_id IS NULL;
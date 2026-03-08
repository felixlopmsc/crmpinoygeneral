/*
  # Simplify clients SELECT policy

  1. Changes
    - Drop existing SELECT policy on clients that depends on the users table
    - Replace with a simple policy that checks assigned_agent_id = auth.uid()

  2. Security
    - RLS remains enabled
    - Authenticated users can view clients assigned to them
*/

DROP POLICY IF EXISTS "Agents see assigned clients, admins see all" ON clients;

CREATE POLICY "Agents can view assigned clients"
  ON clients FOR SELECT
  TO authenticated
  USING (assigned_agent_id = auth.uid());

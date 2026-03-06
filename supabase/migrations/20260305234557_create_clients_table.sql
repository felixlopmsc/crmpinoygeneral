/*
  # Create clients table

  1. New Tables
    - `clients`
      - `id` (uuid, primary key)
      - `first_name`, `last_name` (text, required)
      - `email` (text, unique)
      - `phone`, `phone_2` (text)
      - `date_of_birth` (date)
      - `address_street`, `address_city`, `address_state`, `address_zip` (text)
      - `status` (text: Lead, Active, Inactive, Archived)
      - `source` (text: Referral, Web, Walk-in, etc.)
      - `assigned_agent_id` (uuid, FK to users)
      - `tags` (text array)
      - `notes` (text)
      - `household_id` (uuid, optional)

  2. Security
    - Enable RLS
    - Agents see their own assigned clients
    - Admins see all clients
    - Authenticated users can create clients

  3. Indexes
    - email, assigned_agent_id, status
*/

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text DEFAULT '',
  phone_2 text DEFAULT '',
  date_of_birth date,
  address_street text DEFAULT '',
  address_city text DEFAULT '',
  address_state text DEFAULT 'CA',
  address_zip text DEFAULT '',
  status text NOT NULL DEFAULT 'Lead' CHECK (status IN ('Lead', 'Active', 'Inactive', 'Archived')),
  source text DEFAULT '' CHECK (source IN ('', 'Referral', 'Web', 'Walk-in', 'Phone', 'Facebook', 'Google Ads', 'Other')),
  assigned_agent_id uuid REFERENCES users(id) ON DELETE SET NULL,
  tags text[] DEFAULT '{}',
  notes text DEFAULT '',
  household_id uuid
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents see assigned clients, admins see all"
  ON clients FOR SELECT
  TO authenticated
  USING (
    assigned_agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Authenticated users can create clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

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

CREATE POLICY "Admins can delete clients"
  ON clients FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_agent ON clients(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(last_name, first_name);

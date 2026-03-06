/*
  # Create policies table

  1. New Tables
    - `policies`
      - `id` (uuid, primary key)
      - `client_id` (uuid, FK to clients)
      - `policy_number` (text, unique)
      - `carrier` (text)
      - `policy_type` (text: Auto, Home, Renters, Business, Life, Umbrella)
      - `coverage_type` (text)
      - `effective_date`, `expiration_date` (date)
      - `annual_premium` (decimal)
      - `commission_rate`, `commission_amount` (decimal)
      - `status` (text: Active, Pending, Cancelled, Expired)
      - `payment_frequency` (text)
      - `auto_renewal` (boolean)
      - `insured_items` (jsonb)
      - `assigned_agent_id` (uuid, FK to users)

  2. Security
    - Enable RLS
    - Agents see policies for their assigned clients
    - Admins see all

  3. Indexes
    - client_id, expiration_date, status, assigned_agent_id
*/

CREATE TABLE IF NOT EXISTS policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  policy_number text UNIQUE DEFAULT '',
  carrier text NOT NULL DEFAULT '',
  policy_type text NOT NULL DEFAULT 'Auto' CHECK (policy_type IN ('Auto', 'Home', 'Renters', 'Business', 'Life', 'Umbrella')),
  coverage_type text DEFAULT '',
  effective_date date NOT NULL,
  expiration_date date NOT NULL,
  annual_premium decimal NOT NULL DEFAULT 0 CHECK (annual_premium >= 0),
  commission_rate decimal DEFAULT 0 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  commission_amount decimal DEFAULT 0,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Pending', 'Cancelled', 'Expired')),
  payment_frequency text DEFAULT 'Monthly' CHECK (payment_frequency IN ('Annual', 'Semi-Annual', 'Quarterly', 'Monthly')),
  auto_renewal boolean DEFAULT true NOT NULL,
  insured_items jsonb DEFAULT '{}',
  notes text DEFAULT '',
  assigned_agent_id uuid REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents see assigned policies, admins see all"
  ON policies FOR SELECT
  TO authenticated
  USING (
    assigned_agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Authenticated users can create policies"
  ON policies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Agents update assigned policies, admins update all"
  ON policies FOR UPDATE
  TO authenticated
  USING (
    assigned_agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  )
  WITH CHECK (
    assigned_agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Admins can delete policies"
  ON policies FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE INDEX IF NOT EXISTS idx_policies_client ON policies(client_id);
CREATE INDEX IF NOT EXISTS idx_policies_expiration ON policies(expiration_date);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
CREATE INDEX IF NOT EXISTS idx_policies_agent ON policies(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_policies_type ON policies(policy_type);

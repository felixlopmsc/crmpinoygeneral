/*
  # Create Cross-Sell Opportunities Table

  1. New Tables
    - `cross_sell_opportunities`
      - `id` (uuid, primary key) - unique identifier
      - `client_id` (uuid, foreign key to clients) - the client this opportunity is for
      - `opportunity_type` (text) - type: 'auto_home_bundle', 'home_umbrella', 'auto_umbrella', 'flood', 'earthquake', 'business', 'renters', 'life', 'cyber_liability', 'commercial_auto'
      - `recommended_coverage` (text) - human-readable coverage name
      - `current_policies` (text[]) - policy types the client already has
      - `missing_coverage` (text[]) - policy types the client is missing
      - `estimated_value` (numeric) - estimated annual premium opportunity
      - `priority` (text) - 'high', 'medium', 'low'
      - `pitch_message` (text) - sales pitch for the agent
      - `status` (text) - 'open', 'contacted', 'quoted', 'sold', 'declined'
      - `created_at` (timestamptz) - when the opportunity was identified
      - `updated_at` (timestamptz) - last update timestamp
      - `contacted_at` (timestamptz) - when client was contacted about this
      - `quoted_at` (timestamptz) - when a quote was provided
      - `closed_at` (timestamptz) - when the opportunity was closed (sold or declined)

  2. Security
    - Enable RLS on `cross_sell_opportunities` table
    - Add select, insert, update, delete policies for authenticated active users

  3. Indexes
    - client_id for fast client lookups
    - status for filtering open opportunities
    - priority for sorting
    - opportunity_type + client_id for deduplication checks

  4. Triggers
    - Auto-update `updated_at` on row changes
*/

CREATE TABLE IF NOT EXISTS cross_sell_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  opportunity_type text NOT NULL,
  recommended_coverage text NOT NULL,
  current_policies text[] NOT NULL DEFAULT '{}',
  missing_coverage text[] NOT NULL DEFAULT '{}',
  estimated_value numeric NOT NULL DEFAULT 0,
  priority text NOT NULL DEFAULT 'medium',
  pitch_message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  contacted_at timestamptz,
  quoted_at timestamptz,
  closed_at timestamptz,
  CONSTRAINT cross_sell_priority_check CHECK (priority IN ('high', 'medium', 'low')),
  CONSTRAINT cross_sell_status_check CHECK (status IN ('open', 'contacted', 'quoted', 'sold', 'declined'))
);

ALTER TABLE cross_sell_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cross-sell opportunities"
  ON cross_sell_opportunities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );

CREATE POLICY "Authenticated users can insert cross-sell opportunities"
  ON cross_sell_opportunities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );

CREATE POLICY "Authenticated users can update cross-sell opportunities"
  ON cross_sell_opportunities
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );

CREATE POLICY "Authenticated users can delete cross-sell opportunities"
  ON cross_sell_opportunities
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_cross_sell_client_id ON cross_sell_opportunities(client_id);
CREATE INDEX IF NOT EXISTS idx_cross_sell_status ON cross_sell_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_cross_sell_priority ON cross_sell_opportunities(priority);
CREATE INDEX IF NOT EXISTS idx_cross_sell_type_client ON cross_sell_opportunities(opportunity_type, client_id);

CREATE OR REPLACE FUNCTION update_cross_sell_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'cross_sell_updated_at'
  ) THEN
    CREATE TRIGGER cross_sell_updated_at
      BEFORE UPDATE ON cross_sell_opportunities
      FOR EACH ROW
      EXECUTE FUNCTION update_cross_sell_timestamp();
  END IF;
END $$;

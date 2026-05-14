/*
  # Add source_lead_id to clients table

  1. Modified Tables
    - `clients`
      - Added `source_lead_id` (uuid, nullable) - references the lead that was converted into this client

  2. Important Notes
    - This column enables tracking which clients were originally leads
    - Used by the "From Leads" smart filter on the clients page
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'source_lead_id'
  ) THEN
    ALTER TABLE clients ADD COLUMN source_lead_id uuid;
  END IF;
END $$;

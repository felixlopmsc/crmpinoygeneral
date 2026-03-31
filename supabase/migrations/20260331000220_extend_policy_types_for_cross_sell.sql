/*
  # Extend Policy Types for Cross-Sell Coverage

  1. Changes
    - Extends the `policy_type` CHECK constraint on `policies` table to include:
      - 'Flood' - Flood insurance
      - 'Earthquake' - Earthquake insurance
      - 'Cyber Liability' - Cyber liability insurance
      - 'Commercial Auto' - Commercial auto insurance
    - These new types are needed for the cross-sell identification system
      to properly detect when clients already have these coverage types

  2. Important Notes
    - No data is modified, only the constraint is updated
    - Existing records remain unchanged
    - The edge function cross-sell analysis checks for these policy types
*/

ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_policy_type_check;

ALTER TABLE policies ADD CONSTRAINT policies_policy_type_check
  CHECK (policy_type IN ('Auto', 'Home', 'Renters', 'Business', 'Life', 'Umbrella', 'Flood', 'Earthquake', 'Cyber Liability', 'Commercial Auto'));

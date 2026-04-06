/*
  # Rename zip column to address_zip

  1. Modified Tables
    - `clients`
      - Rename column `zip` to `address_zip` to match application code expectations

  2. Important Notes
    - The original migration defined the column as `address_zip`
    - The actual database column is `zip`, causing a schema mismatch
    - This migration corrects the name to align with the application
*/

ALTER TABLE clients RENAME COLUMN zip TO address_zip;
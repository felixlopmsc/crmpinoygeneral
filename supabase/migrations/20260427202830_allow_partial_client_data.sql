/*
  # Allow partial client data for flexible CSV imports

  1. Modified Tables
    - `clients`
      - `email` changed from NOT NULL to nullable, allowing clients without email
      - `first_name` gets default empty string, allowing clients with minimal data
      - `last_name` gets default empty string, allowing clients with minimal data
      - Unique constraint on email replaced with partial unique index (only non-empty emails)

  2. Important Notes
    - Existing data is unaffected -- all current rows have email, first_name, last_name
    - The partial unique index ensures email uniqueness is still enforced when email is provided
    - This enables CSV imports with incomplete data (e.g., name + phone only)
*/

-- Make email nullable
ALTER TABLE clients ALTER COLUMN email DROP NOT NULL;

-- Add defaults to first_name and last_name so partial rows can be inserted
ALTER TABLE clients ALTER COLUMN first_name SET DEFAULT '';
ALTER TABLE clients ALTER COLUMN last_name SET DEFAULT '';

-- Drop the existing unique constraint on email
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_email_key;

-- Create a partial unique index that only enforces uniqueness for non-null, non-empty emails
CREATE UNIQUE INDEX IF NOT EXISTS clients_email_unique_nonempty
  ON clients (email)
  WHERE email IS NOT NULL AND email <> '';

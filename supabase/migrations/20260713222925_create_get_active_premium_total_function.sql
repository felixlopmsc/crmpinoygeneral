/*
# Create get_active_premium_total() function

1. New Functions
  - `get_active_premium_total()` — returns the sum of annual_premium for all
    policies that are currently active (status = 'Active'), not expired
    (expiration_date >= current_date), and not soft-deleted (deleted_at IS NULL).

2. Purpose
  - Provides a single source of truth for total active premium calculation,
    used by the Reports page and any other consumer that needs this metric.
  - Ensures the Reports "Total Premium" matches the Policies page active filter total.

3. Security
  - Uses SECURITY INVOKER so the function runs with the caller's permissions
    and respects RLS policies on the policies table.

4. Important Notes
  - Uses CREATE OR REPLACE to be idempotent / safe to re-run.
  - Returns 0 (via COALESCE) when no matching policies exist.
  - The status check is case-insensitive via LOWER() to handle any casing.
*/

CREATE OR REPLACE FUNCTION get_active_premium_total()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT coalesce(sum(annual_premium), 0)
  FROM policies
  WHERE lower(status) = 'active'
    AND expiration_date >= current_date
    AND deleted_at IS NULL;
$$;

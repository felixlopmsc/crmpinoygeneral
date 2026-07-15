/*
# Restore missing UPDATE and INSERT policies on users table

1. Problem
  - The `users` table only has SELECT policies. The UPDATE policy ("Users can update
    own profile") was dropped at some point, causing profile saves to silently succeed
    (no error returned) but affect 0 rows due to RLS blocking.

2. Changes
  - Re-creates the UPDATE policy so authenticated users can update their own row.
  - Re-creates the INSERT policy so the trigger / self-signup path still works.

3. Security
  - UPDATE is scoped to `auth.uid() = id` (own row only).
  - INSERT is scoped to `auth.uid() = id` (can only create own profile row).
*/

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

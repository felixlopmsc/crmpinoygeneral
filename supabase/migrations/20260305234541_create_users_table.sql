/*
  # Create users (agents) table

  1. New Tables
    - `users`
      - `id` (uuid, primary key, linked to Supabase Auth)
      - `created_at` (timestamptz)
      - `email` (text, unique)
      - `full_name` (text)
      - `role` (text: Admin, Agent, Viewer)
      - `phone` (text)
      - `license_number` (text)
      - `license_expiration` (date)
      - `is_active` (boolean, default true)
      - `avatar_url` (text)

  2. Security
    - Enable RLS on `users` table
    - Authenticated users can read all user profiles
    - Users can update their own profile
    - Only admins can insert/delete users
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'Agent' CHECK (role IN ('Admin', 'Agent', 'Viewer')),
  phone text DEFAULT '',
  license_number text DEFAULT '',
  license_expiration date,
  is_active boolean DEFAULT true NOT NULL,
  avatar_url text DEFAULT ''
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all profiles"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin'
    )
    OR NOT EXISTS (SELECT 1 FROM users)
  );

CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

/*
  # Auto-create user profile on auth signup

  1. Changes
    - Creates a function `handle_new_user` that inserts a row into `public.users`
      whenever a new user signs up via Supabase Auth
    - Creates a trigger on `auth.users` that fires after insert
    - Updates the RLS insert policy so authenticated users can insert their own profile row

  2. Security
    - The trigger function runs with SECURITY DEFINER so it bypasses RLS
    - The insert policy is updated to allow users to create their own row
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'Admin'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

DROP POLICY IF EXISTS "Admins can insert users" ON users;

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

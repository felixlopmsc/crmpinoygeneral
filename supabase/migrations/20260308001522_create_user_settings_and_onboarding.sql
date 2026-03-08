/*
  # Create user settings and onboarding progress tables

  1. New Tables
    - `user_settings`
      - `user_id` (uuid, primary key, references users.id)
      - `email_notifications` (boolean) - receive email notifications
      - `renewal_reminder_days` (integer) - days before renewal to send reminder
      - `default_commission_view` (text) - preferred commission view mode
      - `theme` (text) - UI theme preference (light/dark/system)
      - `compact_sidebar` (boolean) - sidebar default state
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `onboarding_progress`
      - `user_id` (uuid, primary key, references users.id)
      - `completed` (boolean) - whether onboarding is fully complete
      - `step_profile` (boolean) - completed profile setup step
      - `step_first_client` (boolean) - added first client
      - `step_first_policy` (boolean) - added first policy
      - `step_explore_dashboard` (boolean) - visited dashboard
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only read/update their own settings and onboarding progress
*/

CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  email_notifications boolean NOT NULL DEFAULT true,
  renewal_reminder_days integer NOT NULL DEFAULT 30,
  default_commission_view text NOT NULL DEFAULT 'summary',
  theme text NOT NULL DEFAULT 'light',
  compact_sidebar boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS onboarding_progress (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  completed boolean NOT NULL DEFAULT false,
  step_profile boolean NOT NULL DEFAULT false,
  step_first_client boolean NOT NULL DEFAULT false,
  step_first_policy boolean NOT NULL DEFAULT false,
  step_explore_dashboard boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding"
  ON onboarding_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding"
  ON onboarding_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding"
  ON onboarding_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION init_user_settings_and_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO onboarding_progress (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_user_created_init_settings'
  ) THEN
    CREATE TRIGGER on_user_created_init_settings
      AFTER INSERT ON users
      FOR EACH ROW
      EXECUTE FUNCTION init_user_settings_and_onboarding();
  END IF;
END $$;

INSERT INTO user_settings (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM user_settings)
ON CONFLICT DO NOTHING;

INSERT INTO onboarding_progress (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM onboarding_progress)
ON CONFLICT DO NOTHING;

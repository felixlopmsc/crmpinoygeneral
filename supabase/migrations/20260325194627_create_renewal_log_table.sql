/*
  # Create Renewal Log Table

  1. New Tables
    - `renewal_log`
      - `id` (uuid, primary key) - unique identifier for each log entry
      - `renewal_id` (uuid, foreign key to renewals) - links to the renewal record
      - `policy_id` (uuid, foreign key to policies) - links to the policy
      - `client_id` (uuid, foreign key to clients) - links to the client
      - `reminder_type` (text) - type of reminder sent: '90_day', '60_day', '30_day', '7_day'
      - `email_sent_to` (text) - email address the reminder was sent to
      - `email_status` (text) - delivery status: 'sent', 'failed', 'bounced'
      - `email_subject` (text) - subject line of the email
      - `error_message` (text, nullable) - error details if email failed
      - `sent_at` (timestamptz) - when the email was sent
      - `created_at` (timestamptz) - record creation timestamp

  2. Security
    - Enable RLS on `renewal_log` table
    - Add select policy for authenticated users
    - Add insert policy for authenticated users
*/

CREATE TABLE IF NOT EXISTS renewal_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_id uuid REFERENCES renewals(id),
  policy_id uuid NOT NULL REFERENCES policies(id),
  client_id uuid NOT NULL REFERENCES clients(id),
  reminder_type text NOT NULL DEFAULT '30_day',
  email_sent_to text NOT NULL DEFAULT '',
  email_status text NOT NULL DEFAULT 'sent',
  email_subject text NOT NULL DEFAULT '',
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT renewal_log_reminder_type_check CHECK (reminder_type IN ('90_day', '60_day', '30_day', '7_day')),
  CONSTRAINT renewal_log_email_status_check CHECK (email_status IN ('sent', 'failed', 'bounced'))
);

ALTER TABLE renewal_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view renewal logs"
  ON renewal_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );

CREATE POLICY "Authenticated users can insert renewal logs"
  ON renewal_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_renewal_log_policy_id ON renewal_log(policy_id);
CREATE INDEX IF NOT EXISTS idx_renewal_log_client_id ON renewal_log(client_id);
CREATE INDEX IF NOT EXISTS idx_renewal_log_renewal_id ON renewal_log(renewal_id);
CREATE INDEX IF NOT EXISTS idx_renewal_log_sent_at ON renewal_log(sent_at DESC);

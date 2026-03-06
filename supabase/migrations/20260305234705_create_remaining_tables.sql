/*
  # Create remaining CRM tables

  1. New Tables
    - `renewals` - Track policy renewal status and reminders
    - `deals` - Sales pipeline deals/opportunities
    - `activities` - Activity log (calls, emails, meetings, notes)
    - `commissions` - Commission tracking per policy
    - `claims` - Insurance claims tracking
    - `documents` - Document metadata for uploaded files
    - `tasks` - Task management
    - `email_campaigns` - Email campaign tracking

  2. Security
    - Enable RLS on all tables
    - Agents see their own data or data for their assigned clients
    - Admins see everything
    - Authenticated users can create records

  3. Indexes
    - Various indexes on foreign keys and frequently queried columns
*/

-- RENEWALS TABLE
CREATE TABLE IF NOT EXISTS renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  renewal_date date NOT NULL,
  reminder_90_days boolean DEFAULT false NOT NULL,
  reminder_60_days boolean DEFAULT false NOT NULL,
  reminder_30_days boolean DEFAULT false NOT NULL,
  reminder_7_days boolean DEFAULT false NOT NULL,
  status text NOT NULL DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'Contacted', 'Renewed', 'Lost', 'Pending')),
  contacted_date timestamptz,
  notes text DEFAULT '',
  new_premium decimal,
  outcome text DEFAULT '' CHECK (outcome IN ('', 'Renewed-Same Carrier', 'Renewed-Different Carrier', 'Lost to Competitor', 'Cancelled'))
);

ALTER TABLE renewals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents see renewals for assigned clients"
  ON renewals FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM clients WHERE clients.id = renewals.client_id AND clients.assigned_agent_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Authenticated users can create renewals"
  ON renewals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Agents update renewals for assigned clients"
  ON renewals FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM clients WHERE clients.id = renewals.client_id AND clients.assigned_agent_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM clients WHERE clients.id = renewals.client_id AND clients.assigned_agent_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Admins can delete renewals"
  ON renewals FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin'));

CREATE INDEX IF NOT EXISTS idx_renewals_date ON renewals(renewal_date);
CREATE INDEX IF NOT EXISTS idx_renewals_status ON renewals(status);
CREATE INDEX IF NOT EXISTS idx_renewals_client ON renewals(client_id);
CREATE INDEX IF NOT EXISTS idx_renewals_policy ON renewals(policy_id);

-- DEALS TABLE
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  stage text NOT NULL DEFAULT 'New Lead' CHECK (stage IN ('New Lead', 'Contacted', 'Quote Sent', 'Negotiating', 'Closed Won', 'Closed Lost')),
  value decimal DEFAULT 0 CHECK (value >= 0),
  probability integer DEFAULT 10 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date date,
  policy_type text DEFAULT 'Auto' CHECK (policy_type IN ('Auto', 'Home', 'Renters', 'Business', 'Life', 'Umbrella')),
  carrier_quoted text DEFAULT '',
  quoted_premium decimal DEFAULT 0,
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Won', 'Lost')),
  lost_reason text DEFAULT '',
  notes text DEFAULT '',
  assigned_agent_id uuid REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents see assigned deals, admins see all"
  ON deals FOR SELECT TO authenticated
  USING (
    assigned_agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Authenticated users can create deals"
  ON deals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Agents update assigned deals, admins update all"
  ON deals FOR UPDATE TO authenticated
  USING (
    assigned_agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  )
  WITH CHECK (
    assigned_agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Admins can delete deals"
  ON deals FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin'));

CREATE INDEX IF NOT EXISTS idx_deals_client ON deals(client_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_agent ON deals(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_deals_close_date ON deals(expected_close_date);

-- ACTIVITIES TABLE
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  policy_id uuid REFERENCES policies(id) ON DELETE SET NULL,
  activity_type text NOT NULL DEFAULT 'Note' CHECK (activity_type IN ('Call', 'Email', 'Meeting', 'Note', 'Task', 'SMS')),
  subject text NOT NULL DEFAULT '',
  description text DEFAULT '',
  activity_date timestamptz DEFAULT now() NOT NULL,
  completed boolean DEFAULT false NOT NULL,
  due_date timestamptz,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents see activities for assigned clients"
  ON activities FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM clients WHERE clients.id = activities.client_id AND clients.assigned_agent_id = auth.uid())
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Authenticated users can create activities"
  ON activities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users update their own activities or admins"
  ON activities FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  )
  WITH CHECK (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Users delete own activities, admins delete all"
  ON activities FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE INDEX IF NOT EXISTS idx_activities_client ON activities(client_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_activities_created_by ON activities(created_by);

-- COMMISSIONS TABLE
CREATE TABLE IF NOT EXISTS commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  commission_date date DEFAULT CURRENT_DATE NOT NULL,
  commission_amount decimal NOT NULL DEFAULT 0,
  carrier text DEFAULT '',
  policy_type text DEFAULT '',
  payment_status text NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Disputed')),
  payment_date date,
  notes text DEFAULT ''
);

ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents see own commissions, admins see all"
  ON commissions FOR SELECT TO authenticated
  USING (
    agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Authenticated users can create commissions"
  ON commissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update commissions"
  ON commissions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin'));

CREATE POLICY "Admins can delete commissions"
  ON commissions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin'));

CREATE INDEX IF NOT EXISTS idx_commissions_agent ON commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(payment_status);
CREATE INDEX IF NOT EXISTS idx_commissions_date ON commissions(commission_date);

-- CLAIMS TABLE
CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  policy_id uuid NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  claim_number text DEFAULT '',
  claim_date date NOT NULL,
  reported_date date DEFAULT CURRENT_DATE NOT NULL,
  claim_type text NOT NULL DEFAULT '' CHECK (claim_type IN ('', 'Auto Accident', 'Property Damage', 'Theft', 'Injury', 'Liability', 'Other')),
  description text DEFAULT '',
  claim_amount decimal DEFAULT 0,
  status text NOT NULL DEFAULT 'Filed' CHECK (status IN ('Filed', 'Under Review', 'Approved', 'Denied', 'Paid', 'Closed')),
  adjuster_name text DEFAULT '',
  adjuster_phone text DEFAULT '',
  resolution_date date,
  notes text DEFAULT ''
);

ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents see claims for assigned clients"
  ON claims FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM clients WHERE clients.id = claims.client_id AND clients.assigned_agent_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Authenticated users can create claims"
  ON claims FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Agents update claims for assigned clients"
  ON claims FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM clients WHERE clients.id = claims.client_id AND clients.assigned_agent_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM clients WHERE clients.id = claims.client_id AND clients.assigned_agent_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Admins can delete claims"
  ON claims FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin'));

-- DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  policy_id uuid REFERENCES policies(id) ON DELETE SET NULL,
  document_type text NOT NULL DEFAULT '' CHECK (document_type IN ('', 'Application', 'Policy', 'ID Card', 'Claim Form', 'Driver License', 'Title', 'Other')),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer DEFAULT 0,
  mime_type text DEFAULT '',
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  notes text DEFAULT ''
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents see docs for assigned clients"
  ON documents FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM clients WHERE clients.id = documents.client_id AND clients.assigned_agent_id = auth.uid())
    OR uploaded_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Authenticated users can upload documents"
  ON documents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Uploaders or admins can update docs"
  ON documents FOR UPDATE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  )
  WITH CHECK (
    uploaded_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Admins can delete documents"
  ON documents FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin'));

-- TASKS TABLE
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  due_date timestamptz,
  priority text NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  status text NOT NULL DEFAULT 'To Do' CHECK (status IN ('To Do', 'In Progress', 'Completed', 'Cancelled')),
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  related_client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  related_deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  related_policy_id uuid REFERENCES policies(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see tasks assigned to them or created by them"
  ON tasks FOR SELECT TO authenticated
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Authenticated users can create tasks"
  ON tasks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Assigned users or creators can update tasks"
  ON tasks FOR UPDATE TO authenticated
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  )
  WITH CHECK (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Creators or admins can delete tasks"
  ON tasks FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(related_client_id);

-- EMAIL CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  campaign_name text NOT NULL,
  campaign_type text NOT NULL DEFAULT '' CHECK (campaign_type IN ('', 'Renewal Reminder', 'Birthday', 'Check-in', 'Newsletter', 'Holiday', 'Other')),
  subject_line text NOT NULL DEFAULT '',
  email_body text DEFAULT '',
  send_date timestamptz,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Scheduled', 'Sent', 'Failed')),
  recipients_count integer DEFAULT 0,
  opened_count integer DEFAULT 0,
  clicked_count integer DEFAULT 0,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read campaigns"
  ON email_campaigns FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create campaigns"
  ON email_campaigns FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Creators or admins can update campaigns"
  ON email_campaigns FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Admins can delete campaigns"
  ON email_campaigns FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin'));

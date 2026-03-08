export interface User {
  id: string;
  created_at: string;
  email: string;
  full_name: string;
  role: 'Admin' | 'Agent' | 'Viewer';
  phone: string;
  license_number: string;
  license_expiration: string | null;
  is_active: boolean;
  avatar_url: string;
}

export interface Client {
  id: string;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  phone_2: string;
  date_of_birth: string | null;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  status: 'Lead' | 'Active' | 'Inactive' | 'Archived';
  source: string;
  assigned_agent_id: string | null;
  tags: string[];
  notes: string;
  household_id: string | null;
}

export interface Policy {
  id: string;
  created_at: string;
  updated_at: string;
  client_id: string;
  policy_number: string;
  carrier: string;
  policy_type: 'Auto' | 'Home' | 'Renters' | 'Business' | 'Life' | 'Umbrella';
  coverage_type: string;
  effective_date: string;
  expiration_date: string;
  annual_premium: number;
  commission_rate: number;
  commission_amount: number;
  status: 'Active' | 'Pending' | 'Cancelled' | 'Expired';
  payment_frequency: 'Annual' | 'Semi-Annual' | 'Quarterly' | 'Monthly';
  auto_renewal: boolean;
  insured_items: Record<string, unknown>;
  notes: string;
  assigned_agent_id: string | null;
  client?: Client;
}

export interface Renewal {
  id: string;
  policy_id: string;
  client_id: string;
  renewal_date: string;
  reminder_90_days: boolean;
  reminder_60_days: boolean;
  reminder_30_days: boolean;
  reminder_7_days: boolean;
  status: 'Upcoming' | 'Contacted' | 'Renewed' | 'Lost' | 'Pending';
  contacted_date: string | null;
  notes: string;
  new_premium: number | null;
  outcome: string;
  policy?: Policy;
  client?: Client;
}

export interface Deal {
  id: string;
  created_at: string;
  updated_at: string;
  client_id: string;
  title: string;
  stage: 'New Lead' | 'Contacted' | 'Quote Sent' | 'Negotiating' | 'Closed Won' | 'Closed Lost';
  value: number;
  probability: number;
  expected_close_date: string | null;
  policy_type: string;
  carrier_quoted: string;
  quoted_premium: number;
  status: 'Open' | 'Won' | 'Lost';
  lost_reason: string;
  notes: string;
  assigned_agent_id: string | null;
  client?: Client;
}

export interface Activity {
  id: string;
  created_at: string;
  client_id: string;
  deal_id: string | null;
  policy_id: string | null;
  activity_type: 'Call' | 'Email' | 'Meeting' | 'Note' | 'Task' | 'SMS';
  subject: string;
  description: string;
  activity_date: string;
  completed: boolean;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string | null;
  client?: Client;
}

export interface Commission {
  id: string;
  policy_id: string;
  client_id: string;
  agent_id: string;
  commission_date: string;
  commission_amount: number;
  carrier: string;
  policy_type: string;
  payment_status: 'Pending' | 'Paid' | 'Disputed';
  payment_date: string | null;
  notes: string;
  client?: Client;
  policy?: Policy;
}

export interface Claim {
  id: string;
  created_at: string;
  updated_at: string;
  policy_id: string;
  client_id: string;
  claim_number: string;
  claim_date: string;
  reported_date: string;
  claim_type: string;
  description: string;
  claim_amount: number;
  status: 'Filed' | 'Under Review' | 'Approved' | 'Denied' | 'Paid' | 'Closed';
  adjuster_name: string;
  adjuster_phone: string;
  resolution_date: string | null;
  notes: string;
  client?: Client;
  policy?: Policy;
}

export interface Document {
  id: string;
  created_at: string;
  client_id: string;
  policy_id: string | null;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string | null;
  notes: string;
}

export interface Task {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string;
  due_date: string | null;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'To Do' | 'In Progress' | 'Completed' | 'Cancelled';
  assigned_to: string | null;
  related_client_id: string | null;
  related_deal_id: string | null;
  related_policy_id: string | null;
  completed_at: string | null;
  created_by: string | null;
  client?: Client;
}

export interface EmailCampaign {
  id: string;
  created_at: string;
  campaign_name: string;
  campaign_type: string;
  subject_line: string;
  email_body: string;
  send_date: string | null;
  status: 'Draft' | 'Scheduled' | 'Sent' | 'Failed';
  recipients_count: number;
  opened_count: number;
  clicked_count: number;
  created_by: string | null;
}

export const POLICY_TYPES = ['Auto', 'Home', 'Renters', 'Business', 'Life', 'Umbrella'] as const;

export const CARRIERS = [
  'Progressive', 'Liberty Mutual', 'Nationwide', 'Travelers', 'Hartford',
  'Mercury', 'Kemper', 'Bristol West', 'National General', 'Safeco',
  'Foremost', 'Dairyland', 'Other'
] as const;

export const CLIENT_STATUSES = ['Lead', 'Active', 'Inactive', 'Archived'] as const;
export const CLIENT_SOURCES = ['Referral', 'Web', 'Walk-in', 'Phone', 'Facebook', 'Google Ads', 'Other'] as const;

export const DEAL_STAGES = ['New Lead', 'Contacted', 'Quote Sent', 'Negotiating', 'Closed Won', 'Closed Lost'] as const;

export const STAGE_PROBABILITIES: Record<string, number> = {
  'New Lead': 10,
  'Contacted': 25,
  'Quote Sent': 50,
  'Negotiating': 75,
  'Closed Won': 100,
  'Closed Lost': 0,
};

export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;
export const TASK_STATUSES = ['To Do', 'In Progress', 'Completed', 'Cancelled'] as const;

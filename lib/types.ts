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
  deleted_at: string | null;
  client?: Client;
}

export interface Renewal {
  id: string;
  policy_id: string;
  client_id: string;
  renewal_date: string;
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

export interface CrossSellOpportunity {
  id: string;
  client_id: string;
  opportunity_type: string;
  recommended_coverage: string;
  current_policies: string[];
  missing_coverage: string[];
  estimated_value: number;
  priority: 'high' | 'medium' | 'low';
  pitch_message: string;
  status: 'open' | 'contacted' | 'quoted' | 'sold' | 'declined';
  created_at: string;
  updated_at: string;
  contacted_at: string | null;
  quoted_at: string | null;
  closed_at: string | null;
  client?: Client;
}

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  address_zip: string | null;
  lead_source: string | null;
  lead_score: number;
  life_event_type: string | null;
  priority: string;
  status: string;
  notes: string | null;
  created_date: string;
  updated_at: string;
}

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'declined'] as const;
export const LEAD_PRIORITIES = ['high', 'medium', 'low', 'hot', 'normal'] as const;
export const LEAD_SOURCES = [
  'Referral', 'Quiz', 'Social Media', 'Google', 'Walk-in', 'Cold Call', 'Other',
  'CA SOS', 'Google Maps', 'Google Search', 'Yelp', 'Zillow',
  'FACC Cerritos', 'Norwalk Chamber of Commerce Directory', 'VoyageLA',
] as const;

export const CROSS_SELL_STATUSES = ['open', 'contacted', 'quoted', 'sold', 'declined'] as const;

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

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  created_at: string;
  status: 'New' | 'Replied' | 'Closed';
  handled_by: string | null;
  handled_at: string | null;
  lead_id: string | null;
}

export const CONTACT_SUBMISSION_STATUSES = ['New', 'Replied', 'Closed'] as const;

export interface QuoteRequest {
  id: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  status: 'New' | 'Contacted' | 'Quoted' | 'Won' | 'Lost';
  coverage_type: string | null;
  source: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  business_legal_name: string | null;
  business_dba: string | null;
  business_fein: string | null;
  business_entity_type: string | null;
  business_year_est: number | null;
  business_phone: string | null;
  business_website: string | null;
  business_description: string | null;
  form_data_auto: Record<string, unknown> | null;
  form_data_home: Record<string, unknown> | null;
  form_data_renters: Record<string, unknown> | null;
  form_data_bop: Record<string, unknown> | null;
  form_data_cgl: Record<string, unknown> | null;
  form_data_wc: Record<string, unknown> | null;
  form_data_commercial_auto: Record<string, unknown> | null;
  form_data_umbrella: Record<string, unknown> | null;
  has_prior_losses: boolean | null;
  loss_history: unknown;
  prior_cancellation: boolean | null;
  prior_cancellation_explanation: string | null;
  prior_carrier: string | null;
  prior_policy_expiration: string | null;
  years_continuously_insured: number | null;
  internal_notes: string | null;
  estimate_low: number | null;
  estimate_high: number | null;
  estimate_factors: Record<string, unknown> | null;
  lead_id: string | null;
  client_id: string | null;
  assigned_agent_id: string | null;
}

export interface QuoteRequestDocument {
  id: string;
  created_at: string;
  quote_request_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  document_type: string | null;
}

export const QUOTE_REQUEST_STATUSES = ['New', 'Contacted', 'Quoted', 'Won', 'Lost'] as const;

// Demo / sales requests captured from the public product marketing landing
// page (app/page.tsx). Public form inserts via the anon client (status 'New'
// only); staff read/triage. See migration create_demo_requests.
export interface DemoRequest {
  id: string;
  created_at: string;
  updated_at: string | null;
  status: 'New' | 'Contacted' | 'Demoed' | 'Won' | 'Lost';
  full_name: string | null;
  work_email: string | null;
  company: string | null;
  phone: string | null;
  team_size: string | null;
  interest: string | null;
  message: string | null;
  source: string | null;
  internal_notes: string | null;
  assigned_agent_id: string | null;
}

export const DEMO_REQUEST_STATUSES = ['New', 'Contacted', 'Demoed', 'Won', 'Lost'] as const;

// Maps a coverage_type label to the jsonb column that holds its answers, and
// whether it is a commercial coverage (business fields shown). Coverage types
// not listed here fall back to whichever form_data_* column is non-empty.
export const QUOTE_COVERAGE_MAP: Record<string, { column: keyof QuoteRequest; commercial: boolean }> = {
  'Personal Auto': { column: 'form_data_auto', commercial: false },
  'Auto': { column: 'form_data_auto', commercial: false },
  'Homeowners': { column: 'form_data_home', commercial: false },
  'Home': { column: 'form_data_home', commercial: false },
  'Renters': { column: 'form_data_renters', commercial: false },
  'BOP': { column: 'form_data_bop', commercial: true },
  'Business Owners Policy': { column: 'form_data_bop', commercial: true },
  'General Liability': { column: 'form_data_cgl', commercial: true },
  'CGL': { column: 'form_data_cgl', commercial: true },
  'Workers Comp': { column: 'form_data_wc', commercial: true },
  'Workers Compensation': { column: 'form_data_wc', commercial: true },
  'Commercial Auto': { column: 'form_data_commercial_auto', commercial: true },
  'Umbrella': { column: 'form_data_umbrella', commercial: false },
};

export const QUOTE_FORM_DATA_COLUMNS: (keyof QuoteRequest)[] = [
  'form_data_auto', 'form_data_home', 'form_data_renters', 'form_data_bop',
  'form_data_cgl', 'form_data_wc', 'form_data_commercial_auto', 'form_data_umbrella',
];

export const COMMERCIAL_FORM_DATA_COLUMNS: (keyof QuoteRequest)[] = [
  'form_data_bop', 'form_data_cgl', 'form_data_wc', 'form_data_commercial_auto',
];

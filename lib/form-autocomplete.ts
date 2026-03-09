export const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function formatZipInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 5);
}

export const CLAIM_TYPE_BY_POLICY: Record<string, string[]> = {
  Auto: ['Auto Accident', 'Hit & Run', 'Theft', 'Vandalism', 'Weather Damage', 'Glass/Windshield', 'Other'],
  Home: ['Property Damage', 'Water Damage', 'Fire', 'Theft', 'Liability', 'Weather/Storm', 'Other'],
  Renters: ['Personal Property', 'Theft', 'Water Damage', 'Liability', 'Other'],
  Business: ['Property Damage', 'Liability', 'Workers Comp', 'Business Interruption', 'Theft', 'Other'],
  Life: ['Death Benefit', 'Accidental Death', 'Other'],
  Umbrella: ['Liability', 'Excess Claim', 'Other'],
};

export function generateClaimNumber(policyType: string): string {
  const prefix = policyType ? policyType.slice(0, 3).toUpperCase() : 'CLM';
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${prefix}-${year}-${random}`;
}

export interface TaskSuggestion {
  title: string;
  description: string;
  priority: string;
  dueDaysFromNow: number;
}

export const TASK_SUGGESTIONS: Record<string, TaskSuggestion[]> = {
  'Follow-up': [
    { title: 'Follow up with client', description: 'Check in on policy status and satisfaction', priority: 'Medium', dueDaysFromNow: 3 },
    { title: 'Follow up on quote', description: 'Reach out regarding the pending quote', priority: 'High', dueDaysFromNow: 2 },
    { title: 'Follow up on claim', description: 'Check claim status and update client', priority: 'High', dueDaysFromNow: 1 },
    { title: 'Follow up on renewal', description: 'Contact client about upcoming renewal', priority: 'High', dueDaysFromNow: 7 },
  ],
  'Administrative': [
    { title: 'Send policy documents', description: 'Email policy documents to client', priority: 'Medium', dueDaysFromNow: 1 },
    { title: 'Update client records', description: 'Verify and update contact information', priority: 'Low', dueDaysFromNow: 5 },
    { title: 'Process endorsement', description: 'Submit policy endorsement request', priority: 'Medium', dueDaysFromNow: 3 },
    { title: 'File paperwork', description: 'Complete and file required documentation', priority: 'Low', dueDaysFromNow: 7 },
  ],
  'Sales': [
    { title: 'Prepare quote', description: 'Generate insurance quote for prospect', priority: 'High', dueDaysFromNow: 2 },
    { title: 'Schedule consultation', description: 'Set up initial consultation meeting', priority: 'Medium', dueDaysFromNow: 3 },
    { title: 'Cross-sell opportunity', description: 'Present additional coverage options', priority: 'Medium', dueDaysFromNow: 5 },
    { title: 'Send proposal', description: 'Prepare and send coverage proposal', priority: 'High', dueDaysFromNow: 2 },
  ],
  'Service': [
    { title: 'Process payment', description: 'Process premium payment or update billing', priority: 'High', dueDaysFromNow: 1 },
    { title: 'Certificate of insurance', description: 'Issue certificate of insurance', priority: 'Medium', dueDaysFromNow: 1 },
    { title: 'Review coverage', description: 'Annual coverage review with client', priority: 'Medium', dueDaysFromNow: 14 },
    { title: 'Handle complaint', description: 'Address and resolve client complaint', priority: 'Urgent', dueDaysFromNow: 1 },
  ],
};

export function getTaskSuggestionsForClient(clientName: string): TaskSuggestion[] {
  return [
    { title: `Call ${clientName}`, description: 'Phone call follow-up', priority: 'Medium', dueDaysFromNow: 1 },
    { title: `Email ${clientName}`, description: 'Send email update', priority: 'Low', dueDaysFromNow: 2 },
    { title: `Review ${clientName}'s policies`, description: 'Check coverage and renewal dates', priority: 'Medium', dueDaysFromNow: 7 },
  ];
}

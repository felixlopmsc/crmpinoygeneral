export interface TaskTemplateItem {
  title: string;
  description: string;
  dayOffset: number;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  category: 'onboarding' | 'renewal' | 'quote';
  icon: string;
  color: string;
  tasks: TaskTemplateItem[];
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'new-client-onboarding',
    name: 'New Client Onboarding',
    description: 'Complete checklist for bringing a new client into the system and ensuring all documentation is collected.',
    category: 'onboarding',
    icon: 'UserPlus',
    color: 'bg-[#1E40AF]/10 text-[#1E40AF]',
    tasks: [
      {
        title: 'Send welcome email with agency introduction',
        description: 'Send branded welcome email introducing the agency, key contacts, and what to expect.',
        dayOffset: 0,
        priority: 'High',
      },
      {
        title: 'Collect signed broker of record letter',
        description: 'Obtain signed BOR to authorize the agency to service existing policies.',
        dayOffset: 0,
        priority: 'High',
      },
      {
        title: 'Gather current declarations pages',
        description: 'Request copies of all current insurance declaration pages from the client.',
        dayOffset: 1,
        priority: 'High',
      },
      {
        title: 'Review existing coverage and identify gaps',
        description: 'Analyze current policies for coverage gaps, redundancies, and optimization opportunities.',
        dayOffset: 2,
        priority: 'Medium',
      },
      {
        title: 'Verify driver\'s license and vehicle information',
        description: 'Confirm valid DL, vehicle VINs, and any driver exclusions.',
        dayOffset: 2,
        priority: 'Medium',
      },
      {
        title: 'Run MVR and CLUE reports',
        description: 'Pull motor vehicle records and Comprehensive Loss Underwriting Exchange reports.',
        dayOffset: 3,
        priority: 'Medium',
      },
      {
        title: 'Prepare coverage recommendation proposal',
        description: 'Build a comprehensive proposal with recommended coverages and carrier options.',
        dayOffset: 5,
        priority: 'High',
      },
      {
        title: 'Schedule coverage review meeting',
        description: 'Set up a meeting to walk through the coverage proposal and answer questions.',
        dayOffset: 5,
        priority: 'Medium',
      },
      {
        title: 'Set up client portal access',
        description: 'Create login credentials for the client portal and send access instructions.',
        dayOffset: 7,
        priority: 'Low',
      },
      {
        title: 'Add all policies to management system',
        description: 'Enter all policy details, expiration dates, and premium information into the system.',
        dayOffset: 7,
        priority: 'High',
      },
      {
        title: 'Set renewal date reminders',
        description: 'Configure 90, 60, 30, and 7-day renewal reminders for all active policies.',
        dayOffset: 7,
        priority: 'Medium',
      },
      {
        title: 'Send thank-you note and referral request',
        description: 'Mail or email a personal thank-you and introduce the referral program.',
        dayOffset: 14,
        priority: 'Low',
      },
    ],
  },
  {
    id: 'policy-renewal-followup',
    name: 'Policy Renewal Follow-up',
    description: 'Structured sequence for managing policy renewals from 90 days out through binding.',
    category: 'renewal',
    icon: 'RefreshCw',
    color: 'bg-emerald-100 text-emerald-700',
    tasks: [
      {
        title: '90-day review: Pull expiring policy details',
        description: 'Retrieve current policy, claims history, and premium details for renewal review.',
        dayOffset: 0,
        priority: 'Medium',
      },
      {
        title: 'Check for rate changes and new carrier options',
        description: 'Research current market rates and any new carrier appetites for this risk.',
        dayOffset: 1,
        priority: 'Medium',
      },
      {
        title: '60-day outreach: Contact client about renewal',
        description: 'Call or email client to discuss upcoming renewal and any coverage change needs.',
        dayOffset: 30,
        priority: 'High',
      },
      {
        title: 'Gather updated information for re-quoting',
        description: 'Collect any changes: new vehicles, property updates, claims, life changes.',
        dayOffset: 31,
        priority: 'Medium',
      },
      {
        title: 'Submit renewal applications to carriers',
        description: 'Send renewal applications to current and alternative carriers for quoting.',
        dayOffset: 35,
        priority: 'High',
      },
      {
        title: 'Compare renewal quotes and prepare options',
        description: 'Build side-by-side comparison of renewal options with premium and coverage differences.',
        dayOffset: 50,
        priority: 'High',
      },
      {
        title: '30-day reminder: Present renewal options to client',
        description: 'Review the options with the client and get their decision on the renewal path.',
        dayOffset: 60,
        priority: 'High',
      },
      {
        title: 'Process client\'s renewal selection',
        description: 'Submit binding instructions to the chosen carrier and process payment.',
        dayOffset: 65,
        priority: 'Urgent',
      },
      {
        title: '7-day check: Confirm new policy documents received',
        description: 'Verify all new policy documents, ID cards, and certificates are received and correct.',
        dayOffset: 83,
        priority: 'High',
      },
      {
        title: 'Deliver renewal documents to client',
        description: 'Send new policy documents, ID cards, and updated coverage summary to client.',
        dayOffset: 85,
        priority: 'Medium',
      },
      {
        title: 'Update system records with renewed policy details',
        description: 'Update all policy records, premiums, and expiration dates in the management system.',
        dayOffset: 87,
        priority: 'Medium',
      },
    ],
  },
  {
    id: 'quote-followup-cadence',
    name: 'Quote Follow-up Cadence',
    description: 'Timed follow-up sequence at 3, 7, and 14 days to maximize quote close rates.',
    category: 'quote',
    icon: 'Send',
    color: 'bg-amber-100 text-amber-700',
    tasks: [
      {
        title: 'Day 1: Send quote summary email',
        description: 'Email the prospect a clean summary of the quote with coverage highlights and premium breakdown.',
        dayOffset: 0,
        priority: 'High',
      },
      {
        title: 'Day 3: First follow-up call',
        description: 'Call to confirm they received the quote, answer initial questions, and gauge interest level.',
        dayOffset: 3,
        priority: 'High',
      },
      {
        title: 'Day 3: Send comparison chart if applicable',
        description: 'If they mentioned competing quotes, send a side-by-side comparison highlighting your value.',
        dayOffset: 3,
        priority: 'Medium',
      },
      {
        title: 'Day 7: Second follow-up - address objections',
        description: 'Call or email to address any concerns. Offer to adjust coverage or explore other carrier options.',
        dayOffset: 7,
        priority: 'High',
      },
      {
        title: 'Day 7: Share testimonial or case study',
        description: 'Send a relevant client success story or review that addresses their likely concerns.',
        dayOffset: 7,
        priority: 'Low',
      },
      {
        title: 'Day 10: Check-in text or email',
        description: 'Brief, friendly check-in asking if they have any remaining questions about the quote.',
        dayOffset: 10,
        priority: 'Medium',
      },
      {
        title: 'Day 14: Final follow-up with urgency',
        description: 'Last outreach noting that quote rates may change and offering to lock in the current pricing.',
        dayOffset: 14,
        priority: 'High',
      },
      {
        title: 'Day 14: Update deal status based on outcome',
        description: 'Mark the deal as Won or Lost in the CRM. If lost, note the reason for future reference.',
        dayOffset: 14,
        priority: 'Medium',
      },
    ],
  },
];

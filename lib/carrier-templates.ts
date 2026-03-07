export interface CarrierTemplate {
  carrier: string;
  policyTypes: string[];
  defaultCommissionRates: Record<string, number>;
  coverageTypes: Record<string, string[]>;
  defaultPaymentFrequency: string;
  policyNumberPrefix: string;
  policyNumberFormat: string;
  policyNumberPlaceholder: string;
}

export const CARRIER_TEMPLATES: CarrierTemplate[] = [
  {
    carrier: 'State Farm',
    policyTypes: ['Auto', 'Home', 'Renters', 'Life', 'Umbrella'],
    defaultCommissionRates: { Auto: 10, Home: 15, Renters: 15, Life: 50, Umbrella: 15, Business: 10 },
    coverageTypes: {
      Auto: ['Full Coverage', 'Liability Only', 'Comprehensive', 'Collision'],
      Home: ['HO-3 (Standard)', 'HO-5 (Premium)', 'HO-6 (Condo)', 'HO-8 (Older Home)'],
      Renters: ['HO-4 (Standard)', 'HO-4 (Enhanced)'],
      Life: ['Term 10', 'Term 20', 'Term 30', 'Whole Life', 'Universal Life'],
      Umbrella: ['Standard $1M', 'Standard $2M', 'Standard $5M'],
      Business: ['BOP', 'General Liability', 'Commercial Auto'],
    },
    defaultPaymentFrequency: 'Monthly',
    policyNumberPrefix: 'SF-',
    policyNumberFormat: 'XX-XXXX-XXX',
    policyNumberPlaceholder: 'SF-1234-567',
  },
  {
    carrier: 'Allstate',
    policyTypes: ['Auto', 'Home', 'Renters', 'Life', 'Umbrella', 'Business'],
    defaultCommissionRates: { Auto: 10, Home: 15, Renters: 12, Life: 45, Umbrella: 12, Business: 10 },
    coverageTypes: {
      Auto: ['Full Coverage', 'Liability Only', 'Comprehensive', 'Basic'],
      Home: ['Standard', 'House & Home', 'Condo', 'Manufactured Home'],
      Renters: ['Standard', 'Enhanced'],
      Life: ['Term Life', 'Whole Life', 'Universal Life'],
      Umbrella: ['Personal Umbrella $1M', 'Personal Umbrella $2M'],
      Business: ['BOP', 'General Liability', 'Workers Comp'],
    },
    defaultPaymentFrequency: 'Monthly',
    policyNumberPrefix: 'AL-',
    policyNumberFormat: 'XXXXXXXXX',
    policyNumberPlaceholder: 'AL-123456789',
  },
  {
    carrier: 'Progressive',
    policyTypes: ['Auto', 'Home', 'Renters', 'Umbrella', 'Business'],
    defaultCommissionRates: { Auto: 11, Home: 14, Renters: 13, Umbrella: 12, Business: 10, Life: 0 },
    coverageTypes: {
      Auto: ['Full Coverage', 'Liability Only', 'State Minimum', 'Comprehensive'],
      Home: ['Standard', 'Premium', 'Condo'],
      Renters: ['Standard', 'Plus'],
      Umbrella: ['Personal Umbrella $1M', 'Personal Umbrella $2M', 'Personal Umbrella $5M'],
      Business: ['BOP', 'Commercial Auto', 'General Liability'],
    },
    defaultPaymentFrequency: 'Monthly',
    policyNumberPrefix: 'PRG-',
    policyNumberFormat: 'XXXXXXXX',
    policyNumberPlaceholder: 'PRG-12345678',
  },
  {
    carrier: 'GEICO',
    policyTypes: ['Auto', 'Home', 'Renters', 'Umbrella'],
    defaultCommissionRates: { Auto: 8, Home: 12, Renters: 12, Umbrella: 10, Business: 0, Life: 0 },
    coverageTypes: {
      Auto: ['Full Coverage', 'Liability Only', 'Comprehensive', 'State Minimum'],
      Home: ['Standard', 'Condo', 'Manufactured'],
      Renters: ['Standard', 'Enhanced'],
      Umbrella: ['Personal Umbrella $1M', 'Personal Umbrella $2M'],
    },
    defaultPaymentFrequency: 'Monthly',
    policyNumberPrefix: 'GK-',
    policyNumberFormat: 'XXXX-XX-XXXX',
    policyNumberPlaceholder: 'GK-1234-56-7890',
  },
  {
    carrier: 'Liberty Mutual',
    policyTypes: ['Auto', 'Home', 'Renters', 'Life', 'Umbrella', 'Business'],
    defaultCommissionRates: { Auto: 12, Home: 15, Renters: 14, Life: 50, Umbrella: 14, Business: 12 },
    coverageTypes: {
      Auto: ['Full Coverage', 'Liability Only', 'Comprehensive', 'Right Track'],
      Home: ['Standard', 'Premium', 'Condo', 'Manufactured Home'],
      Renters: ['Basic', 'Standard', 'Enhanced'],
      Life: ['Term 10', 'Term 20', 'Term 30', 'Whole Life'],
      Umbrella: ['Personal $1M', 'Personal $2M', 'Personal $5M'],
      Business: ['BOP', 'General Liability', 'Commercial Property'],
    },
    defaultPaymentFrequency: 'Monthly',
    policyNumberPrefix: 'LM-',
    policyNumberFormat: 'XXXXX-XXXXXX',
    policyNumberPlaceholder: 'LM-12345-678901',
  },
  {
    carrier: 'Farmers',
    policyTypes: ['Auto', 'Home', 'Renters', 'Life', 'Umbrella', 'Business'],
    defaultCommissionRates: { Auto: 12, Home: 16, Renters: 15, Life: 55, Umbrella: 14, Business: 12 },
    coverageTypes: {
      Auto: ['Full Coverage', 'Liability Only', 'Signal', 'Comprehensive'],
      Home: ['Standard', 'Enhanced', 'Condo', 'Manufactured'],
      Renters: ['Standard', 'Enhanced'],
      Life: ['Term', 'Whole Life', 'Universal', 'Variable Universal'],
      Umbrella: ['Personal Umbrella $1M', 'Personal Umbrella $2M'],
      Business: ['BOP', 'General Liability', 'Workers Comp', 'Commercial Auto'],
    },
    defaultPaymentFrequency: 'Monthly',
    policyNumberPrefix: 'FI-',
    policyNumberFormat: 'XXXXXX-XX-XX',
    policyNumberPlaceholder: 'FI-123456-78-90',
  },
  {
    carrier: 'Nationwide',
    policyTypes: ['Auto', 'Home', 'Renters', 'Life', 'Umbrella', 'Business'],
    defaultCommissionRates: { Auto: 11, Home: 15, Renters: 13, Life: 50, Umbrella: 13, Business: 11 },
    coverageTypes: {
      Auto: ['Full Coverage', 'Liability Only', 'SmartRide', 'Comprehensive'],
      Home: ['Standard', 'Brand New Belongings', 'Condo'],
      Renters: ['Standard', 'Enhanced'],
      Life: ['Term', 'Whole Life', 'Universal Life'],
      Umbrella: ['Personal $1M', 'Personal $2M', 'Personal $3M'],
      Business: ['BOP', 'General Liability', 'Commercial Property'],
    },
    defaultPaymentFrequency: 'Monthly',
    policyNumberPrefix: 'NW-',
    policyNumberFormat: 'XXXX XX XXXX',
    policyNumberPlaceholder: 'NW-1234 56 7890',
  },
  {
    carrier: 'Travelers',
    policyTypes: ['Auto', 'Home', 'Renters', 'Umbrella', 'Business'],
    defaultCommissionRates: { Auto: 12, Home: 16, Renters: 14, Umbrella: 14, Business: 12, Life: 0 },
    coverageTypes: {
      Auto: ['Full Coverage', 'Liability Only', 'IntelliDrive', 'Comprehensive'],
      Home: ['Standard', 'Premier', 'Condo', 'Landlord'],
      Renters: ['Standard', 'Premier'],
      Umbrella: ['Personal $1M', 'Personal $2M', 'Personal $5M'],
      Business: ['BOP', 'General Liability', 'Commercial Auto', 'Workers Comp'],
    },
    defaultPaymentFrequency: 'Monthly',
    policyNumberPrefix: 'TR-',
    policyNumberFormat: 'XXXXXXXXXX',
    policyNumberPlaceholder: 'TR-1234567890',
  },
  {
    carrier: 'USAA',
    policyTypes: ['Auto', 'Home', 'Renters', 'Life', 'Umbrella'],
    defaultCommissionRates: { Auto: 7, Home: 10, Renters: 10, Life: 40, Umbrella: 10, Business: 0 },
    coverageTypes: {
      Auto: ['Full Coverage', 'Liability Only', 'SafePilot', 'Comprehensive'],
      Home: ['Standard', 'Condo', 'Manufactured Home'],
      Renters: ['Standard', 'Enhanced'],
      Life: ['Term', 'Whole Life', 'Universal Life'],
      Umbrella: ['Personal $1M', 'Personal $2M', 'Personal $5M'],
    },
    defaultPaymentFrequency: 'Monthly',
    policyNumberPrefix: 'US-',
    policyNumberFormat: 'XXXXX-XXXX',
    policyNumberPlaceholder: 'US-12345-6789',
  },
  {
    carrier: 'Hartford',
    policyTypes: ['Auto', 'Home', 'Renters', 'Umbrella', 'Business'],
    defaultCommissionRates: { Auto: 13, Home: 16, Renters: 14, Umbrella: 14, Business: 13, Life: 0 },
    coverageTypes: {
      Auto: ['Full Coverage', 'Liability Only', 'Comprehensive'],
      Home: ['Standard', 'Premium', 'Condo'],
      Renters: ['Standard'],
      Umbrella: ['Personal $1M', 'Personal $2M'],
      Business: ['BOP', 'General Liability', 'Workers Comp', 'Professional Liability'],
    },
    defaultPaymentFrequency: 'Monthly',
    policyNumberPrefix: 'HF-',
    policyNumberFormat: 'XX XXXXX XXXX',
    policyNumberPlaceholder: 'HF-12 34567 8901',
  },
  {
    carrier: 'Mercury',
    policyTypes: ['Auto', 'Home', 'Renters', 'Umbrella', 'Business'],
    defaultCommissionRates: { Auto: 12, Home: 15, Renters: 13, Umbrella: 12, Business: 10, Life: 0 },
    coverageTypes: {
      Auto: ['Full Coverage', 'Liability Only', 'Comprehensive'],
      Home: ['Standard', 'Premium', 'Condo'],
      Renters: ['Standard'],
      Umbrella: ['Personal $1M', 'Personal $2M'],
      Business: ['BOP', 'General Liability'],
    },
    defaultPaymentFrequency: 'Monthly',
    policyNumberPrefix: 'MR-',
    policyNumberFormat: 'XXXXXX',
    policyNumberPlaceholder: 'MR-123456',
  },
  {
    carrier: 'Kemper',
    policyTypes: ['Auto', 'Home', 'Renters'],
    defaultCommissionRates: { Auto: 14, Home: 15, Renters: 14, Umbrella: 0, Business: 0, Life: 0 },
    coverageTypes: {
      Auto: ['Full Coverage', 'Liability Only', 'Non-Standard'],
      Home: ['Standard', 'Condo'],
      Renters: ['Standard'],
    },
    defaultPaymentFrequency: 'Monthly',
    policyNumberPrefix: 'KP-',
    policyNumberFormat: 'XXXXXXXX',
    policyNumberPlaceholder: 'KP-12345678',
  },
  {
    carrier: 'Bristol West',
    policyTypes: ['Auto'],
    defaultCommissionRates: { Auto: 12, Home: 0, Renters: 0, Umbrella: 0, Business: 0, Life: 0 },
    coverageTypes: {
      Auto: ['Full Coverage', 'Liability Only', 'Non-Standard', 'State Minimum'],
    },
    defaultPaymentFrequency: 'Monthly',
    policyNumberPrefix: 'BW-',
    policyNumberFormat: 'XXXXXXX',
    policyNumberPlaceholder: 'BW-1234567',
  },
  {
    carrier: 'National General',
    policyTypes: ['Auto', 'Home', 'Renters'],
    defaultCommissionRates: { Auto: 13, Home: 14, Renters: 13, Umbrella: 0, Business: 0, Life: 0 },
    coverageTypes: {
      Auto: ['Full Coverage', 'Liability Only', 'Non-Standard', 'Comprehensive'],
      Home: ['Standard', 'Condo'],
      Renters: ['Standard'],
    },
    defaultPaymentFrequency: 'Monthly',
    policyNumberPrefix: 'NG-',
    policyNumberFormat: 'XXXXXXXX',
    policyNumberPlaceholder: 'NG-12345678',
  },
  {
    carrier: 'Safeco',
    policyTypes: ['Auto', 'Home', 'Renters', 'Umbrella'],
    defaultCommissionRates: { Auto: 12, Home: 15, Renters: 14, Umbrella: 13, Business: 0, Life: 0 },
    coverageTypes: {
      Auto: ['Full Coverage', 'Liability Only', 'RightTrack', 'Comprehensive'],
      Home: ['Standard', 'Premium', 'Condo'],
      Renters: ['Standard', 'Enhanced'],
      Umbrella: ['Personal $1M', 'Personal $2M'],
    },
    defaultPaymentFrequency: 'Monthly',
    policyNumberPrefix: 'SC-',
    policyNumberFormat: 'XXXXXXX',
    policyNumberPlaceholder: 'SC-1234567',
  },
  {
    carrier: 'Foremost',
    policyTypes: ['Auto', 'Home', 'Renters'],
    defaultCommissionRates: { Auto: 11, Home: 14, Renters: 13, Umbrella: 0, Business: 0, Life: 0 },
    coverageTypes: {
      Auto: ['Full Coverage', 'Liability Only'],
      Home: ['Standard', 'Manufactured Home', 'Seasonal/Vacation'],
      Renters: ['Standard'],
    },
    defaultPaymentFrequency: 'Monthly',
    policyNumberPrefix: 'FM-',
    policyNumberFormat: 'XXXXXXX',
    policyNumberPlaceholder: 'FM-1234567',
  },
  {
    carrier: 'Dairyland',
    policyTypes: ['Auto'],
    defaultCommissionRates: { Auto: 12, Home: 0, Renters: 0, Umbrella: 0, Business: 0, Life: 0 },
    coverageTypes: {
      Auto: ['Full Coverage', 'Liability Only', 'Non-Standard', 'SR-22'],
    },
    defaultPaymentFrequency: 'Monthly',
    policyNumberPrefix: 'DL-',
    policyNumberFormat: 'XXXXXXX',
    policyNumberPlaceholder: 'DL-1234567',
  },
  {
    carrier: 'AAA',
    policyTypes: ['Auto', 'Home', 'Renters', 'Life', 'Umbrella'],
    defaultCommissionRates: { Auto: 10, Home: 14, Renters: 12, Life: 45, Umbrella: 12, Business: 0 },
    coverageTypes: {
      Auto: ['Full Coverage', 'Liability Only', 'Comprehensive'],
      Home: ['Standard', 'Premium', 'Condo'],
      Renters: ['Standard'],
      Life: ['Term', 'Whole Life'],
      Umbrella: ['Personal $1M', 'Personal $2M'],
    },
    defaultPaymentFrequency: 'Monthly',
    policyNumberPrefix: 'AAA-',
    policyNumberFormat: 'XXXX XXXXXX',
    policyNumberPlaceholder: 'AAA-1234 567890',
  },
];

export const POLICY_TYPE_PRESETS: Record<string, {
  label: string;
  description: string;
  defaultCoverageType: string;
  typicalPremiumRange: [number, number];
  typicalCommission: number;
  defaultPaymentFrequency: string;
  suggestedTermMonths: number;
}> = {
  Auto: {
    label: 'Auto Insurance',
    description: 'Vehicle liability, collision, and comprehensive coverage',
    defaultCoverageType: 'Full Coverage',
    typicalPremiumRange: [800, 3000],
    typicalCommission: 10,
    defaultPaymentFrequency: 'Monthly',
    suggestedTermMonths: 6,
  },
  Home: {
    label: 'Homeowners Insurance',
    description: 'Dwelling, personal property, and liability coverage',
    defaultCoverageType: 'HO-3 (Standard)',
    typicalPremiumRange: [1200, 5000],
    typicalCommission: 15,
    defaultPaymentFrequency: 'Annual',
    suggestedTermMonths: 12,
  },
  Renters: {
    label: 'Renters Insurance',
    description: 'Personal property and liability for tenants',
    defaultCoverageType: 'Standard',
    typicalPremiumRange: [150, 500],
    typicalCommission: 13,
    defaultPaymentFrequency: 'Monthly',
    suggestedTermMonths: 12,
  },
  Business: {
    label: 'Business Insurance',
    description: 'Commercial property, liability, and operations coverage',
    defaultCoverageType: 'BOP',
    typicalPremiumRange: [500, 10000],
    typicalCommission: 12,
    defaultPaymentFrequency: 'Annual',
    suggestedTermMonths: 12,
  },
  Life: {
    label: 'Life Insurance',
    description: 'Term or permanent life coverage for beneficiary protection',
    defaultCoverageType: 'Term 20',
    typicalPremiumRange: [300, 3000],
    typicalCommission: 50,
    defaultPaymentFrequency: 'Monthly',
    suggestedTermMonths: 12,
  },
  Umbrella: {
    label: 'Umbrella Insurance',
    description: 'Extended liability beyond auto/home policy limits',
    defaultCoverageType: 'Standard $1M',
    typicalPremiumRange: [150, 500],
    typicalCommission: 13,
    defaultPaymentFrequency: 'Annual',
    suggestedTermMonths: 12,
  },
};

export function getCarrierTemplate(carrier: string): CarrierTemplate | undefined {
  return CARRIER_TEMPLATES.find((t) => t.carrier === carrier);
}

export function getDefaultCommissionRate(carrier: string, policyType: string): number {
  const template = getCarrierTemplate(carrier);
  if (template) return template.defaultCommissionRates[policyType] || 0;
  const preset = POLICY_TYPE_PRESETS[policyType];
  return preset?.typicalCommission || 0;
}

export function getCoverageTypes(carrier: string, policyType: string): string[] {
  const template = getCarrierTemplate(carrier);
  if (template?.coverageTypes[policyType]) return template.coverageTypes[policyType];
  const preset = POLICY_TYPE_PRESETS[policyType];
  return preset ? [preset.defaultCoverageType] : [];
}

export function getPolicyNumberPrefix(carrier: string): string {
  const template = getCarrierTemplate(carrier);
  return template?.policyNumberPrefix || '';
}

export function computeExpirationDate(effectiveDate: string, termMonths: number): string {
  const date = new Date(effectiveDate + 'T00:00:00');
  date.setMonth(date.getMonth() + termMonths);
  return date.toISOString().split('T')[0];
}

export function getPolicyNumberFormatHint(carrier: string): { format: string; placeholder: string } | null {
  const template = getCarrierTemplate(carrier);
  if (!template) return null;
  return { format: template.policyNumberFormat, placeholder: template.policyNumberPlaceholder };
}

export interface QuickFillPreset {
  id: string;
  label: string;
  shortLabel: string;
  policyType: string;
  coverageType: string;
  paymentFrequency: string;
  termMonths: number;
  typicalPremium: number;
  description: string;
}

export const QUICK_FILL_PRESETS: QuickFillPreset[] = [
  {
    id: 'auto-full',
    label: 'Auto - Full Coverage',
    shortLabel: 'Full Coverage',
    policyType: 'Auto',
    coverageType: 'Full Coverage',
    paymentFrequency: 'Monthly',
    termMonths: 6,
    typicalPremium: 1800,
    description: 'Liability + Collision + Comprehensive with standard deductibles',
  },
  {
    id: 'auto-liability',
    label: 'Auto - Liability Only',
    shortLabel: 'Liability Only',
    policyType: 'Auto',
    coverageType: 'Liability Only',
    paymentFrequency: 'Monthly',
    termMonths: 6,
    typicalPremium: 900,
    description: 'State minimum liability coverage, no collision or comprehensive',
  },
  {
    id: 'home-ho3',
    label: 'Home - HO-3 Standard',
    shortLabel: 'HO-3',
    policyType: 'Home',
    coverageType: 'HO-3 (Standard)',
    paymentFrequency: 'Annual',
    termMonths: 12,
    typicalPremium: 2400,
    description: 'Open-peril dwelling, named-peril personal property, standard homeowner',
  },
  {
    id: 'home-ho5',
    label: 'Home - HO-5 Premium',
    shortLabel: 'HO-5',
    policyType: 'Home',
    coverageType: 'HO-5 (Premium)',
    paymentFrequency: 'Annual',
    termMonths: 12,
    typicalPremium: 3200,
    description: 'Open-peril dwelling and personal property, highest coverage level',
  },
  {
    id: 'home-ho6',
    label: 'Home - HO-6 Condo',
    shortLabel: 'HO-6',
    policyType: 'Home',
    coverageType: 'HO-6 (Condo)',
    paymentFrequency: 'Annual',
    termMonths: 12,
    typicalPremium: 800,
    description: 'Interior walls-in coverage for condo owners with personal property',
  },
  {
    id: 'renters-standard',
    label: 'Renters - Standard',
    shortLabel: 'Standard',
    policyType: 'Renters',
    coverageType: 'HO-4 (Standard)',
    paymentFrequency: 'Monthly',
    termMonths: 12,
    typicalPremium: 250,
    description: 'Personal property and liability coverage for apartment renters',
  },
  {
    id: 'business-bop',
    label: 'Business - BOP',
    shortLabel: 'BOP',
    policyType: 'Business',
    coverageType: 'BOP',
    paymentFrequency: 'Annual',
    termMonths: 12,
    typicalPremium: 2500,
    description: 'Business Owner Policy: bundled property + general liability for small business',
  },
  {
    id: 'life-term20',
    label: 'Life - Term 20',
    shortLabel: 'Term 20',
    policyType: 'Life',
    coverageType: 'Term 20',
    paymentFrequency: 'Monthly',
    termMonths: 12,
    typicalPremium: 600,
    description: '20-year level term life with guaranteed rate lock',
  },
  {
    id: 'umbrella-1m',
    label: 'Umbrella - $1M',
    shortLabel: '$1M',
    policyType: 'Umbrella',
    coverageType: 'Standard $1M',
    paymentFrequency: 'Annual',
    termMonths: 12,
    typicalPremium: 300,
    description: '$1M additional liability above auto and home policy limits',
  },
];

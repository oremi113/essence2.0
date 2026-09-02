/**
 * Country list for the onboarding country field.
 *
 * Purpose is a privacy-regime signal, not full internationalization — we need
 * to know if a user is in the US, the UK, or the EU/EEA (which triggers GDPR)
 * vs. elsewhere. The list is practical rather than exhaustive: every EU/EEA
 * member, the UK, Switzerland, and the major English-speaking + large markets
 * are named explicitly so the regime is unambiguous; everyone else picks
 * "Other", which still signals "non-US, review before scaling there".
 *
 * `code` is ISO 3166-1 alpha-2 (or "OTHER"). Default selection is US.
 */
export interface Country {
  code: string;
  name: string;
  /** Coarse privacy regime this country falls under, for downstream signals. */
  regime: 'US' | 'UK' | 'EU' | 'OTHER';
}

export const DEFAULT_COUNTRY = 'US';

export const COUNTRIES: readonly Country[] = [
  { code: 'US', name: 'United States', regime: 'US' },
  { code: 'GB', name: 'United Kingdom', regime: 'UK' },
  { code: 'CA', name: 'Canada', regime: 'OTHER' },
  { code: 'AU', name: 'Australia', regime: 'OTHER' },
  { code: 'NZ', name: 'New Zealand', regime: 'OTHER' },
  { code: 'IE', name: 'Ireland', regime: 'EU' },
  // EU / EEA (GDPR)
  { code: 'AT', name: 'Austria', regime: 'EU' },
  { code: 'BE', name: 'Belgium', regime: 'EU' },
  { code: 'BG', name: 'Bulgaria', regime: 'EU' },
  { code: 'HR', name: 'Croatia', regime: 'EU' },
  { code: 'CY', name: 'Cyprus', regime: 'EU' },
  { code: 'CZ', name: 'Czechia', regime: 'EU' },
  { code: 'DK', name: 'Denmark', regime: 'EU' },
  { code: 'EE', name: 'Estonia', regime: 'EU' },
  { code: 'FI', name: 'Finland', regime: 'EU' },
  { code: 'FR', name: 'France', regime: 'EU' },
  { code: 'DE', name: 'Germany', regime: 'EU' },
  { code: 'GR', name: 'Greece', regime: 'EU' },
  { code: 'HU', name: 'Hungary', regime: 'EU' },
  { code: 'IS', name: 'Iceland', regime: 'EU' },
  { code: 'IT', name: 'Italy', regime: 'EU' },
  { code: 'LV', name: 'Latvia', regime: 'EU' },
  { code: 'LI', name: 'Liechtenstein', regime: 'EU' },
  { code: 'LT', name: 'Lithuania', regime: 'EU' },
  { code: 'LU', name: 'Luxembourg', regime: 'EU' },
  { code: 'MT', name: 'Malta', regime: 'EU' },
  { code: 'NL', name: 'Netherlands', regime: 'EU' },
  { code: 'NO', name: 'Norway', regime: 'EU' },
  { code: 'PL', name: 'Poland', regime: 'EU' },
  { code: 'PT', name: 'Portugal', regime: 'EU' },
  { code: 'RO', name: 'Romania', regime: 'EU' },
  { code: 'SK', name: 'Slovakia', regime: 'EU' },
  { code: 'SI', name: 'Slovenia', regime: 'EU' },
  { code: 'ES', name: 'Spain', regime: 'EU' },
  { code: 'SE', name: 'Sweden', regime: 'EU' },
  { code: 'CH', name: 'Switzerland', regime: 'EU' },
  // Other major markets
  { code: 'BR', name: 'Brazil', regime: 'OTHER' },
  { code: 'IN', name: 'India', regime: 'OTHER' },
  { code: 'JP', name: 'Japan', regime: 'OTHER' },
  { code: 'MX', name: 'Mexico', regime: 'OTHER' },
  { code: 'SG', name: 'Singapore', regime: 'OTHER' },
  { code: 'ZA', name: 'South Africa', regime: 'OTHER' },
  { code: 'AE', name: 'United Arab Emirates', regime: 'OTHER' },
  { code: 'OTHER', name: 'Other', regime: 'OTHER' },
];

/**
 * Age helpers for the 18+ gate.
 *
 * ESSENCE is adults-only (ToS §4, Privacy Policy §11). Onboarding already
 * collects a full date of birth; these turn it into an authoritative check so
 * the "18+" claim is enforced, not just asserted.
 */

/** Minimum age to use ESSENCE. */
export const MINIMUM_AGE = 18;

/**
 * Whole years old as of `asOf` for an ISO `YYYY-MM-DD` date of birth. Returns
 * `null` if the string isn't a valid date. Uses the full date (month + day),
 * so someone who turns 18 later this year still reads as 17 today.
 */
export function ageInYears(
  dateOfBirth: string,
  asOf: Date = new Date(),
): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return null;
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;

  let age = asOf.getFullYear() - dob.getFullYear();
  const monthsDiff = asOf.getMonth() - dob.getMonth();
  if (monthsDiff < 0 || (monthsDiff === 0 && asOf.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

/** True when the DOB is a valid date and the person is at least MINIMUM_AGE. */
export function meetsMinimumAge(
  dateOfBirth: string,
  asOf: Date = new Date(),
): boolean {
  const age = ageInYears(dateOfBirth, asOf);
  return age !== null && age >= MINIMUM_AGE;
}

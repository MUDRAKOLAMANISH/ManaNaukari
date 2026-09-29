/**
 * Utility functions for parsing and filtering job salaries in LPA (Lakhs Per Annum)
 */

export interface ParsedSalary {
  minLakhs: number | null;
  maxLakhs: number | null;
  isUndisclosed: boolean;
  raw: string;
}

export interface SalaryRangeFilter {
  min: number; // in Lakhs (e.g. 0, 3, 6, 10)
  max: number | null; // in Lakhs, or null for 10L+ / unbounded
  label: string;
}

export const SALARY_PRESET_RANGES: SalaryRangeFilter[] = [
  { min: 0, max: null, label: 'All' },
  { min: 0, max: 3, label: '0 - 3 LPA' },
  { min: 3, max: 6, label: '3 - 6 LPA' },
  { min: 6, max: 10, label: '6 - 10 LPA' },
  { min: 10, max: null, label: '10 LPA+' },
];

/**
 * Parses salary strings like:
 * - "₹3.5 - 5.5 LPA"
 * - "3 - 6 LPA"
 * - "₹4.50 - ₹6.50 LPA"
 * - "10L+" or "12 LPA"
 * - "₹25,000/mo" or "30,000 per month"
 * - "₹3,50,000 - ₹5,00,000"
 */
export function parseSalaryToLakhs(rawSalary?: string | null): ParsedSalary {
  if (!rawSalary || typeof rawSalary !== 'string') {
    return { minLakhs: null, maxLakhs: null, isUndisclosed: true, raw: '' };
  }

  const clean = rawSalary.trim().toLowerCase();

  // Check for undisclosed terms
  if (
    clean === '' ||
    clean.includes('best in industry') ||
    clean.includes('not disclosed') ||
    clean.includes('competitive') ||
    clean.includes('as per company') ||
    clean.includes('undisclosed')
  ) {
    return { minLakhs: null, maxLakhs: null, isUndisclosed: true, raw: rawSalary };
  }

  // 1. Check for monthly salary (e.g., "₹25,000/mo", "₹30000/month", "20k/pm")
  const isMonthly = clean.includes('/mo') || clean.includes('/month') || clean.includes('per month') || clean.includes('p.m') || clean.includes('/pm');
  
  // Extract all numbers (including decimals)
  // Clean commas like 25,000 -> 25000
  const normalizedText = clean.replace(/,/g, '');
  const numberMatches = normalizedText.match(/\d+(?:\.\d+)?/g);

  if (!numberMatches || numberMatches.length === 0) {
    return { minLakhs: null, maxLakhs: null, isUndisclosed: true, raw: rawSalary };
  }

  const numbers = numberMatches.map(Number);

  if (isMonthly) {
    // Convert monthly INR to annual Lakhs: (monthly * 12) / 100,000
    const minAnnualLakhs = (numbers[0] * 12) / 100000;
    const maxAnnualLakhs = numbers.length > 1 ? (numbers[1] * 12) / 100000 : minAnnualLakhs;
    return {
      minLakhs: Math.round(minAnnualLakhs * 10) / 10,
      maxLakhs: Math.round(maxAnnualLakhs * 10) / 10,
      isUndisclosed: false,
      raw: rawSalary,
    };
  }

  // 2. Check if numbers are in full Rupees (e.g., 350000 to 500000)
  if (numbers[0] >= 10000) {
    const minAnnualLakhs = numbers[0] / 100000;
    const maxAnnualLakhs = numbers.length > 1 ? numbers[1] / 100000 : minAnnualLakhs;
    return {
      minLakhs: Math.round(minAnnualLakhs * 10) / 10,
      maxLakhs: Math.round(maxAnnualLakhs * 10) / 10,
      isUndisclosed: false,
      raw: rawSalary,
    };
  }

  // 3. Standard Lakhs (e.g. 3.5 - 5.5 LPA, 3 to 6, 10+)
  const minLakhs = numbers[0];
  const maxLakhs = numbers.length > 1 ? numbers[1] : minLakhs;

  return {
    minLakhs: Math.min(minLakhs, maxLakhs),
    maxLakhs: Math.max(minLakhs, maxLakhs),
    isUndisclosed: false,
    raw: rawSalary,
  };
}

/**
 * Checks if a job's salary matches the selected range criteria.
 * @param rawSalary The raw salary string of the job
 * @param minSalary Minimum salary filter in Lakhs (0 = no min)
 * @param maxSalary Maximum salary filter in Lakhs (null = unbounded)
 * @param includeUndisclosed Whether to include jobs with undisclosed salaries
 */
export function jobMatchesSalaryFilter(
  rawSalary: string | null | undefined,
  minSalary: number,
  maxSalary: number | null = null,
  includeUndisclosed: boolean = true
): boolean {
  // If no salary filter is applied (0 to infinity/null), show all
  if (minSalary === 0 && (maxSalary === null || maxSalary >= 15)) {
    return true;
  }

  const parsed = parseSalaryToLakhs(rawSalary);

  if (parsed.isUndisclosed) {
    return includeUndisclosed;
  }

  const jobMin = parsed.minLakhs ?? 0;
  const jobMax = parsed.maxLakhs ?? jobMin;

  // Case A: Unbounded max (e.g. 10L+ or minSlider >= 6L)
  if (maxSalary === null) {
    return jobMax >= minSalary;
  }

  // Case B: Range bracket [minSalary, maxSalary] (e.g., 3 - 6 LPA)
  // Overlap condition: job salary range overlaps with filter range
  return jobMax >= minSalary && jobMin <= maxSalary;
}

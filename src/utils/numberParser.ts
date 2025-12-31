/**
 * Parse a number that may use either comma or period as decimal separator
 * Handles common i18n number formats like "0,85" (German) or "0.85" (English)
 *
 * @param value - String or number to parse
 * @returns Parsed number or NaN if invalid
 */
export function parseNumber(value: unknown): number {
  // Already a number
  if (typeof value === 'number') {
    return value
  }

  // Not a string, can't parse
  if (typeof value !== 'string') {
    return NaN
  }

  // Trim whitespace
  const trimmed = value.trim()

  // Empty string
  if (trimmed === '') {
    return NaN
  }

  // Replace comma with period for parsing
  // This handles German/European format: "1,23" → "1.23"
  const normalized = trimmed.replace(',', '.')

  // Parse the normalized string
  const parsed = parseFloat(normalized)

  return parsed
}

/**
 * Parse numbers in an array of values
 * Useful for batch parsing Excel/CSV data
 *
 * @param values - Array of values to parse
 * @returns Array of parsed numbers
 */
export function parseNumbers(values: unknown[]): number[] {
  return values.map(parseNumber)
}

/**
 * Check if a value represents a valid number (after parsing)
 *
 * @param value - Value to check
 * @returns True if value can be parsed as a valid number
 */
export function isValidNumber(value: unknown): boolean {
  const parsed = parseNumber(value)
  return !isNaN(parsed) && isFinite(parsed)
}

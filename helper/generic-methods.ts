/**
 * GenericMethods - TypeScript utility functions for API automation.
 *
 * Provides common operations like:
 * - String type detection (JSON, XML, Text)
 * - Random string/number generation
 * - Date/time utilities with timezone support
 * - Working day calculations
 *
 * @author Shadab Anwar
 */

// ─────────────────────────────────────────────────────────────────────────────
// String Type Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks whether a string is JSON (starts with { or [).
 * @param input - String to check
 * @returns true if input appears to be JSON
 */
export function isStringJson(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

/**
 * Checks whether a string is XML (starts with <).
 * @param input - String to check
 * @returns true if input appears to be XML
 */
export function isStringXml(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.startsWith("<");
}

/**
 * Checks whether a string is plain text (not JSON or XML).
 * @param input - String to check
 * @returns true if input is plain text
 */
export function isStringText(input: string): boolean {
  return !isStringJson(input) && !isStringXml(input);
}

// ─────────────────────────────────────────────────────────────────────────────
// Random String Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a random alphanumeric string of specified length.
 * @param length - Length of the string
 * @returns Random string (e.g. "aB3xY9zK")
 */
export function generateRandomString(length: number = 10): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates a random alphabetic-only string.
 * @param length - Length of the string
 * @returns Random alphabetic string (e.g. "aBxYzK")
 */
export function generateRandomChars(length: number = 10): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates a random numeric string of specified length.
 * @param length - Length of the string
 * @returns Random numeric string (e.g. "1234567890")
 */
export function generateRandomNumber(length: number = 6): string {
  const chars = "0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates a random number with exact digit count (first digit non-zero).
 * @param length - Exact number of digits
 * @returns Random number string (e.g. for length=5: "12345")
 */
export function generateRandomNumberWithLength(length: number): string {
  if (length <= 0) return "0";

  // First digit: 1-9
  let result = String(Math.floor(Math.random() * 9) + 1);

  // Remaining digits: 0-9
  for (let i = 1; i < length; i++) {
    result += Math.floor(Math.random() * 10);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Date/Time Utilities
// ─────────────────────────────────────────────────────────────────────────────

export type DateOffsetUnit = "days" | "hours" | "minutes" | "seconds";

/**
 * Payment date situation options for batch file generation.
 * - "present": Today
 * - "past": 2 days ago
 * - "past-week": 7 days ago
 * - "future": 3 days from now
 * - "future-week": 7 days from now
 * - "next-working-day": Next weekday (skips Sat/Sun)
 */
export type PaymentDateSituation = "present" | "past" | "future" | "next-working-day" | "past-week" | "future-week";

/**
 * Adds offset to current date and returns ISO datetime string.
 *
 * @param offset - Number of units to add (negative for past)
 * @param unit - Unit of offset (default: "days")
 * @returns ISO datetime string (e.g. "2026-07-20T10:30:00.000Z")
 *
 * @example
 * getFutureDateTime(5, "days")      // 5 days from now
 * getFutureDateTime(-2, "days")     // 2 days ago
 * getFutureDateTime(2, "hours")     // 2 hours from now
 * getFutureDateTime(30, "minutes")  // 30 minutes from now
 */
export function getFutureDateTime(
  offset: number = 0,
  unit: DateOffsetUnit = "days"
): string {
  const date = new Date();

  switch (unit) {
    case "days":
      date.setDate(date.getDate() + offset);
      break;
    case "hours":
      date.setHours(date.getHours() + offset);
      break;
    case "minutes":
      date.setMinutes(date.getMinutes() + offset);
      break;
    case "seconds":
      date.setSeconds(date.getSeconds() + offset);
      break;
  }

  return date.toISOString().slice(0, 19);
}

/**
 * Returns a future creation datetime (5 minutes ahead) in ISO format.
 * Used for CreDtTm in batch payment files.
 *
 * @param minutesAhead - Minutes into the future (default: 5)
 * @returns ISO datetime string
 */
export function getCreationDateTime(minutesAhead: number = 5): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutesAhead);
  return date.toISOString().slice(0, 19);
}

/**
 * Payment date logic based on situation.
 *
 * @param situation - When the payment should occur
 * @returns Date string in YYYY-MM-DD format
 *
 * @example
 * getPaymentDate("present")   // Today
 * getPaymentDate("past")      // 2 days ago
 * getPaymentDate("future")    // 3 days from now
 * getPaymentDate("next-working-day")  // Next weekday
 * getPaymentDate("past-week") // 7 days ago
 */
export function getPaymentDate(
  situation: PaymentDateSituation = "present"
): string {
  const date = new Date();

  switch (situation) {
    case "past":
      date.setDate(date.getDate() - 2);
      break;
    case "past-week":
      date.setDate(date.getDate() - 7);
      break;
    case "present":
      // Keep today
      break;
    case "future":
      date.setDate(date.getDate() + 3);
      return getNextWorkingDay(date).toISOString().slice(0, 10);
    case "future-week":
      date.setDate(date.getDate() + 7);
      return getNextWorkingDay(date).toISOString().slice(0, 10);
    case "next-working-day":
      date.setDate(date.getDate() + 1);
      return getNextWorkingDay(date).toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

/**
 * Gets the next working day (skips weekends).
 * @param date - Starting date
 * @returns Next weekday (Mon-Fri)
 */
export function getNextWorkingDay(date: Date = new Date()): Date {
  const result = new Date(date);

  // If Saturday, add 2 days; if Sunday, add 1 day
  while (result.getDay() === 0 || result.getDay() === 6) {
    result.setDate(result.getDate() + 1);
  }

  return result;
}

/**
 * Checks if a date is a working day (Mon-Fri).
 * @param date - Date to check
 * @returns true if weekday
 */
export function isWorkingDay(date: Date): boolean {
  return date.getDay() !== 0 && date.getDay() !== 6;
}

/**
 * Formats date to specified format.
 * @param date - Date object
 * @param format - Output format
 * @returns Formatted date string
 */
export function formatDate(date: Date, format: string = "YYYY-MM-DD"): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return format
    .replace("YYYY", String(year))
    .replace("MM", month)
    .replace("DD", day)
    .replace("HH", hours)
    .replace("mm", minutes)
    .replace("ss", seconds);
}

/**
 * Gets timestamp for file naming (e.g. "20260714-153045").
 * @returns Timestamp string
 */
export function getFileTimestamp(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data Transformation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts ISO date to DD/MM/YYYY format.
 * @param isoDate - ISO date string (YYYY-MM-DD)
 * @returns Formatted date (DD/MM/YYYY)
 */
export function isoToDdMmYyyy(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Converts DD/MM/YYYY to ISO format.
 * @param dateStr - Date string (DD/MM/YYYY)
 * @returns ISO date (YYYY-MM-DD)
 */
export function ddMmYyyyToIso(dateStr: string): string {
  const [day, month, year] = dateStr.split("/");
  return `${year}-${month}-${day}`;
}

/**
 * Adds days to a date string and returns ISO format.
 * @param dateString - Starting date (YYYY-MM-DD)
 * @param days - Days to add (negative for subtract)
 * @returns New date string
 */
export function addDaysToDate(dateString: string, days: number): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

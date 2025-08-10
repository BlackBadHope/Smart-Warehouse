/**
 * Utility functions for text processing, especially for mobile and international input
 */

/**
 * Safely cleans input text, handling international characters, mobile keyboard quirks, and invisible characters
 */
export const cleanTextInput = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove all types of whitespace from start/end, including:
  // - Regular spaces (\x20)
  // - Non-breaking spaces (\u00A0, \u202F, \u2009, etc.)
  // - Zero-width spaces (\u200B, \u200C, \u200D, \uFEFF)
  // - Other Unicode whitespace characters
  let cleaned = input
    .replace(/^[\s\u00A0\u1680\u2000-\u200B\u2028\u2029\u202F\u205F\u3000\uFEFF]+/g, '') // Start whitespace
    .replace(/[\s\u00A0\u1680\u2000-\u200B\u2028\u2029\u202F\u205F\u3000\uFEFF]+$/g, '') // End whitespace
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, ''); // Remove zero-width characters anywhere

  // Normalize Unicode characters (NFC normalization)
  if (cleaned.normalize) {
    cleaned = cleaned.normalize('NFC');
  }

  // Replace any remaining non-breaking spaces with regular spaces
  cleaned = cleaned.replace(/\u00A0/g, ' ');

  return cleaned;
};

/**
 * Checks if a string is effectively empty after cleaning
 */
export const isEmptyText = (input: string): boolean => {
  const cleaned = cleanTextInput(input);
  return cleaned.length === 0;
};

/**
 * Gets character information for debugging
 */
export const getCharInfo = (text: string): Array<{char: string, code: number, isVisible: boolean}> => {
  if (!text) return [];
  
  return Array.from(text).map(char => ({
    char: char,
    code: char.charCodeAt(0),
    isVisible: char.trim().length > 0 && !/[\u200B-\u200D\uFEFF\u00A0]/.test(char)
  }));
};
/**
 * Utility functions for text processing, especially for mobile and international input
 */

/**
 * Safely cleans input text, handling international characters, mobile keyboard quirks, and invisible characters
 * FIXED: More conservative cleaning to preserve Cyrillic and other international characters
 */
export const cleanTextInput = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // MINIMAL cleaning - only remove truly invisible characters at start/end
  // Preserve ALL visible characters including Cyrillic, emojis, etc.
  let cleaned = input
    .replace(/^[\uFEFF\u200B\u200C\u200D]+/g, '') // Remove only zero-width chars at start
    .replace(/[\uFEFF\u200B\u200C\u200D]+$/g, '') // Remove only zero-width chars at end
    .replace(/[\uFEFF\u200B\u200C\u200D]/g, ''); // Remove zero-width chars anywhere

  // Light trim of regular whitespace only
  cleaned = cleaned.trim();

  // Normalize Unicode (helps with composite characters)
  if (cleaned.normalize) {
    cleaned = cleaned.normalize('NFC');
  }

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
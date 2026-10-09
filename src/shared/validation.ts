/**
 * Validation utilities for Back to Basics
 */

export interface ValidationResult {
  isValid: boolean;
  sanitizedUrl?: string;
  errorMessage?: string;
}

/**
 * Validates and sanitizes a study URL.
 * Only http and https protocols are permitted.
 * Strips whitespace and verifies structure.
 */
export function validateAndSanitizeUrl(rawInput: string): ValidationResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      isValid: false,
      errorMessage: 'Please enter a valid website address.',
    };
  }

  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      isValid: false,
      errorMessage: 'Website address cannot be empty.',
    };
  }

  let parsed: URL;
  try {
    // Check if the input already contains a URI scheme (e.g., "ftp:", "http:", "file:")
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
    const withProtocol = hasScheme ? trimmed : `https://${trimmed}`;
    parsed = new URL(withProtocol);
  } catch {
    return {
      isValid: false,
      errorMessage: 'Invalid URL format. Please enter a valid web address.',
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      isValid: false,
      errorMessage: 'Only HTTP and HTTPS web addresses are supported.',
    };
  }

  if (!parsed.hostname || !parsed.hostname.includes('.')) {
    return {
      isValid: false,
      errorMessage: 'Please enter a valid domain name (e.g. example.com).',
    };
  }

  return {
    isValid: true,
    sanitizedUrl: parsed.toString(),
  };
}

/**
 * Validates a duration in minutes.
 */
export function validateDuration(minutes: number, min = 1, max = 360): { isValid: boolean; error?: string } {
  if (isNaN(minutes) || !Number.isFinite(minutes)) {
    return { isValid: false, error: 'Duration must be a number.' };
  }
  if (minutes < min) {
    return { isValid: false, error: `Duration must be at least ${min} minute.` };
  }
  if (minutes > max) {
    return { isValid: false, error: `Duration cannot exceed ${max} minutes.` };
  }
  return { isValid: true };
}

/**
 * Validates Pomodoro session count.
 */
export function validateSessionCount(sessions: number): { isValid: boolean; error?: string } {
  if (!Number.isInteger(sessions) || sessions < 1) {
    return { isValid: false, error: 'Number of sessions must be at least 1.' };
  }
  if (sessions > 50) {
    return { isValid: false, error: 'Number of sessions cannot exceed 50.' };
  }
  return { isValid: true };
}

/**
 * Returns default label if subject name is blank.
 */
export function getSubjectDisplayName(name: string | undefined, index: number): string {
  const trimmed = name?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }
  return `Subject ${index + 1}`;
}

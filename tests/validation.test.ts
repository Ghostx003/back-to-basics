import { describe, expect, it } from 'vitest';
import {
  getSubjectDisplayName,
  validateAndSanitizeUrl,
  validateDuration,
  validateSessionCount,
} from '../src/shared/validation';

describe('Validation and Sanitization Rules', () => {
  describe('URL validation', () => {
    it('accepts valid HTTPS and HTTP URLs', () => {
      const res1 = validateAndSanitizeUrl('https://example.com/course');
      expect(res1.isValid).toBe(true);
      expect(res1.sanitizedUrl).toBe('https://example.com/course');

      const res2 = validateAndSanitizeUrl('http://my-university.edu/login');
      expect(res2.isValid).toBe(true);
      expect(res2.sanitizedUrl).toBe('http://my-university.edu/login');
    });

    it('trims accidental whitespace and prepends https if omitted', () => {
      const res = validateAndSanitizeUrl('   youtube.com/watch?v=123   ');
      expect(res.isValid).toBe(true);
      expect(res.sanitizedUrl).toBe('https://youtube.com/watch?v=123');
    });

    it('rejects unsupported or dangerous schemes', () => {
      const ftpRes = validateAndSanitizeUrl('ftp://files.example.com');
      expect(ftpRes.isValid).toBe(false);
      expect(ftpRes.errorMessage).toContain('Only HTTP and HTTPS');

      const jsRes = validateAndSanitizeUrl('javascript:alert(1)');
      expect(jsRes.isValid).toBe(false);

      const fileRes = validateAndSanitizeUrl('file:///C:/secrets.txt');
      expect(fileRes.isValid).toBe(false);
    });

    it('rejects empty or whitespace-only URLs', () => {
      const emptyRes = validateAndSanitizeUrl('');
      expect(emptyRes.isValid).toBe(false);

      const wsRes = validateAndSanitizeUrl('   ');
      expect(wsRes.isValid).toBe(false);
    });

    it('rejects malformed domains', () => {
      const res = validateAndSanitizeUrl('https://localhost');
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toContain('valid domain name');
    });
  });

  describe('Duration validation', () => {
    it('validates positive durations within bounds', () => {
      expect(validateDuration(25).isValid).toBe(true);
      expect(validateDuration(50).isValid).toBe(true);
      expect(validateDuration(0).isValid).toBe(false);
      expect(validateDuration(-5).isValid).toBe(false);
      expect(validateDuration(500).isValid).toBe(false); // exceeds 360 min limit
    });
  });

  describe('Session count validation', () => {
    it('requires positive integers', () => {
      expect(validateSessionCount(1).isValid).toBe(true);
      expect(validateSessionCount(5).isValid).toBe(true);
      expect(validateSessionCount(0).isValid).toBe(false);
      expect(validateSessionCount(-2).isValid).toBe(false);
      expect(validateSessionCount(2.5).isValid).toBe(false);
    });
  });

  describe('Subject display name fallback', () => {
    it('uses user-provided name if non-empty', () => {
      expect(getSubjectDisplayName('Calculus', 0)).toBe('Calculus');
    });

    it('falls back to neutral label if name is empty or whitespace', () => {
      expect(getSubjectDisplayName('', 0)).toBe('Subject 1');
      expect(getSubjectDisplayName('   ', 2)).toBe('Subject 3');
      expect(getSubjectDisplayName(undefined, 1)).toBe('Subject 2');
    });
  });
});

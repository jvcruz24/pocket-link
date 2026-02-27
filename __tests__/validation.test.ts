import { describe, it, expect } from 'vitest';
import { urlSchema } from '../lib/schema';

describe('URL Validation Schema', () => {
  it('should accept a valid HTTPS URL', () => {
    const result = urlSchema.safeParse({ url: 'https://google.com' });
    expect(result.success).toBe(true);
  });

  it('should reject empty strings', () => {
    const result = urlSchema.safeParse({ url: '' });
    expect(result.success).toBe(false);
  });

  it('should reject a string that is not a URL', () => {
    const result = urlSchema.safeParse({ url: 'not-a-link' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Please enter a valid URL');
    }
  });
});

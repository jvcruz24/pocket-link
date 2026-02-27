import { it, expect, describe, vi } from 'vitest';
import { generateQRCode } from '../lib/qr';

describe('QR Utility', () => {
  it('should return a valid data URL string', async () => {
    const result = await generateQRCode('https://google.com');

    // Check if it starts with the standard data URL prefix for PNGs
    expect(result).toContain('data:image/png;base64,');
  });

  it('should throw an error if input is empty', async () => {
    // Some libraries fail on empty strings; good to check!
    await expect(generateQRCode('')).rejects.toThrow(
      'QR generation requires a non-empty string',
    );
  });
});

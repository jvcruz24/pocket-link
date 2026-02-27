import QRCode from 'qrcode';
/**
 * Generates a Base64 Data URL for a QR code.
 * Separation of concerns: This utility doesn't care about React state.
 */
export const generateQRCode = async (text: string): Promise<string> => {
  if (!text || text.trim().length === 0) {
    throw new Error('QR generation requires a non-empty string');
  }

  try {
    const options: QRCode.QRCodeToDataURLOptions = {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000', // Black dots
        light: '#ffffff', // White background
      },
      errorCorrectionLevel: 'M', // Medium error recovery
    };

    return await QRCode.toDataURL(text, options);
  } catch (err) {
    console.error('QR Generation Error:', err);
    throw new Error('Failed to generate QR code');
  }
};

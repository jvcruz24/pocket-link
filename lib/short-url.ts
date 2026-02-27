import prisma from './prisma';

/**
 * Generate a random short code using the privacy‑focused algorithm described in
 * TECHNICAL_GUIDE.md. The function will attempt a few times with the current
 * length before increasing it recursively if collisions keep occurring.
 */
export async function generateShortCodeRandom(
  length: number = 6,
  maxRetries: number = 10,
): Promise<string> {
  const chars =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    const existing = await prisma.urls.findUnique({
      where: { short_code: code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  // if we hit collision maxRetries times, bump the length and try again
  return generateShortCodeRandom(length + 1, maxRetries);
}

export function bigintToSafe<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
  );
}

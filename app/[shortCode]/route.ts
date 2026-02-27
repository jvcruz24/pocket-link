import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await params;

  const record = await prisma.urls.findUnique({
    where: { short_code: shortCode },
  });

  if (!record || !record.is_active) {
    return new Response('Not found', { status: 404 });
  }

  // Check expiration
  if (record.expires_at && new Date() > record.expires_at) {
    return new Response('Link expired', { status: 410 });
  }

  // optional: increment a counter, log analytics, etc.
  // await prisma.urls.update({ where: { short_code: shortCode }, data: { hits: { increment: 1 } } });

  return NextResponse.redirect(record.long_url);
}

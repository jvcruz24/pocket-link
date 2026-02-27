import prisma from '@/lib/prisma';
import { url } from 'node:inspector';
import z from 'zod';

const urlSchema = z.object({
  url: z.url('Invalid URL format'),
});

function bigintToSafe(obj: any) {
  return JSON.parse(
    JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = urlSchema.parse(body);

    //Check if URL already exist(for idempotency)
    const existing = await prisma.urls.findFirst({
      where: { long_url: url },
    });

    if (existing) {
      return new Response(JSON.stringify(bigintToSafe(existing)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const newUrl = await prisma.urls.create({
      data: {
        long_url: url,
        short_code: (await prisma.urls.count()).toString(),
      },
    });

    return new Response(JSON.stringify(bigintToSafe(newUrl)), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid Request' }), {
      status: 400,
    });
  }
}

export async function GET(request: Request) {
  try {
    const urls = await prisma.urls.findMany();
    return new Response(JSON.stringify(bigintToSafe(urls)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

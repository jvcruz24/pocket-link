import prisma from '@/lib/prisma';
import z from 'zod';
import { bigintToSafe, generateShortCodeRandom } from '@/lib/short-url';

const urlSchema = z.object({
  url: z.url('Invalid URL format'),
});

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

    // create a unique short code using a privacy‑focused random algorithm
    const shortCode = await generateShortCodeRandom();

    const newUrl = await prisma.urls.create({
      data: {
        long_url: url,
        short_code: shortCode,
      },
    });

    return new Response(JSON.stringify(bigintToSafe(newUrl)), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid Request' }), {
      status: 400,
    });
  }
}

export async function GET() {
  try {
    const urls = await prisma.urls.findMany();
    return new Response(JSON.stringify(bigintToSafe(urls)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

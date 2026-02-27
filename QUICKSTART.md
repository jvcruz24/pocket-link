# Developer Quick Start Guide

Get up and running with Pocket Link in minutes.

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Project Structure](#project-structure)
3. [Running Locally](#running-locally)
4. [Code Examples](#code-examples)
5. [Adding Features](#adding-features)
6. [Troubleshooting](#troubleshooting)

---

## Environment Setup

### Prerequisites

```bash
# Check Node.js version (18+ required)
node --version      # Should output v18.x.x or higher
npm --version       # Should output 9.x.x or higher

# Install pnpm (recommended)
npm install -g pnpm@latest

# Verify pnpm installation
pnpm --version      # Should output 8.x.x or higher
```

### Clone & Install

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/pocket-link.git
cd pocket-link

# 2. Install dependencies
pnpm install

# 3. Verify installation
pnpm list           # Shows installed packages
```

### Database Setup (PostgreSQL)

```bash
# 1. Create PostgreSQL database
createdb pocket_link

# 2. Set DATABASE_URL environment variable (in .env.local)
# DATABASE_URL="postgresql://user:password@localhost:5432/pocket_link"

# 3. Run Prisma migrations
npx prisma migrate dev --name init

# 4. (Optional) Open Prisma Studio to view database
npx prisma studio
```

### Environment Variables

Create `.env.local` file:

```bash
# .env.local
# Database (Required for Prisma)
DATABASE_URL="postgresql://user:password@localhost:5432/pocket_link"

# API Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Project Structure

```
pocket-link/
│
├── app/                          # Next.js app directory
│   ├── page.tsx                  # Home page (URL input form)
│   ├── layout.tsx                # Root layout wrapper
│   ├── globals.css               # Global styles
│   │
│   ├── api/                      # API routes
│   │   ├── shorten/
│   │   │   └── route.ts          # POST /api/shorten (Prisma integrated)
│   │   │
│   │   └── [shortCode]/
│   │       └── route.ts          # GET /[shortCode] (Prisma integrated)
│   │
│   ├── generated/
│   │   └── prisma/               # Auto-generated Prisma types
│   │       ├── client.ts
│   │       ├── index.d.ts
│   │       └── ...
│   │
│   └── form/                     # Example form page
│       └── page.tsx              # Reference implementation
│
├── lib/
│   └── prisma.ts                 # Prisma client singleton
│
├── prisma/                       # Prisma configuration
│   ├── schema.prisma             # Database schema (models)
│   └── migrations/               # Migration history
│       ├── migration_lock.toml
│       └── [timestamp]_init/
│           └── migration.sql
│
├── public/                       # Static files
│   └── favicon.ico
│
├── .env.local                    # Environment variables (local)
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── next.config.ts                # Next.js config
├── tailwind.config.js            # Tailwind CSS config
├── postcss.config.mjs            # PostCSS config
├── eslint.config.mjs             # ESLint rules
├── prisma.config.ts              # Prisma configuration
├── README.md                     # Project overview
├── TECHNICAL_GUIDE.md            # Implementation details
└── ARCHITECTURE.md               # System design

```

---

## Running Locally

### Development Mode

```bash
# Start development server
pnpm dev

# Your app will be available at:
# http://localhost:3000

# Features:
# - Hot reload on code changes
# - TypeScript type checking
# - ESLint linting
# - Tailwind CSS compilation
```

### Build for Production

```bash
# Build the project
pnpm build

# Start production server
pnpm start

# Check bundle size
pnpm build --analyze
```

### Linting & Type Checking

```bash
# Run ESLint
pnpm lint

# Fix lint errors
pnpm lint --fix

# Type check with TypeScript
pnpm tsc --noEmit
```

---

## Code Examples

### Creating an API Route

**File:** `app/api/shorten/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Define validation schema
const shortenSchema = z.object({
  url: z.string().url('Invalid URL'),
  expiresIn: z.number().optional(),
});

type ShortenRequest = z.infer<typeof shortenSchema>;

// POST handler
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json();
    const data = shortenSchema.parse(body);

    // TODO: Implement shortening logic
    const shortCode = generateShortCode(data.url);

    // Return response
    return NextResponse.json(
      {
        shortCode,
        shortUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${shortCode}`,
        longUrl: data.url,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

function generateShortCode(url: string): string {
  // Implementation
  return 'abc123';
}
```

### Creating a Service

**File:** `src/services/url-shortening.ts`

```typescript
import crypto from 'crypto';

export class UrlShorteningService {
  /**
   * Generate a short code from a URL
   */
  static generateCode(url: string, length: number = 6): string {
    const hash = crypto.createHash('sha256').update(url).digest();
    return this.encodeBase62(hash).substring(0, length);
  }

  /**
   * Encode buffer to base62
   */
  private static encodeBase62(buffer: Buffer): string {
    const chars =
      '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    let num = 0n;

    for (const byte of buffer) {
      num = (num << 8n) | BigInt(byte);
    }

    while (num > 0n) {
      result = chars[Number(num % 62n)] + result;
      num = num / 62n;
    }

    return result || '0';
  }

  /**
   * Validate URL
   */
  static isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
}
```

### Creating a React Component

**File:** `app/components/url-form.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Form schema
const formSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
});

type FormData = z.infer<typeof formSchema>;

export function UrlForm() {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to shorten URL');

      const result = await response.json();
      setResult(result.shortUrl);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='w-full max-w-2xl'>
      <form onSubmit={handleSubmit(onSubmit)} className='flex gap-4'>
        <input
          {...register('url')}
          type='text'
          placeholder='Enter URL to shorten'
          className='flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
        />
        <button
          type='submit'
          disabled={loading}
          className='px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50'
        >
          {loading ? 'Shortening...' : 'Shorten'}
        </button>
      </form>

      {errors.url && <p className='mt-2 text-red-500'>{errors.url.message}</p>}

      {result && (
        <div className='mt-4 p-4 bg-green-50 border border-green-200 rounded-lg'>
          <p className='text-sm text-gray-600'>Your shortened URL:</p>
          <p className='text-lg font-mono text-green-600'>{result}</p>
          <button
            onClick={() => navigator.clipboard.writeText(result)}
            className='mt-2 px-4 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600'
          >
            Copy to Clipboard
          </button>
        </div>
      )}
    </div>
  );
}
```

### Writing Tests

**File:** `__tests__/services/url-shortening.test.ts`

```typescript
import { UrlShorteningService } from '@/services/url-shortening';

describe('UrlShorteningService', () => {
  describe('generateCode', () => {
    it('should generate a short code of specified length', () => {
      const url = 'https://example.com/very/long/path';
      const code = UrlShorteningService.generateCode(url, 6);

      expect(code).toHaveLength(6);
      expect(/^[a-zA-Z0-9]+$/.test(code)).toBe(true);
    });

    it('should generate consistent codes for same URL', () => {
      const url = 'https://example.com/test';
      const code1 = UrlShorteningService.generateCode(url);
      const code2 = UrlShorteningService.generateCode(url);

      expect(code1).toBe(code2);
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(UrlShorteningService.isValidUrl('https://example.com')).toBe(true);
      expect(UrlShorteningService.isValidUrl('http://example.com')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(UrlShorteningService.isValidUrl('not a url')).toBe(false);
      expect(UrlShorteningService.isValidUrl('ftp://example.com')).toBe(false);
    });
  });
});
```

---

## Adding Features

### Feature: Custom Short Codes

1. **Update validation schema:**

```typescript
const shortenSchema = z.object({
  url: z.string().url(),
  custom: z
    .string()
    .regex(/^[a-z0-9-]{3,20}$/)
    .optional(),
});
```

2. **Update service:**

```typescript
async shortenUrl(url: string, custom?: string): Promise<string> {
  if (custom) {
    // Check if custom code exists
    const exists = await this.codeExists(custom);
    if (exists) throw new Error('Custom code already taken');
    return custom;
  }
  // Generate code
  return this.generateCode(url);
}
```

3. **Update API route:**

```typescript
const { url, custom } = shortenSchema.parse(body);
const shortCode = await urlShorteningService.shortenUrl(url, custom);
```

### Feature: QR Code Generation

1. **Install package:**

```bash
pnpm add qrcode
```

2. **Create component:**

```typescript
import QRCode from 'qrcode';

export async function generateQRCodeDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 300,
  });
}
```

3. **Use in component:**

```typescript
const qrCode = await generateQRCodeDataUrl(shortUrl);
<img src={qrCode} alt="QR Code" className='w-32 h-32' />
```

### Feature: Expiring Links

1. **Update database schema:**

```sql
ALTER TABLE urls ADD COLUMN expires_at TIMESTAMP;
```

2. **Update validation:**

```typescript
const shortenSchema = z.object({
  url: z.string().url(),
  expiresIn: z.number().positive().optional(), // seconds
});
```

3. **Check expiration:**

```typescript
const isExpired = result.expires_at && new Date() > result.expires_at;
if (isExpired) {
  return NextResponse.json({ error: 'Link expired' }, { status: 410 });
}
```

---

## Troubleshooting

### Common Issues

#### Port 3000 Already in Use

```bash
# On macOS/Linux: Find and kill the process
lsof -i :3000
kill -9 <PID>

# On Windows: Use PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# Or use a different port
pnpm dev -- -p 3001
```

#### Module Not Found

```bash
# Clear node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### TypeScript Errors

```bash
# Check TypeScript configuration
pnpm tsc --noEmit

# Force type checking rebuild
rm -rf .next
pnpm build
```

#### Slow Development Server

```bash
# Clear cache
rm -rf .next

# Restart server
pnpm dev

# Check for open files
lsof -i :3000
```

### Debugging

#### Enable Debug Logging

```typescript
// Add to top of file
const DEBUG = process.env.DEBUG === 'true';

if (DEBUG) console.log('Debugging info:', data);
```

#### Run with Debug Mode

```bash
DEBUG=true pnpm dev
```

#### Inspect Network Requests

```bash
# Open DevTools: F12 → Network tab
# Check request/response headers and payloads
```

#### Check Application Logs

```bash
# View all logs
pnpm dev 2>&1 | tee app.log

# Filter logs
pnpm dev 2>&1 | grep "error"
```

---

## Dependencies Overview

### Core Framework

- **next**: React framework with built-in routing
- **react**: UI library
- **react-dom**: React DOM rendering

### Forms & Validation

- **react-hook-form**: Efficient form state management
- **@hookform/resolvers**: Zod resolver for hook form
- **zod**: Schema validation library

### Styling

- **tailwindcss**: Utility-first CSS framework
- **@tailwindcss/postcss**: PostCSS plugin

### Development

- **typescript**: Static type checking
- **eslint**: Code linting
- **postcss**: CSS processing

---

## Next Steps

1. ✅ Set up local environment
2. ✅ Run `pnpm dev` and open http://localhost:3000
3. ✅ Test the URL input form
4. ⏳ Implement backend API routes
5. ⏳ Connect to database
6. ⏳ Add analytics
7. ⏳ Deploy to production

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Hook Form Docs](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## Getting Help

- Check [TECHNICAL_GUIDE.md](TECHNICAL_GUIDE.md) for implementation details
- Review [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- Open an issue on GitHub
- Check existing GitHub discussions

---

**Last Updated:** February 27, 2026

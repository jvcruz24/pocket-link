# Technical Implementation Guide - URL Shortening Logic

This guide provides in-depth technical details for implementing URL shortening in the Pocket Link application.

## Table of Contents

1. [Short Code Generation Algorithms](#short-code-generation-algorithms)
2. [Hash Functions for URL Shortening](#hash-functions-for-url-shortening)
3. [Database Optimization](#database-optimization)
4. [Collision Handling Strategies](#collision-handling-strategies)
5. [Code Examples](#code-examples)
6. [Performance Considerations](#performance-considerations)
7. [Security Implications](#security-implications)

---

## Short Code Generation Algorithms

### Algorithm 1: Hash-Based (Deterministic)

**Overview:** Generate a fixed short code from the URL hash.

**Advantages:**

- Same URL always produces the same short code (idempotent)
- No database lookups needed to check uniqueness
- Stateless operation
- Efficient for large-scale operations

**Disadvantages:**

- Collision risk (hash collision)
- Cannot customize code generation
- Limited analytics per URL (can't track revisions)

**Implementation:**

```typescript
import crypto from 'crypto';

function generateShortCodeHash(longUrl: string, length: number = 6): string {
  // Generate SHA256 hash of the URL
  const hash = crypto.createHash('sha256').update(longUrl).digest();

  // Convert hash bytes to base62
  return encodeBase62(hash, length);
}

function encodeBase62(buffer: Buffer, length: number): string {
  const chars =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  let num = BigInt(0);

  // Convert buffer to number
  for (let i = 0; i < buffer.length; i++) {
    num = num * BigInt(256) + BigInt(buffer[i]);
  }

  // Convert to base62
  while (num > 0n && result.length < length) {
    result = chars[Number(num % 62n)] + result;
    num = num / 62n;
  }

  // Pad if necessary
  while (result.length < length) {
    result = '0' + result;
  }

  return result.substring(0, length);
}

// Usage
const url = 'https://example.com/very/long/url';
const shortCode = generateShortCodeHash(url); // e.g., "a1B2cD"
```

**Performance:**

- Time Complexity: O(1)
- Space Complexity: O(1)
- Suitable for millions of URLs

---

### Algorithm 2: Sequential ID (Most Common in Production)

**Overview:** Use an auto-incrementing ID and convert to base62.

**Advantages:**

- Guaranteed unique codes
- Easy database integration
- Predictable behavior
- Simple collision detection
- Easy to track creation order
- Allows for analytics per code

**Disadvantages:**

- Requires centralized counter management
- Somewhat predictable (security concern for some use cases)
- Need database round-trips

**Implementation:**

```typescript
async function generateShortCodeSequential(db: Database): Promise<string> {
  // Get next ID from database
  const result = await db.query(
    'INSERT INTO id_counter (timestamp) VALUES (NOW()) RETURNING id',
  );

  const id = result[0].id;

  // Convert ID to base62
  return idToBase62(id);
}

function idToBase62(id: number): string {
  const chars =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  if (id === 0) return '0';

  let result = '';
  while (id > 0) {
    result = chars[id % 62] + result;
    id = Math.floor(id / 62);
  }

  return result;
}

function base62ToId(code: string): number {
  const chars =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  let id = 0;
  for (let i = 0; i < code.length; i++) {
    id = id * 62 + chars.indexOf(code[i]);
  }

  return id;
}

// Conversion Examples
idToBase62(1) === '1';
idToBase62(62) === '10';
idToBase62(3844) === '100';
idToBase62(238328) === 'zZ9';

// Reverse
base62ToId('100') === 3844;
```

**Dynamic Scaling:**

```typescript
// Start with 6-character codes, expand if needed
function calculateCodeLength(totalUrls: number): number {
  let length = 6;

  // Check if we've used >80% of available codes
  const maxCodes = Math.pow(62, length);

  if (totalUrls > maxCodes * 0.8) {
    length++;
  }

  return length;
}

// With 6 chars: 62^6 = 56,800,235,584 possible codes (56 billion+)
// With 7 chars: 62^7 = 3,521,614,606,208 possible codes (3.5 trillion+)
```

**Performance:**

- Time Complexity: O(log₆₂ n) = O(1) for practical purposes
- Space Complexity: O(1)
- Database writes: 1 insert + 1 reads per URL
- Highly scalable

---

### Algorithm 3: Random String (Privacy-Focused)

**Overview:** Generate random characters and check for collisions.

**Advantages:**

- Non-sequential (harder to guess)
- Better privacy/security
- No counter management needed
- Good for user-friendly links

**Disadvantages:**

- Requires collision checking
- Extra database queries
- Potentially slower generation
- Random distribution issues

**Implementation:**

```typescript
async function generateShortCodeRandom(
  db: Database,
  length: number = 6,
  maxRetries: number = 10,
): Promise<string> {
  const chars =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Generate random code
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    // Check if already exists
    const existing = await db.query(
      'SELECT id FROM urls WHERE short_code = ?',
      [code],
    );

    if (existing.length === 0) {
      return code;
    }
  }

  // Fallback: increase length and retry
  return generateShortCodeRandom(db, length + 1, maxRetries);
}

// Probability of collision (Birthday Problem)
function collisionProbability(codeLength: number, totalCodes: number): number {
  const maxPossible = Math.pow(62, codeLength);

  // Approximation: P ≈ n² / (2 * N)
  return (totalCodes * totalCodes) / (2 * maxPossible);
}

// Example probabilities:
collisionProbability(6, 1000000); // ~0.15% chance with 1M codes
collisionProbability(6, 10000000); // ~15% chance with 10M codes
collisionProbability(7, 10000000); // ~0.0015% chance with 7-char codes
```

**Performance:**

- Time Complexity: O(log₆₂(n) \* retries)
- Space Complexity: O(1)
- Database reads: Multiple queries per generation (collision checking)
- Slower for high traffic (collision risk increases)

---

## Hash Functions for URL Shortening

### Why Hash Functions?

Hash functions convert variable-length input (URLs) into fixed-length output (short codes) with these properties:

1. **Deterministic**: Same input → Same output
2. **Fast**: Quick computation
3. **Uniform Distribution**: Output spread evenly
4. **Avalanche Effect**: Small input change → Large output change

### Common Hash Functions

#### SHA-256 (Secure Hash Algorithm)

**Use Case:** High security, cryptographic guarantee

```typescript
import crypto from 'crypto';

function hashWithSHA256(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex');
}

// Example
hashWithSHA256('https://example.com');
// Output: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6'
```

**Output:** 64 hex characters (256 bits)

#### MurmurHash (Fast Non-Cryptographic)

**Use Case:** Speed priority, non-critical scenarios

```typescript
function murmurHash(url: string): number {
  let hash = 0;

  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return hash >>> 0; // Return unsigned 32-bit integer
}

// Usage for short code
const hashValue = murmurHash(url);
const shortCode = hashValue.toString(36).substring(0, 6);
```

**Output:** 32-bit number (4 bytes)
**Performance:** 100-1000x faster than SHA-256

#### CRC32 (Cyclic Redundancy Check)

**Use Case:** Fast checksum, collision acceptable

```typescript
function crc32(url: string): number {
  let crc = 0xffffffff;

  for (let i = 0; i < url.length; i++) {
    crc ^= url.charCodeAt(i);

    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}
```

**Output:** 32-bit number
**Speed:** Very fast but high collision likelihood

### Recommended Approach

```typescript
// For production URL shortening:
import crypto from 'crypto';

function generateProductionShortCode(url: string, length: number = 6): string {
  // Use SHA-256 for reliability
  const hash = crypto.createHash('sha256').update(url).digest();

  // Convert to base62
  let result = '';
  let num = 0n;

  for (let i = 0; i < 8; i++) {
    // Use first 8 bytes
    num = (num << 8n) | BigInt(hash[i]);
  }

  const chars =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  while (result.length < length && num > 0n) {
    result = chars[Number(num % 62n)] + result;
    num = num / 62n;
  }

  return result.padStart(length, '0');
}
```

---

## Database Optimization

### Indexing Strategy

```sql
-- Primary index for lookup speed
CREATE UNIQUE INDEX idx_short_code ON urls(short_code);

-- For user URL management
CREATE INDEX idx_user_short_code ON urls(user_id, short_code);

-- For analytics queries
CREATE INDEX idx_created_at ON urls(created_at DESC);

-- Compound index for common queries
CREATE INDEX idx_user_created ON urls(user_id, created_at DESC);
```

### Query Optimization

**Fast Lookup (O(log n)):**

```sql
SELECT long_url FROM urls WHERE short_code = ? LIMIT 1;
```

**Bulk Operations:**

```sql
-- Update multiple clicks efficiently
UPDATE urls SET click_count = click_count + 1
WHERE short_code IN (?, ?, ?, ...);

-- Batch insert with collision handling
INSERT INTO urls (short_code, long_url, user_id, created_at)
VALUES (?, ?, ?, NOW())
ON DUPLICATE KEY UPDATE click_count = click_count;
```

### Connection Pooling

```typescript
// Use connection pooling for efficiency
import { Pool } from 'pg';

const pool = new Pool({
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Reuse connections instead of creating new ones
const client = await pool.connect();
```

---

## Collision Handling Strategies

### Strategy 1: Retry with Longer Code

```typescript
async function generateWithFallback(
  url: string,
  startLength: number = 6,
): Promise<string> {
  let length = startLength;

  while (length <= 10) {
    const code = generateShortCodeHash(url, length);

    const exists = await db.query('SELECT id FROM urls WHERE short_code = ?', [
      code,
    ]);

    if (exists.length === 0) {
      return code; // Found unique code
    }

    length++; // Try longer code
  }

  throw new Error('Cannot generate unique short code');
}
```

### Strategy 2: Append Counter

```typescript
async function generateWithCounter(
  url: string,
  baseLength: number = 6,
): Promise<string> {
  const baseCode = generateShortCodeHash(url, baseLength);

  let code = baseCode;
  let counter = 0;

  while (await codeExists(code)) {
    // Append counter to original code
    counter++;
    code = `${baseCode}-${counter}`;
  }

  return code;
}
```

### Strategy 3: Date-Suffixed Codes

```typescript
function generateWithDateSuffix(url: string): string {
  const baseCode = generateShortCodeHash(url, 4);
  const timestamp = Date.now().toString(36).substring(-2);

  return `${baseCode}${timestamp}`;
  // Example: 'a1B2cD' + '9z' → 'a1B2cD9z'
}
```

---

## Code Examples

### Complete Shortening Service Class

```typescript
import crypto from 'crypto';

class UrlShorteningService {
  private db: Database;
  private codeLength: number = 6;

  constructor(database: Database) {
    this.db = database;
  }

  /**
   * Shorten a URL
   * @param longUrl - The URL to shorten
   * @param userId - Optional user ID for tracking
   * @returns Short code and full short URL
   */
  async shortenUrl(
    longUrl: string,
    userId?: string,
  ): Promise<{ shortCode: string; shortUrl: string }> {
    // Validate URL
    this.validateUrl(longUrl);

    // Check if URL already shortened
    const existing = await this.findByLongUrl(longUrl, userId);
    if (existing) {
      return {
        shortCode: existing.short_code,
        shortUrl: `https://pocket-link/${existing.short_code}`,
      };
    }

    // Generate unique short code
    const shortCode = await this.generateUniqueCode(longUrl);

    // Store in database
    await this.storeMapping(shortCode, longUrl, userId);

    return {
      shortCode,
      shortUrl: `https://pocket-link/${shortCode}`,
    };
  }

  /**
   * Resolve a short code to long URL
   * @param shortCode - The short code
   * @returns Long URL or null
   */
  async resolveUrl(shortCode: string): Promise<string | null> {
    const result = await this.db.query(
      'SELECT long_url FROM urls WHERE short_code = ? AND is_active = TRUE',
      [shortCode],
    );

    if (result.length === 0) return null;

    // Record access (async, non-blocking)
    this.recordAccess(shortCode).catch(console.error);

    return result[0].long_url;
  }

  /**
   * Generate unique short code
   */
  private async generateUniqueCode(longUrl: string): Promise<string> {
    let length = this.codeLength;

    while (length <= 10) {
      const code = this.generateHashCode(longUrl, length);

      const exists = await this.codeExists(code);
      if (!exists) {
        return code;
      }

      length++;
    }

    throw new Error('Unable to generate unique short code');
  }

  /**
   * Generate hash-based code
   */
  private generateHashCode(url: string, length: number): string {
    const hash = crypto.createHash('sha256').update(url).digest();
    const chars =
      '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

    let result = '';
    let num = BigInt(0);

    for (let i = 0; i < Math.min(8, hash.length); i++) {
      num = (num << 8n) | BigInt(hash[i]);
    }

    while (result.length < length && num > 0n) {
      result = chars[Number(num % 62n)] + result;
      num = num / 62n;
    }

    return result.padStart(length, '0');
  }

  /**
   * Validate URL format
   */
  private validateUrl(url: string): void {
    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }
  }

  /**
   * Check if code exists
   */
  private async codeExists(code: string): Promise<boolean> {
    const result = await this.db.query(
      'SELECT 1 FROM urls WHERE short_code = ?',
      [code],
    );
    return result.length > 0;
  }

  /**
   * Find existing mapping
   */
  private async findByLongUrl(longUrl: string, userId?: string) {
    const query = userId
      ? 'SELECT * FROM urls WHERE long_url = ? AND user_id = ?'
      : 'SELECT * FROM urls WHERE long_url = ? LIMIT 1';

    const params = userId ? [longUrl, userId] : [longUrl];
    const result = await this.db.query(query, params);

    return result[0] || null;
  }

  /**
   * Store URL mapping
   */
  private async storeMapping(
    shortCode: string,
    longUrl: string,
    userId?: string,
  ): Promise<void> {
    await this.db.query(
      'INSERT INTO urls (short_code, long_url, user_id, created_at) VALUES (?, ?, ?, NOW())',
      [shortCode, longUrl, userId || null],
    );
  }

  /**
   * Record access for analytics
   */
  private async recordAccess(shortCode: string): Promise<void> {
    // Update click count
    await this.db.query(
      'UPDATE urls SET click_count = click_count + 1, last_accessed_at = NOW() WHERE short_code = ?',
      [shortCode],
    );
  }
}
```

### Next.js API Route Integration

```typescript
// app/api/shorten/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const shortenSchema = z.object({
  url: z.string().url('Invalid URL'),
});

const urlService = new UrlShorteningService(database);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = shortenSchema.parse(body);

    const result = await urlService.shortenUrl(url);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
```

---

## Performance Considerations

### Benchmarking Results (Example)

| Operation        | Algorithm  | Time  | Database Hits               |
| ---------------- | ---------- | ----- | --------------------------- |
| Generate Code    | Hash-Based | 0.1ms | 0 (+ 1 for collision check) |
| Generate Code    | Sequential | 0.5ms | 2 (1 insert, 1 select)      |
| Generate Code    | Random     | 2-5ms | Variable (collision checks) |
| Resolve URL      | Any        | 0.2ms | 1 (with index)              |
| Analytics Update | Any        | 1-2ms | 1 (async)                   |

### Optimization Strategies

#### 1. Caching Layer

```typescript
// Add Redis caching
const cache = new Redis();

async function resolveUrl(shortCode: string): Promise<string | null> {
  // Check cache first
  const cached = await cache.get(`short:${shortCode}`);
  if (cached) return cached;

  // Query database
  const longUrl = await db.query(
    'SELECT long_url FROM urls WHERE short_code = ?',
    [shortCode],
  );

  if (longUrl) {
    // Cache for 24 hours
    await cache.setex(`short:${shortCode}`, 86400, longUrl);
  }

  return longUrl;
}
```

#### 2. Batch Processing

```typescript
// Update multiple URLs analytics in single query
async function recordBatchAccess(shortCodes: string[]): Promise<void> {
  const placeholders = shortCodes.map(() => '?').join(',');

  await db.query(
    `UPDATE urls SET click_count = click_count + 1, 
     last_accessed_at = NOW() WHERE short_code IN (${placeholders})`,
    shortCodes,
  );
}
```

#### 3. Async Analytics

```typescript
// Non-blocking analytics recording
async function recordAccessAsync(shortCode: string): Promise<void> {
  // Queue to message broker instead of direct DB write
  queue.enqueue({
    type: 'url_accessed',
    shortCode,
    timestamp: Date.now(),
  });
}

// Background worker processes queue
async function processAnalyticsQueue(): Promise<void> {
  while (true) {
    const batch = queue.dequeueBatch(100);
    if (batch.length === 0) {
      await sleep(1000);
      continue;
    }

    // Batch update database
    await recordBatchAccess(batch.map((e) => e.shortCode));
  }
}
```

---

## Security Implications

### URL Validation

```typescript
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Whitelist safe protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    // Prevent localhost/private IPs
    if (isPrivateIP(parsed.hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function isPrivateIP(hostname: string): boolean {
  const privateRanges = [
    /^localhost$/,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
  ];

  return privateRanges.some((range) => range.test(hostname));
}
```

### Rate Limiting

```typescript
// Implement rate limiting per IP
const rateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
});

app.post('/api/shorten', rateLimiter, async (req, res) => {
  // Handle request
});
```

### Short Code Enumeration Prevention

```typescript
// Use non-sequential codes to prevent enumeration
// Shuffle base62 alphabet for less predictability
const shuffledChars = '4qz2w1x3c5v6b7n8m9p0rfg0hjklyuiopasdfghjklzxcvbnm';

function generateObfuscatedCode(id: number, length: number = 6): string {
  let result = '';
  while (result.length < length && id > 0) {
    result = shuffledChars[id % shuffledChars.length] + result;
    id = Math.floor(id / shuffledChars.length);
  }
  return result.padStart(length, '0');
}
```

---

## Summary

| Algorithm  | Speed     | Uniqueness | Complexity | Best For              |
| ---------- | --------- | ---------- | ---------- | --------------------- |
| Hash-Based | Very Fast | Good       | Low        | High-volume shortcuts |
| Sequential | Fast      | Perfect    | Medium     | Production systems    |
| Random     | Slow      | Excellent  | High       | Privacy-focused apps  |

For Pocket Link, **recommend Sequential ID approach** with:

- Efficient database indexing
- Redis caching for hot URLs
- Async analytics processing
- Rate limiting on API
- URL validation and security checks

---

**Last Updated:** February 27, 2026

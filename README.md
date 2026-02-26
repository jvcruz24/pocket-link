# Pocket Link - URL Shortening Service

A modern Next.js application for creating shortened URLs with a clean, intuitive interface. Built with TypeScript, React Hook Form, Zod validation, and Tailwind CSS.

## Table of Contents

- [Project Overview](#project-overview)
- [Understanding URL Shortening Logic](#understanding-url-shortening-logic)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [How It Works](#how-it-works)
- [API Design (Planned)](#api-design-planned)
- [Database Schema (Planned)](#database-schema-planned)

---

## Project Overview

**Pocket Link** is a URL shortening service that transforms long URLs into compact, shareable links. The application provides:

- ✅ URL validation with Zod schema validation
- ✅ React Hook Form for seamless form handling
- ✅ Responsive design with Tailwind CSS
- ✅ Dark mode support
- ✅ Type-safe TypeScript implementation

Current Status: **Frontend Implementation** (Backend API ready for integration)

---

## Understanding URL Shortening Logic

### What is URL Shortening?

URL shortening is a technique that converts a long URL into a compressed, more manageable form. Instead of sharing a lengthy link like:

```
https://example.com/products/incredibly-long-product-name/details?id=12345&tracking=abc123&utm_source=email
```

Users can share a shorter equivalent:

```
https://pocket.link/abc123
```

### How Does It Work?

#### 1. **URL Encoding & Hashing**

The shortening process involves:

```
Long URL → Hash Function → Short Code
https://example.com/...?tracking=xyz → SHA256/MD5 → base62(hash) → "a1B2cD"
```

#### 2. **Short Code Generation Methods**

There are multiple approaches to generate short codes:

##### A) **Hash-Based Approach** (Current Planned Implementation)

```
Algorithm:
1. Take the original URL
2. Apply a hash function (SHA256, MD5)
3. Encode the hash in base62 (0-9, a-z, A-Z)
4. Take first N characters as the short code

Pros:
- Deterministic (same URL = same code)
- No database lookup needed for collision detection
- Compact representation

Cons:
- Collisions possible with short codes
- Cannot track creation stats easily
```

##### B) **Sequential ID Approach** (Most Common)

```
Algorithm:
1. Increment a counter/sequence number
2. Encode the ID in base62
3. Store mapping in database

ID Sequence: 1, 2, 3, 4...
base62(1) = "1"
base62(62) = "10"
base62(3843) = "zZ"

Pros:
- Guaranteed unique codes
- Easy to track creation order
- Database lookup is simple

Cons:
- Requires database access
- Predictable URL codes
- Need counter management
```

##### C) **Random String Approach**

```
Algorithm:
1. Generate random characters from base62 set
2. Check database for collision
3. Re-generate if collision occurs
4. Store mapping

Pros:
- Non-sequential (hard to guess)
- Better privacy
- Natural distribution

Cons:
- Requires collision checking
- Database overhead
- More complex implementation
```

#### 3. **Base62 Encoding**

Base62 uses 62 characters (0-9, a-z, A-Z) instead of base10 (10 digits):

```typescript
// Example base62 encoding function
function toBase62(num: number): string {
  const chars =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  while (num > 0) {
    result = chars[num % 62] + result;
    num = Math.floor(num / 62);
  }
  return result || '0';
}

// Example conversions:
toBase62(1) = '1';
toBase62(62) = '10';
toBase62(3844) = '100';
toBase62(238328) = 'zZ9';
```

#### 4. **Redirect Logic**

When a user accesses a short URL:

```
Flow:
1. User clicks: pocket-link/abc123
2. Server receives request: GET /abc123
3. Database lookup: Find mapping {short_code: 'abc123', long_url: '...'}
4. HTTP 301/302 redirect to original URL
5. Analytics recorded (optional): timestamps, referrers, user agents
```

#### 5. **Data Persistence**

Required database mapping:

```typescript
// Mapping Example
{
  id: 123,
  short_code: "aBc12",
  long_url: "https://example.com/products/...",
  created_at: "2026-02-27T10:30:00Z",
  expires_at: "2027-02-27T10:30:00Z" | null,
  clicks: 157,
  user_id: "user_456" | null
}
```

### URL Shortening Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   User Submits Long URL                      │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Frontend Validation (Zod Schema)                │
│  - Verify valid URL format                                   │
│  - Check URL length                                          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              POST /api/shorten (Backend API)                 │
│  - Receive long URL                                          │
│  - Generate short code (hash/id/random)                      │
│  - Check for collisions                                      │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Store in Database                               │
│  - Save mapping (short_code ↔ long_url)                      │
│  - Record metadata (timestamp, user, etc.)                   │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│           Return Short URL to User                           │
│  - Display pocket-link/abc123                                │
│  - Enable copy-to-clipboard                                  │
└────────────────────────────┬────────────────────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
        ▼                                         ▼
┌──────────────────────────┐         ┌─────────────────────┐
│  User Shares Short URL   │         │ Analytics Tracking  │
│  - Social media          │         │ - Click count       │
│  - Email                 │         │ - Referrers         │
│  - Messages              │         │ - User agents       │
└──────────┬───────────────┘         └┬────────────────────┘
           │                          │
           └──────────────┬───────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │  GET /[short_code]                  │
        │  - Lookup short code in database    │
        │  - Record analytics                 │
        │  - Redirect to original URL (301)   │
        └─────────────────────────────────────┘
```

---

## Architecture

### Frontend Architecture (Current)

The application follows a client-side form validation pattern:

```
┌──────────────────────────────────┐
│      Next.js App Router          │
│  (app/ directory structure)      │
└────────────┬─────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌─────────────┐  ┌────────────────┐
│ RootLayout  │  │ Page Component │
│ (layout)    │  │ (page.tsx)     │
└─────────────┘  └────────┬───────┘
                          │
             ┌────────────┴────────────┐
             │                         │
             ▼                         ▼
        ┌──────────┐           ┌──────────────┐
        │ Zod      │           │ React Hook   │
        │ Validation│           │ Form         │
        └──────────┘           └──────────────┘
             │                         │
             └────────────┬────────────┘
                          │
                          ▼
                  ┌──────────────────┐
                  │ Form UI (Input)  │
                  │ + Error Display  │
                  └──────────────────┘
```

### Planned Backend Architecture

```
┌────────────────┐
│ Frontend       │
│ (Next.js App)  │
└────────┬───────┘
         │
    ┌────┴─────────────────┐
    │                      │
    ▼                      ▼
┌──────────────┐   ┌──────────────────┐
│ POST /api/   │   │ GET /[shortCode] │
│ shorten      │   │ (redirect)       │
└──────┬───────┘   └────────┬─────────┘
       │                    │
       │        ┌───────────┴──┐
       │        │              │
       ▼        ▼              ▼
   ┌─────────────────────────────────┐
   │     Business Logic Layer        │
   │ - URL validation                │
   │ - Short code generation         │
   │ - Collision detection           │
   │ - Analytics recording           │
   └─────────────┬───────────────────┘
                 │
                 ▼
   ┌─────────────────────────────────┐
   │      Database Layer             │
   │ - URL mappings                  │
   │ - User accounts                 │
   │ - Analytics data                │
   └─────────────────────────────────┘
```

---

## Tech Stack

| Layer           | Technology      | Version | Purpose                                    |
| --------------- | --------------- | ------- | ------------------------------------------ |
| Framework       | Next.js         | 16.1.6  | React meta-framework with built-in routing |
| UI Library      | React           | 19.2.3  | Component-based UI rendering               |
| Language        | TypeScript      | 5.x     | Type-safe JavaScript                       |
| Form Management | React Hook Form | 7.71.2  | Efficient form state management            |
| Validation      | Zod             | 4.3.6   | Schema validation library                  |
| Styling         | Tailwind CSS    | 4.x     | Utility-first CSS framework                |
| Linting         | ESLint          | 9.x     | Code quality assurance                     |

### Why These Technologies?

- **Next.js**: Full-stack React framework with API routes, SSR, and excellent DX
- **React Hook Form**: Minimal re-renders, small bundle size, form optimization
- **Zod**: Runtime schema validation with type inference
- **Tailwind CSS**: Fast styling without writing CSS, built-in dark mode
- **TypeScript**: Prevents runtime errors with static type checking

---

## Project Structure

```
pocket-link/
├── app/
│   ├── page.tsx              # Main page with URL input form
│   ├── layout.tsx            # Root layout wrapper
│   ├── globals.css           # Global Tailwind styles
│   └── form/
│       └── page.tsx          # Reference form (old pattern comparison)
│
├── public/                   # Static assets
├── package.json              # Project dependencies
├── next.config.ts            # Next.js configuration
├── tsconfig.json             # TypeScript configuration
├── eslint.config.mjs         # ESLint configuration
├── postcss.config.mjs        # PostCSS/Tailwind configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── postcss.config.mjs        # PostCSS configuration
├── pnpm-workspace.yaml      # pnpm workspace config
├── pnpm-lock.yaml           # Locked dependencies
└── README.md                # This file
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ or **pnpm** 8.x
- **pnpm** for package management

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd pocket-link
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Run development server**

   ```bash
   pnpm dev
   ```

   The app will be available at `http://localhost:3000`

4. **Build for production**
   ```bash
   pnpm build
   pnpm start
   ```

---

## How It Works

### 1. URL Input Validation

The application uses **Zod** for schema validation:

```typescript
// From app/page.tsx
const urlSchema = z.object({
  url: z.url('Please enter a valid URL'),
});

type UrlFormData = z.infer<typeof urlSchema>;
```

**What happens:**

- User enters a URL in the input field
- Zod validates that a valid URL format is provided
- If invalid, error message displays: "Please enter a valid URL"
- Only valid URLs proceed to the next step

### 2. Form State Management

**React Hook Form** handles form logic:

```typescript
const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<UrlFormData>({
  resolver: zodResolver(urlSchema),
});
```

**What this provides:**

- `register`: Connects input field to form state
- `handleSubmit`: Validates form and triggers submission
- `errors`: Contains validation error messages
- `zodResolver`: Bridges Zod validation with React Hook Form

### 3. Form Submission

```typescript
const onSubmit = (data: UrlFormData) => {
  console.log('Valid URL:', data.url);
  // TODO: Send to API endpoint to generate short code
};
```

**Current state:** Logs to console
**Next step:** Will call `POST /api/shorten` endpoint

### 4. User Interface

The UI features:

- Clean, minimalist design
- Dark mode support
- Responsive layout
- Visual feedback on validation errors
- "Shorten URL" button to trigger submission

---

## API Design (Planned)

### Endpoint: POST `/api/shorten`

**Request:**

```json
{
  "url": "https://example.com/very/long/url/path"
}
```

**Response (Success - 201):**

```json
{
  "short_code": "aBc123",
  "short_url": "https://pocket-link/aBc123",
  "long_url": "https://example.com/very/long/url/path",
  "created_at": "2026-02-27T10:30:00Z"
}
```

**Response (Error - 400):**

```json
{
  "error": "Invalid URL format",
  "code": "INVALID_URL"
}
```

### Endpoint: GET `/[shortCode]`

**Behavior:**

- Looks up short code in database
- Records analytics (timestamp, referrer, user agent)
- Returns HTTP 301 Moved Permanently with Location header
- Client is redirected to original URL

**Example:**

```
Client Request: GET /aBc123
Server Response: 301 Location: https://example.com/very/long/url/path
```

---

## Database Schema (Planned)

### URLs Table

```sql
CREATE TABLE urls (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  short_code VARCHAR(10) UNIQUE NOT NULL,
  long_url TEXT NOT NULL,
  user_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  click_count INT DEFAULT 0,
  last_accessed_at TIMESTAMP,

  INDEX idx_short_code (short_code),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);
```

### Analytics Table (Optional)

```sql
CREATE TABLE analytics (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  short_code_id BIGINT NOT NULL,
  referrer VARCHAR(512),
  user_agent TEXT,
  ip_address VARCHAR(45),
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  country VARCHAR(2),

  FOREIGN KEY (short_code_id) REFERENCES urls(id),
  INDEX idx_short_code_id (short_code_id),
  INDEX idx_accessed_at (accessed_at)
);
```

---

## Future Enhancements

- [ ] Backend API implementation with database
- [ ] User authentication system
- [ ] URL expiration support
- [ ] Analytics dashboard
- [ ] Custom short codes (choose your own code)
- [ ] QR code generation
- [ ] API rate limiting
- [ ] URL preview before redirect
- [ ] Bulk URL shortening
- [ ] Browser extension

---

## Development Tips

### Running Tests (Setup Pending)

```bash
pnpm test
```

### Linting

```bash
pnpm lint
```

### Code Quality

- TypeScript strict mode enabled
- ESLint for code style
- Zod for runtime validation

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Support

For issues, questions, or suggestions, please open an issue on the GitHub repository.

---

## Acknowledgments

- [Next.js Documentation](https://nextjs.org/docs)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Last Updated:** February 27, 2026

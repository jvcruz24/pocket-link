# Architecture & System Design Guide

Comprehensive architecture documentation for Pocket Link URL shortening service.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Component Diagram](#component-diagram)
3. [Data Flow](#data-flow)
4. [Deployment Architecture](#deployment-architecture)
5. [Scalability Strategy](#scalability-strategy)
6. [API Specifications](#api-specifications)

---

## System Architecture

### High-Level Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         Client Layer                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Web Browser / Mobile App / Desktop Client              │   │
│  │  - User interface                                        │   │
│  │  - Client-side validation (Zod)                         │   │
│  └─────────────────────────┬────────────────────────────────┘   │
└──────────────────────────────┼──────────────────────────────────┘
                               │ HTTPS/HTTP
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    API Gateway / Load Balancer                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  - Route requests                                        │   │
│  │  - SSL/TLS termination                                   │   │
│  │  - Rate limiting                                         │   │
│  │  - Request logging                                       │   │
│  └──────────────────────────┬────────────────────────────────┘   │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
         ┌─────────────┐┌─────────────┐┌─────────────┐
         │  App Pod 1  ││  App Pod 2  ││  App Pod N  │
         │  (Next.js)  ││  (Next.js)  ││  (Next.js)  │
         └──────┬──────┘└─────────────┘└──────┬──────┘
                │              │              │
                └──────────────┼──────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │   Cache Layer    │
                    │   (Redis)        │
                    └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    │                  │
                    ▼                  ▼
            ┌──────────────┐   ┌──────────────┐
            │  Master DB   │   │  Replica DB  │
            │  (R/W)       │   │  (R)         │
            └──────────────┘   └──────────────┘

            Queue/Message Broker (Analytics)
            │
            ▼
            Analytics Engine
            │
            ▼
            Time-series Database
```

### Layered Architecture

```
┌────────────────────────────────────────────────────────────┐
│              Presentation Layer (Next.js)                  │
│  - React Components                                        │
│  - Form Validation (Zod)                                   │
│  - User Interface                                          │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│           API Layer (Next.js API Routes)                   │
│  - POST /api/shorten                                       │
│  - GET /[shortCode]                                        │
│  - HTTP middleware (Auth, Rate Limiting)                   │
│  - Prisma client integration                               │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│          Business Logic Layer (Services)                   │
│  - URL validation (Zod)                                    │
│  - Short code generation (Sequential ID / Base62)          │
│  - Collision detection                                     │
│  - URL expiration logic                                    │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│       Data Access Layer (Prisma ORM)                       │
│  - Type-safe database queries                              │
│  - Automatic query optimization                            │
│  - Migration management                                    │
│  - Connection pooling                                      │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│      Data Layer (PostgreSQL)                               │
│  - urls table with indexed short_code                      │
│  - Automatic timestamps (created_at)                       │
│  - Soft delete with is_active flag                         │
│  - Expiration support with expires_at                      │
└────────────────────────────────────────────────────────────┘
```

---

## Component Diagram

### Microservices Architecture (Scalable)

```
┌─────────────────────────────────────────────────────────────┐
│                  Client Applications                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              API Gateway (Kong / Nginx)                     │
│  - Request routing                                          │
│  - Rate limiting                                            │
│  - Authentication                                           │
│  - SSL termination                                          │
└────────────┬───────────────────────────────────────┬────────┘
             │                                       │
             ▼                                       ▼
    ┌──────────────────┐              ┌──────────────────────┐
    │ URL Shortening   │              │ URL Resolution       │
    │ Service          │              │ Service              │
    │                  │              │                      │
    │ Responsibilities:│              │ Responsibilities:    │
    │ - Validate URL   │              │ - Lookup short code  │
    │ - Generate code  │              │ - Return long URL    │
    │ - Handle collisions              │ - Record analytics   │
    │ - Store mapping  │              │                      │
    └──────┬───────────┘              └──────┬───────────────┘
           │                                  │
           └──────────────┬───────────────────┘
                          │
                ┌─────────┴─────────┐
                │                   │
                ▼                   ▼
        ┌────────────────┐  ┌────────────────────┐
        │ Database       │  │ Cache              │
        │ Service        │  │ (Redis)            │
        │ - URL mappings │  │ - Hot URLs         │
        │ - User data    │  │ - Session data     │
        │ - Analytics    │  │ - Rate limits      │
        └────────────────┘  └────────────────────┘
                │
                ├─────────────────────────────────────┐
                │                                     │
                ▼                                     ▼
        ┌────────────────┐              ┌────────────────────┐
        │Analytics       │              │User Service        │
        │Service         │              │                    │
        │ - Process logs │              │ - User signup      │
        │ - Aggregate    │              │ - Profile mgmt     │
        │ - Dashboard    │              │ - Premium features │
        └────────────────┘              └────────────────────┘
```

### Service Communication

```
Synchronous (Request-Response):
┌────────────┐     HTTP/gRPC      ┌────────────┐
│  Client    │ ─────────────────> │  API       │
│            │ <───────────────── │  Server    │
└────────────┘      JSON/Protobuf  └────────────┘

Asynchronous (Event-Driven):
┌────────────┐                     ┌────────────┐
│  Service A │  Event Published    │   Queue    │ ─┐
└────────────┘ ─────────────────-> └────────────┘  │
                                                    │
                                                    ▼
                                          ┌────────────────┐
                                          │  Service B     │
                                          │  (Consumer)    │
                                          └────────────────┘
```

---

## Data Flow

### URL Shortening Flow

```
STEP 1: User Input
┌──────────────────┐
│ User enters URL  │
│ in form          │
└────────┬─────────┘
         │
STEP 2: Client-Side Validation
         │
         ▼
┌──────────────────────────┐
│ Zod Schema Validates     │
│ - Valid URL format?      │
│ - Length check?          │
│ - Protocol check?        │
└────────┬─────────────────┘
         │
         ├─ Invalid ──> Show Error to User
         │
         └─ Valid
            │
STEP 3: Submit to Backend
            │
            ▼
         POST /api/shorten
            ▼
┌──────────────────────────────────┐
│ Backend URL Shortening Service   │
│                                  │
│ 1. Validate URL (again)          │
│    - URL format                  │
│    - Not blacklisted             │
│    - Not private IP              │
│                                  │
│ 2. Check for Duplicates          │
│    - Query DB: SELECT * FROM ... │
│    - If exists, return cached    │
│                                  │
│ 3. Generate Short Code           │
│    - Hash or Sequential ID?      │
│    - Collision detection         │
│    - If collision: regenerate    │
│                                  │
│ 4. Store Mapping                 │
│    - INSERT into database        │
│    - Cache result in Redis       │
│                                  │
└────────┬───────────────────────────┘
         │
STEP 4: Return Response
         │
         ▼
┌──────────────────────────────┐
│ JSON Response                │
│ {                            │
│   "short_code": "abc123",    │
│   "short_url": "pk-link/..." │
│   "created_at": "2026-02-27" │
│ }                            │
└────────┬─────────────────────┘
         │
STEP 5: Display to User
         │
         ▼
┌──────────────────────────────┐
│ Show Short URL              │
│ - Copy to clipboard button  │
│ - Share options             │
│ - QR code (optional)        │
└──────────────────────────────┘
```

### URL Resolution Flow

```
STEP 1: User Clicks Short Link
┌────────────────────────┐
│ Browser navigates to: │
│ pocket-link/abc123    │
└──────────┬─────────────┘
           │
STEP 2: Request to Server
           │
           ▼
      GET /[shortCode]
           ▼
┌──────────────────────────────┐
│ Extract short code from URL  │
│ (Middleware)                 │
└──────────┬───────────────────┘
           │
STEP 3: Lookup in Cache
           │
           ▼
┌──────────────────────────────┐
│ Check Redis Cache            │
│ key: "short:abc123"          │
└──────────┬───────────────────┘
           │
        ┌──┴──┐
        │     │
      Found  NotFound
        │     │
        ▼     ▼
    [Return] [Continue]
             │
STEP 4: Database Lookup
             │
             ▼
    ┌───────────────────────┐
    │ Query Database        │
    │ SELECT long_url FROM  │
    │ urls WHERE            │
    │ short_code = 'abc123' │
    └──────────┬────────────┘
               │
            ┌──┴──────┐
            │         │
         Found     NotFound
            │         │
            ▼         ▼
         [Cache]  404 Error
            │
STEP 5: Record Analytics
            │
            ▼
    ┌───────────────────┐
    │ Queue Event:      │
    │ - timestamp       │
    │ - referrer        │
    │ - user_agent      │
    │ - ip_address      │
    └────────┬──────────┘
             │
STEP 6: Redirect User
             │
             ▼
    ┌────────────────┐
    │ HTTP 301        │
    │ Location:       │
    │ https://        │
    │ example.com/... │
    └────────┬───────┘
             │
STEP 7: Browser Navigates
             │
             ▼
    ┌──────────────────┐
    │ User sees        │
    │ original URL     │
    │ content          │
    └──────────────────┘
```

---

## Deployment Architecture

### Single Instance (Development)

```
┌────────────────────────────────────────┐
│         Development Server             │
│  (Local machine or small VPS)         │
│                                        │
│  ┌────────────────────────────────┐  │
│  │ Next.js App (all-in-one)      │  │
│  │ - Frontend                     │  │
│  │ - API routes                   │  │
│  │ - Business logic               │  │
│  └────────┬───────────────────────┘  │
│           │                           │
│  ┌────────▼───────────────────────┐  │
│  │ SQLite / PostgreSQL             │  │
│  └─────────────────────────────────┘  │
└────────────────────────────────────────┘

Commands:
pnpm dev      # Run development server
pnpm build    # Build for production
pnpm start    # Run production server
```

### Production Architecture (Multi-tier)

```
┌────────────────────────────────────────────────────────────────┐
│                      CDN (Cloudflare)                          │
│  - Static asset caching                                        │
│  - DDoS protection                                             │
│  - Global distribution                                         │
└────────────┬───────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│                  Load Balancer (AWS ELB)                       │
│  - Distribute traffic                                          │
│  - Health checks                                               │
│  - SSL termination                                             │
└────────┬───────────────────────────────────────────────────────┘
         │
         ├─────────────────────────────────────┐
         │                                     │
         ▼                                     ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│  App Server (EC2)        │      │  App Server (EC2)        │
│  - Next.js app           │      │  - Next.js app           │
│  - Node.js runtime       │      │  - Node.js runtime       │
│  - PM2                   │      │  - PM2                   │
└──────────┬───────────────┘      └──────────┬───────────────┘
           │                                  │
           └──────────────┬───────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
        ┌──────────────┐      ┌──────────────────┐
        │  PostgreSQL  │      │  Redis Cluster   │
        │  Primary     │      │  (Cache Layer)   │
        └──────┬───────┘      └──────────────────┘
               │
               ▼
        ┌──────────────┐
        │  Replication │
        │  to Replica  │
        └──────────────┘

        ┌──────────────────────────┐
        │ Message Queue (SQS/Kafka)│
        │ - Analytics events       │
        │ - Async processing       │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ Analytics Service        │
        │ - Process events         │
        │ - Aggregate metrics      │
        └──────────────────────────┘
```

### Container Deployment (Docker + Kubernetes)

```
┌──────────────────────────────────────────────┐
│          Kubernetes Cluster                   │
│                                               │
│  ┌────────────────────────────────────────┐  │
│  │  Ingress Controller (Nginx)            │  │
│  │  - Route requests                      │  │
│  │  - SSL/TLS                             │  │
│  └────────┬─────────────────────┬─────────┘  │
│           │                     │             │
│  ┌────────▼──┐         ┌────────▼──┐         │
│  │   Pod 1   │         │   Pod N   │         │
│  │ ┌────┐    │         │ ┌────┐    │         │
│  │ │App │    │         │ │App │    │         │
│  │ └────┘    │         │ └────┘    │         │
│  └───────────┘         └───────────┘         │
│                                               │
│  ┌────────────────────────────────────────┐  │
│  │  Services                              │  │
│  │  - ClusterIP (Internal)                │  │
│  │  - LoadBalancer (External)             │  │
│  └────────────────────────────────────────┘  │
│                                               │
│  ┌────────────────────────────────────────┐  │
│  │  Persistent Volume Claims              │  │
│  │  - Database storage                    │  │
│  │  - Logs                                │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘

Docker Build Steps:
docker build -t pocket-link:latest .
docker push registry/pocket-link:latest

K8s Deployment:
kubectl apply -f deployment.yaml
kubectl rollout status deployment/pocket-link
```

---

## Scalability Strategy

### Horizontal Scaling

```
Level 1: Single Instance (0-1M URLs)
┌──────────────────┐
│ App:    1 server │
│ DB:     Single   │
│ Cache:  Local    │
└──────────────────┘

Level 2: Multi-Instance (1M-10M URLs)
┌──────────────────────────────────┐
│ App:    3-5 servers (behind LB)  │
│ DB:     1 Master + 1 Replica     │
│ Cache:  Redis instance           │
└──────────────────────────────────┘

Level 3: Full Distributed (10M+ URLs)
┌────────────────────────────────────────┐
│ App:    10+ servers (K8s)              │
│ DB:     Sharded PostgreSQL             │
│ Cache:  Redis cluster (sharded)        │
│ Queue:  Message broker (Kafka)         │
│ CDN:    Global distribution            │
└────────────────────────────────────────┘
```

### Database Sharding

```
Shard by Short Code Range:

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Shard 1    │  │  Shard 2    │  │  Shard 3    │
│ a-k         │  │ l-p         │  │ q-z         │
│             │  │             │  │             │
│ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │
│ │ Master  │ │  │ │ Master  │ │  │ │ Master  │ │
│ └────┬────┘ │  │ └────┬────┘ │  │ └────┬────┘ │
│ ┌────▼────┐ │  │ ┌────▼────┐ │  │ ┌────▼────┐ │
│ │ Replica │ │  │ │ Replica │ │  │ │ Replica │ │
│ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │
└─────────────┘  └─────────────┘  └─────────────┘

Routing Query:
short_code = "abc123"
hash = MurmurHash(short_code)
shard_id = hash % 3
shard = shards[shard_id]
result = shard.query(short_code)
```

### Caching Strategy

```
Multi-Level Cache:

┌───────────────┐
│ User Browser  │ (1st level - Client cache)
└───────┬───────┘
        │
        ▼
┌─────────────────┐
│ CDN / Proxy     │ (2nd level - Edge cache)
└────────┬────────┘
         │
         ▼
┌────────────────────┐
│ Application Layer  │ (3rd level - App memory)
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Redis              │ (4th level - Fast cache)
│ TTL: 24 hours      │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Database           │ (5th level - Persistent store)
└────────────────────┘
```

---

## API Specifications

### Response Status Codes

| Code | Meaning           | Example                      |
| ---- | ----------------- | ---------------------------- |
| 200  | OK                | GET successful, URL resolved |
| 201  | Created           | POST /api/shorten success    |
| 204  | No Content        | Delete successful            |
| 400  | Bad Request       | Invalid URL format           |
| 401  | Unauthorized      | Missing auth token           |
| 403  | Forbidden         | User quota exceeded          |
| 404  | Not Found         | Short code doesn't exist     |
| 409  | Conflict          | Short code already taken     |
| 429  | Too Many Requests | Rate limited                 |
| 500  | Server Error      | Database error               |

### API Endpoints

#### 1. Create Short URL

```
POST /api/shorten
Content-Type: application/json

Request:
{
  "url": "https://example.com/very/long/path?param=value",
  "custom_alias": "mylink" (optional),
  "expires_in": 86400 (optional, seconds),
  "tags": ["tag1", "tag2"] (optional)
}

Response (201):
{
  "id": "123456",
  "short_code": "abc123",
  "short_url": "https://pocket-link/abc123",
  "long_url": "https://example.com/very/long/path?param=value",
  "created_at": "2026-02-27T10:30:00Z",
  "expires_at": "2026-02-28T10:30:00Z",
  "clicks": 0
}

Error (400):
{
  "error": "Invalid URL",
  "code": "INVALID_URL",
  "details": "URL must start with http:// or https://"
}
```

#### 2. Resolve Short URL

```
GET /[shortCode]

Behavior:
- Lookup short_code in database
- Record analytics
- Return HTTP 301 with Location header

Response Headers:
HTTP/1.1 301 Moved Permanently
Location: https://example.com/very/long/path
Cache-Control: public, max-age=3600
```

#### 3. Get URL Details

```
GET /api/urls/[shortCode]
Authorization: Bearer {token}

Response (200):
{
  "short_code": "abc123",
  "long_url": "https://example.com/very/long/path",
  "created_at": "2026-02-27T10:30:00Z",
  "expires_at": "2026-02-28T10:30:00Z",
  "is_active": true,
  "statistics": {
    "total_clicks": 125,
    "unique_clicks": 98,
    "last_accessed": "2026-02-27T15:45:00Z",
    "clicks_today": 25,
    "top_referrers": [
      { "referrer": "twitter.com", "count": 45 },
      { "referrer": "email", "count": 30 }
    ],
    "top_countries": [
      { "country": "US", "count": 60 },
      { "country": "UK", "count": 20 }
    ]
  }
}
```

#### 4. Update URL

```
PATCH /api/urls/[shortCode]
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "long_url": "https://new-example.com/path",
  "expires_at": "2026-03-01T10:30:00Z",
  "is_active": true
}

Response (200):
{
  "short_code": "abc123",
  "long_url": "https://new-example.com/path",
  "updated_at": "2026-02-27T16:00:00Z"
}
```

#### 5. Delete URL

```
DELETE /api/urls/[shortCode]
Authorization: Bearer {token}

Response (204 No Content)
```

#### 6. List My URLs

```
GET /api/urls?page=1&limit=50
Authorization: Bearer {token}

Response (200):
{
  "data": [
    {
      "short_code": "abc123",
      "long_url": "https://example.com/url1",
      "clicks": 125,
      "created_at": "2026-02-27T10:30:00Z"
    },
    ...
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 247,
    "pages": 5
  }
}
```

#### 7. Analytics

```
GET /api/analytics/[shortCode]?start_date=2026-02-01&end_date=2026-02-28
Authorization: Bearer {token}

Response (200):
{
  "short_code": "abc123",
  "period": {
    "start": "2026-02-01T00:00:00Z",
    "end": "2026-02-28T23:59:59Z"
  },
  "summary": {
    "total_clicks": 1250,
    "unique_visitors": 892,
    "bounce_rate": 0.15,
    "avg_visit_duration": 45
  },
  "daily_breakdown": [
    {
      "date": "2026-02-27",
      "clicks": 45,
      "unique_visitors": 32
    }
  ]
}
```

---

## Summary

**Pocket Link Architecture** provides:

1. **Scalability**: From single instance to distributed system
2. **Performance**: Multi-level caching and optimization
3. **Reliability**: Replication, failover, and monitoring
4. **Security**: Rate limiting, validation, and authentication
5. **Analytics**: Comprehensive tracking and reporting

---

**Last Updated:** February 27, 2026

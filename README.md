# Bulk URL Health Checker

A full-stack monorepo for bulk-checking URL health. Paste URLs or upload a CSV, and get real-time status updates with HTTP codes, response times, and page titles.

---

## Features

- **Bulk URL checking** — check hundreds of URLs concurrently
- **CSV upload** — drag-and-drop or file picker for CSV/text files
- **CSV export** — download results from any batch
- **Real-time updates** — SSE-powered live progress bar with shimmer animation
- **Retry failed** — re-queue failed URLs with one click
- **Cancel batches** — stop processing mid-batch
- **Multiple workers** — horizontal scaling via BullMQ job distribution
- **Redis caching** — batch list cached with 30s TTL
- **Idempotent processing** — safe against duplicate job execution
- **Production Docker** — multi-stage builds, non-root containers, replica workers

---

## Architecture

```
                          ┌─────────────────────────────────────────────┐
                          │                  Browser                    │
                          │                                             │
                          │  ┌───────────────────────────────────────┐  │
                          │  │            Next.js Frontend           │  │
                          │  │                                       │  │
                          │  │  /             → URL input + CSV      │  │
                          │  │  /batches      → batch list           │  │
                          │  │  /batches/:id  → live progress (SSE)  │  │
                          │  └──────────────────┬────────────────────┘  │
                          └─────────────────────┼───────────────────────┘
                                                │
                                    HTTP / SSE  │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Fastify API (:4000)                            │
│                                                                             │
│  POST /api/batches          → create batch + enqueue jobs                   │
│  GET  /api/batches          → list batches (Redis cached, 30s TTL)          │
│  GET  /api/batches/:id      → batch detail + urls                           │
│  POST /api/batches/:id/cancel     → cancel batch                            │
│  POST /api/batches/:id/retry-failed → re-queue failed URLs                  │
│  GET  /api/batches/:id/events → SSE stream (subscribe to Redis Pub/Sub)     │
│                                                                             │
│  ┌──────────┐   ┌──────────┐   ┌───────────┐    ┌────────────────────────┐  │
│  │  Routes  │──▶│Controller│──▶│  Service  │──▶ │ Pub/Sub (subscriber)   │  │
│  └──────────┘   └──────────┘   └─────┬─────┘    └───────────┬────────────┘  │
│                                      │                      │               │
│                                      ▼                      │               │
│                              ┌──────────────┐               │               │
│                              │  Queue.add() │               │               │
│                              └──────┬───────┘               │               │
└─────────────────────────────────────┼───────────────────────┼───────────────┘
                                      │                       │
                               enqueue│              subscribe│
                                      ▼                       │
┌─────────────────────────────────────────────────────────────┼───────────────┐
│                          Redis                              │               │
│                                                             │               │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐               │
│  │   Queue     │  │   Pub/Sub    │  │       Cache           │               │
│  │ (BullMQ)    │  │              │  │ (batch list, 30s TTL) │               │
│  │             │  │  channel:    │  │                       │               │
│  │  wait queue │  │  batch-events│  │                       │               │
│  │  active set │  │              │  │                       │               │
│  └──────┬──────┘  └───────▲──────┘  └───────────────────────┘               │
└─────────┼─────────────────┼─────────────────────────────────────────────────┘
          │                 │ publish
          │ pick up         │
          ▼                 │
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Worker × N  (BullMQ)                              │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  processCheckUrl(job)                                                 │  │
│  │                                                                       │  │
│  │  1. Check batch not cancelled                                         │  │
│  │  2. Mark url PROCESSING                                               │  │
│  │  3. fetch(url, { timeout: 10s }) → { status, responseTime, title }    │  │
│  │  4. Mark url SUCCESS or FAILED (retry 3x, exponential backoff)        │  │
│  │  5. Update batch progress (recount all url statuses)                  │  │
│  │  6. Publish event to Redis Pub/Sub                                    │  │
│  │                                                                       │  │
│  │  concurrency: 5  ·  rate limit: 10 jobs/sec  ·  attempts: 3           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────┬──────────────────────────────────┘
                                           │
                                    read/write
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PostgreSQL (:5432)                                 │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  batch                                                                │  │
│  │  ──────                                                               │  │
│  │  id (uuid PK)  ·  status (PENDING|RUNNING|COMPLETED|FAILED|CANCELLED) │  │
│  │  totalUrls  ·  completedUrls  ·  failedUrls  ·  cancelledUrls         │  │
│  │  createdAt  ·  updatedAt                                              │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  batchUrl                                                             │  │
│  │  ────────                                                             │  │
│  │  id (uuid PK)  ·  batchId (uuid FK → batch)  ·  url (text)            │  │
│  │  status (PENDING|QUEUED|PROCESSING|SUCCESS|FAILED|CANCELLED)          │  │
│  │  httpStatus (int?)  ·  responseTimeMs (int?)  ·  pageTitle (text?)    │  │
│  │  error (text?)  ·  attempts (int)  ·  createdAt  ·  updatedAt         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Data flow:**

```
User                    API                     Redis                   Worker                PostgreSQL
 │                       │                       │                       │                       │
 │  1. POST /batches     │                       │                       │                       │
 │  { urls: [...] }      │                       │                       │                       │
 ├──────────────────────▶│                       │                       │                       │
 │                       │  2. INSERT batch      │                       │                       │
 │                       │     + batchUrl rows   │                       │                       │
 │                       ├──────────────────────────────────────────────────────────────────────▶│
 │                       │                       │                       │                       │
 │                       │  3. queue.add()       │                       │                       │
 │                       │     for each url      │                       │                       │
 │                       ├──────────────────────▶│                       │                       │
 │                       │                       │                       │                       │
 │  4. { id: batchId }   │                       │                       │                       │
 │◀──────────────────────┤                       │                       │                       │
 │                       │                       │                       │                       │
 │                       │                       │  5. worker picks job  │                       │
 │                       │                       ├──────────────────────▶│                       │
 │                       │                       │                       │                       │
 │                       │                       │                       │  6. UPDATE url status │
 │                       │                       │                       ├──────────────────────▶│
 │                       │                       │                       │                       │
 │                       │                       │  7. publish event     │                       │
 │                       │                       │◀──────────────────────┤                       │
 │                       │                       │                       │                       │
 │  8. SSE event         │                       │                       │                       │
 │  (via subscriber)     │                       │                       │                       │
 │◀──────────────────────┤◀──────────────────────┤                       │                       │
 │                       │                       │                       │                       │
 │  9. GET /batches/:id  │                       │                       │                       │
 ├──────────────────────▶│                       │                       │                       │
 │                       │  10. SELECT batch     │                       │                       │
 │                       ├──────────────────────────────────────────────────────────────────────▶│
 │                       │                       │                       │                       │
 │  11. batch + urls     │                       │                       │                       │
 │◀──────────────────────┤                       │                       │                       │
 │                       │                       │                       │                       │
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16, Ant Design | UI with neobrutalist styling |
| Real-time | Server-Sent Events | Live progress updates |
| API | Fastify 5 | REST endpoints, CORS, SSE |
| Worker | BullMQ, Cheerio | Job processing, HTML parsing |
| Database | PostgreSQL 16 | Batch and URL storage |
| ORM | Prisma v8 (`@prisma/orm-postgres`) | Type-safe database access |
| Queue | Redis 7 + BullMQ | Job queuing with retries |
| Cache | Redis (ioredis) | Batch list caching |
| Infra | Docker, Turborepo | Containerization, monorepo |

---

## Project Structure

```
bulk-url-checker/
├── apps/
│   ├── api/                    # Fastify REST API
│   │   └── src/
│   │       ├── config/         # Environment config
│   │       ├── controllers/    # Route handlers
│   │       ├── plugins/        # Prisma plugin
│   │       ├── routes/         # Route definitions
│   │       └── services/       # Business logic, cache, pubsub, queue
│   ├── worker/                 # BullMQ job processor
│   │   └── src/
│   │       ├── config/         # Environment config
│   │       ├── processors/     # Job handlers
│   │       └── services/       # URL checker, state management, events
│   └── web/                    # Next.js frontend
│       └── app/
│           ├── page.tsx                # Home: URL input + CSV upload
│           ├── batches/page.tsx        # Batch list
│           └── batches/[id]/
│               ├── page.tsx            # Server-side data fetch
│               └── BatchClient.tsx     # SSE + interactive UI
├── packages/
│   └── db/                     # Prisma v8 ORM + contract schema
├── docker/                     # Dockerfiles (api, worker, web)
├── docker-compose.yml          # Development compose
├── docker-compose.prod.yml     # Production compose (3 worker replicas)
└── turbo.json                  # Turborepo task config
```

---

## Running Locally

### Prerequisites

- Node.js >= 24
- PostgreSQL 16
- Redis 7
- npm

### Quick Start

```bash
# Clone and install
git clone <repo-url> && cd bulk-url-checker
npm install

# Start infrastructure
docker compose up -d postgres redis

# Set up database
cp .env.example .env
cd packages/db
npx prisma db update --confirm urlchecker
cd ../..

# Start all services (API + Worker + Web)
npm run dev
```

- **Web:** http://localhost:3000
- **API:** http://localhost:4000
- **Health:** http://localhost:4000/health

### Individual Services

```bash
# API only
cd apps/api && npm run dev

# Worker only
cd apps/worker && npm run dev

# Web only
cd apps/web && npm run dev
```

### Docker

```bash
# Build and start everything
docker compose up -d --build

# View logs
docker compose logs -f

# Stop
docker compose down
```

### Production (Multiple Workers)

```bash
# Start with 3 worker replicas
docker compose -f docker-compose.prod.yml up -d --build

# Scale workers on the fly
docker compose up -d --scale worker=5

# Check running containers
docker compose ps
```

---

## Environment Variables

| Variable | Default | Used By | Description |
|----------|---------|---------|-------------|
| `DATABASE_URL` | — | API, Worker | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | API, Worker | Redis connection string |
| `CORS_ORIGIN` | `http://localhost:3000` | API | Allowed CORS origin for the frontend |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Web | API URL for client-side requests |

---

## Database

### Schema

Two tables via Prisma v8 contract system:

**`batch`** — tracks a group of URL checks

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `status` | Enum | `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED` |
| `totalUrls` | Int | Total URLs in batch |
| `completedUrls` | Int | Successfully checked |
| `failedUrls` | Int | Failed after all retries |
| `cancelledUrls` | Int | Cancelled by user |
| `createdAt` | Timestamptz | Creation timestamp |
| `updatedAt` | Timestamptz | Last update timestamp |

**`batchUrl`** — individual URL check results

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `batchId` | UUID | Foreign key to `batch` |
| `url` | Text | URL to check |
| `status` | Enum | `PENDING`, `QUEUED`, `PROCESSING`, `SUCCESS`, `FAILED`, `CANCELLED` |
| `httpStatus` | Int? | HTTP response code |
| `responseTimeMs` | Int? | Response time in milliseconds |
| `pageTitle` | Text? | Extracted `<title>` tag |
| `error` | Text? | Error message if failed |
| `attempts` | Int | Number of processing attempts |

### Migrations

```bash
cd packages/db
npx prisma contract emit          # Regenerate contract after schema changes
npx prisma db update --confirm urlchecker  # Apply schema changes to database
```

---

## Background Processing

### Job Lifecycle

```
PENDING → QUEUED → PROCESSING → SUCCESS
                              → FAILED (after 3 attempts)
         QUEUED → PROCESSING → CANCELLED (if batch cancelled)
```

1. **Enqueue:** API creates `BatchUrl` rows with status `PENDING`, then adds BullMQ jobs
2. **Pick up:** Worker picks up job, marks URL as `PROCESSING`
3. **Check:** Worker fetches URL with 10s timeout, extracts HTTP status + page title
4. **Complete:** Worker marks URL as `SUCCESS` or `FAILED`, updates batch progress
5. **Publish:** Worker publishes event to Redis Pub/Sub, API forwards via SSE

### URL Checker

- Uses `fetch()` with `AbortSignal.timeout(10_000)` (10 second timeout)
- Follows redirects automatically (`redirect: "follow"`)
- Extracts page title via Cheerio HTML parser
- Throws `HttpError` for 5xx responses (triggers retry)
- Returns `{ status, responseTimeMs, pageTitle, finalUrl }`

---

## Rate Limiting

BullMQ worker-level rate limiter:

```typescript
limiter: {
  max: 10,        // max 10 jobs
  duration: 1000, // per 1 second
}
```

This prevents overwhelming target servers. Each worker processes up to 10 URLs/second. With 3 workers, the system handles up to 30 URLs/second.

---

## Concurrency

Each worker processes **5 jobs concurrently** (`concurrency: 5`). With N workers:

| Workers | Concurrent Jobs | Max URLs/sec |
|---------|----------------|--------------|
| 1 | 5 | 10 |
| 3 | 15 | 30 |
| 5 | 25 | 50 |

BullMQ distributes jobs round-robin across workers automatically. No configuration needed — just add more worker instances.

---

## Retries

- **3 attempts** per URL
- **Exponential backoff:** 1s → 2s → 4s delay between retries
- **Retryable errors:** network errors, timeouts, 5xx status codes
- **Non-retryable errors:** 4xx client errors (handled on final attempt)

```typescript
{
  attempts: 3,
  backoff: { type: "exponential", delay: 1000 }
}
```

After all retries exhaust, the URL is marked `FAILED` in the database. Users can manually retry via the "Retry Failed" button.

---

## Idempotency

Every state transition checks the current status before updating:

```typescript
// Won't overwrite a terminal state
if (item.status === "SUCCESS" || item.status === "FAILED" || item.status === "CANCELLED") return;
```

This prevents:
- Race conditions between concurrent workers
- Duplicate processing from BullMQ retries
- Stale writes overwriting newer results

Job IDs are deterministic (`check-url-{uuid}`) so BullMQ won't create duplicates for the same URL.

---

## Cancellation

When a user cancels a batch:

1. Batch status is set to `CANCELLED`
2. All `PENDING` and `QUEUED` URLs are marked `CANCELLED`
3. BullMQ jobs are removed from the queue
4. In-progress jobs check `isBatchCancelled()` before writing results

The check happens both before and after the HTTP request:

```typescript
if (await isBatchCancelled(batchId)) {
  await markCancelled(batchUrlId);
  return;
}
```

---

## Live Updates

### Server-Sent Events (SSE)

1. Frontend opens `EventSource` to `GET /api/batches/:id/events`
2. API sends `connected` event immediately
3. API subscribes to Redis channel `batch-events`
4. When a worker publishes an update, API forwards it to connected clients
5. Frontend calls `fetchLatest()` on each event to re-render

### Keepalive

SSE connections send a `:keepalive\n\n` comment every 15 seconds to prevent proxy/browser timeouts.

### Frontend Indicators

- **Progress bar** with shimmer animation during processing
- **Pulsing blue dot** next to status when batch is active
- **Live/Reconnecting** indicator showing SSE connection state

---

## Caching

Redis cache for `GET /api/batches`:

- **Key:** `cache:batches:list`
- **TTL:** 30 seconds
- **Invalidation:** on batch create, cancel, or retry

```typescript
const cached = await redis.get("cache:batches:list");
if (cached) return JSON.parse(cached);

const batches = await Batch.orderBy(m => m.createdAt.desc()).all();
await redis.set("cache:batches:list", JSON.stringify(batches), "EX", 30);
```

Individual batch fetches (`GET /api/batches/:id`) are not cached — they always hit the database to ensure fresh URL statuses.

---

## Horizontal Scaling

### Adding Workers

```bash
# Docker Compose
docker compose up -d --scale worker=5

# Or edit docker-compose.prod.yml
worker:
  deploy:
    replicas: 5
```

BullMQ automatically distributes jobs across all connected workers. No code changes needed.

### Worker Isolation

Each worker:
- Has its own PostgreSQL connection
- Has its own Redis connection
- Processes jobs independently
- Can be restarted/crashed without affecting others

### What Scales

| Component | Scaling Method |
|-----------|---------------|
| Workers | Add replicas (BullMQ handles distribution) |
| API | Add replicas behind a load balancer |
| PostgreSQL | Vertical scaling (single writer) |
| Redis | Vertical scaling (single instance for queue + cache) |

---

## Tradeoffs

### What was chosen

- **Prisma v8 ORM** over `@prisma/client` — contract-based system with lazy Proxy collections, but immature types require `(model as any)` casts for some operations
- **SSE over WebSocket** — simpler, auto-reconnects, no connection management needed. Sufficient for unidirectional server→client updates
- **Redis for both queue and cache** — single dependency, but cache invalidation is manual and TTL-based
- **BullMQ over custom queue** — battle-tested, handles retries/backoff/concurrency/distribution out of the box
- **Cheerio for HTML parsing** — lightweight, no browser needed, extracts `<title>` tag only
- **10s timeout per URL** — balances between slow sites and overall batch speed

### Known limitations

- **Single PostgreSQL writer** — no read replicas or horizontal DB scaling
- **No authentication** — anyone can create/cancel batches
- **CSV parser is simple** — handles basic `url` column detection but not complex quoted fields
- **No deduplication across batches** — same URL can be checked in multiple batches
- **Cache invalidation is coarse** — full cache clear on any batch mutation
- **No persistent SSE history** — if client disconnects, events during disconnect are lost

---


# mirtech_assessment

**Author**: Mushary Rilwan

A high-performance full-stack data table handling 100,000+ records with sub-100ms API responses (46–142ms cold cache, ~10ms warm cache), virtual scrolling, and instant filtering.

## Tech Stack

| Layer          | Technology                   |
| -------------- | ---------------------------- |
| Backend        | FastAPI + SQLAlchemy (async) |
| Database       | PostgreSQL 16                |
| Cache          | Redis 7                      |
| Frontend       | Next.js 16 + TypeScript      |
| Table          | TanStack Table v8            |
| Virtual Scroll | TanStack Virtual v3          |
| Data Fetching  | TanStack Query v5            |
| Styling        | Tailwind CSS v4 + shadcn/ui  |
| Deployment     | Docker Compose               |

---

## Setup

### Prerequisites

- Docker Desktop
- Docker Compose v2

### Run

```bash
git clone https://github.com/Mushary19/mirtech_assessment.git
cd mirtech_assessment
docker compose up --build
```

That's it. On first boot the backend automatically seeds 100,000 orders, 1,000 users, and 500 products into PostgreSQL before starting the API server. This takes approximately 2-3 minutes.

| Service     | URL                        |
| ----------- | -------------------------- |
| Frontend    | http://localhost:3000      |
| Backend API | http://localhost:8000      |
| API Docs    | http://localhost:8000/docs |

### Stopping

```bash
docker compose down          # keep data
docker compose down -v       # remove data and re-seed on next boot
```

---

## API Reference

### List Orders

```
GET /api/orders
```

| Parameter    | Type    | Description                                                   |
| ------------ | ------- | ------------------------------------------------------------- |
| `cursor`     | string  | Base64 encoded pagination cursor                              |
| `limit`      | integer | Rows per page (1-100, default 50)                             |
| `status`     | string  | Filter by: pending, processing, shipped, delivered, cancelled |
| `search`     | string  | Search customer name, email, or product name                  |
| `sort_by`    | string  | Field: id, created_at, total_amount, quantity, status         |
| `sort_dir`   | string  | asc or desc                                                   |
| `min_amount` | float   | Minimum order total                                           |
| `max_amount` | float   | Maximum order total                                           |

**Response**

```json
{
  "data": [...],
  "next_cursor": "eyJ2YWwiOiAi...",
  "has_next": true,
  "total": 100000
}
```

### Get Order

```
GET /api/orders/{id}
```

### Get Stats

```
GET /api/orders/meta
```

---

## Performance Optimization Techniques

### Backend

**Cursor-based pagination** instead of offset pagination. Offset pagination requires PostgreSQL to scan and discard N rows to reach page N. With 100k records, `OFFSET 50000` is noticeably slow. Cursor pagination uses a compound `(sort_column, id)` index seek — the query is O(log n) regardless of how deep into the dataset you are.

**Composite indexes** on the orders table targeting the most common query patterns:

```sql
idx_orders_status_id      (status, id)
idx_orders_created_at_id  (created_at, id)
idx_orders_amount_id      (total_amount, id)
```

The compound indexes serve double duty — they filter and provide the cursor seek in a single index scan.

**Redis caching** with tiered TTLs:

| Endpoint      | TTL    | Reason                                 |
| ------------- | ------ | -------------------------------------- |
| `/meta` stats | 5 min  | Expensive aggregation, changes rarely  |
| Order detail  | 10 min | Immutable once created                 |
| List queries  | 30 sec | Short TTL, high cardinality cache keys |
| Count queries | 60 sec | Expensive, tolerable staleness         |

**Async SQLAlchemy** with a connection pool of 20 connections handles concurrent requests without blocking. `selectinload` is used for eager loading user and product relations, avoiding N+1 queries.

**Bulk seeding** inserts records in batches of 2,000 using raw SQL `executemany`, seeding 100k orders in under 60 seconds.

### Observed Response Times

| Scenario                        | Response Time |
| ------------------------------- | ------------- |
| Cached list query (Redis hit)   | 36–89ms       |
| Cold list query (first request) | 88–142ms      |
| Heavy filter + search (cold)    | up to 319ms   |
| Order detail (cached)           | ~10ms         |
| /meta stats (cached)            | ~5ms          |

The outliers (142–319ms) occur on cold cache requests with search enabled. Search uses a `LIKE` query with a join across three tables — this cannot use a B-tree index and requires a partial sequential scan. This is the known limitation addressed in the improvement section below.

### Frontend

**Virtual scrolling** via TanStack Virtual renders only the rows visible in the viewport (approximately 15-20 rows) regardless of how many records are loaded. The DOM size stays constant while scrolling through thousands of records.

**Infinite query with cursor pagination** via TanStack Query's `useInfiniteQuery` fetches the next page automatically when the user scrolls within 10 rows of the currently loaded data. Pages accumulate in memory and are flattened into a single array for the virtualizer.

**Client-side query caching** with a 30-second stale time matches the backend Redis TTL, preventing redundant API calls for recently fetched pages.

**Debounced search** waits 300ms after the user stops typing before firing an API request, preventing unnecessary requests on every keystroke.

**`tabular-nums` font variant** on numeric columns prevents layout shift as numbers change during filtering and sorting.

---

## Architecture Decisions

**Why cursor pagination over offset?** The performance requirement is <100ms for all responses. Offset pagination cannot guarantee this at arbitrary page depths with 100k+ rows. Cursor pagination provides consistent performance regardless of dataset position. The trade-off is that arbitrary page jumping is not supported — users scroll continuously, which matches the virtual scrolling UX pattern anyway.

**Why three tables instead of one flat table?** A denormalized single table would be simpler but architecturally dishonest. Normalizing into users, products, and orders allows realistic join queries that actually stress the database, making the performance optimizations meaningful. It also produces a more realistic dataset with proper relational integrity.

**Why TanStack Table + TanStack Virtual together?** They share the same author and mental model. TanStack Table manages column definitions, row models, and sorting state. TanStack Virtual manages DOM virtualization. They are intentionally designed to compose — TanStack Table exposes `getRowModel().rows` which maps directly to TanStack Virtual's item count and index-based rendering.

**Why Next.js rewrites for API proxying?** The frontend proxies `/api/*` requests to the backend via Next.js `rewrites` in `next.config.js`. This avoids CORS issues in production, keeps the API URL consistent regardless of environment, and means the frontend only ever speaks to one origin.

**Why Redis over in-memory caching?** In-memory cache lives in the FastAPI process. Redis survives process restarts, is shared across multiple backend instances if scaled horizontally, and provides atomic operations. For this scale it is overkill, but it reflects production-grade thinking.

---

## UI/UX Considerations

**Status filter as toggle buttons** rather than a dropdown. With only 5 statuses, toggle buttons allow the user to see all options at a glance and switch between them in one click instead of two.

**Debounced search** provides instant feedback without hammering the API. The input is uncontrolled (`defaultValue` + `ref`) to avoid React re-renders on every keystroke, while the debounced callback handles the actual state update.

**Amount filter is hidden by default** behind a toggle to keep the filter bar clean. Most users filter by status or search — amount range is a power-user feature.

**Row click navigates to detail page** — the entire row is clickable, not just a small "View" button, reducing the click target precision required.

**Loading states at two levels** — a full-page spinner on initial load, and an inline spinner in the table footer when fetching subsequent pages, so the user always knows when data is being loaded without blocking interaction.

**Monospaced font for Order IDs** and `tabular-nums` for amounts and quantities prevents layout jitter as values change.

---

## What I Would Improve With More Time

The current search implementation performs a `LIKE '%query%'` on the database, which cannot use standard B-tree indexes and requires a sequential scan on joined columns. With more time I would implement PostgreSQL full-text search using `tsvector` and `tsquery` with a GIN index on a generated column combining user name, email, and product name. This would make search both faster and more capable — supporting partial word matching, ranking by relevance, and stemming.

The frontend sort state is currently communicated from TanStack Table column headers to the parent page via a `CustomEvent` on `window`. This works but is an unconventional pattern that bypasses React's data flow. With more time I would lift the sort state into a proper React context or use a lightweight state manager like Zustand, making the data flow explicit and easier to reason about. I would also add URL-based filter state using `useSearchParams` so that filtered views are shareable via URL and survive page refreshes.

# Performance Audit: OpenSaaS Webchat Widget App

**Date:** 2026-06-30
**Scope:** Frontend (React/Vite), Backend (Node/Prisma/PostgreSQL), AI pipeline, Widget SDK

---

## Severity Definitions

| Level | Definition |
|---|---|
| **Critical** | Will cause severe performance degradation or outages in production |
| **High** | Significant performance bottleneck under moderate load (>100 concurrent users) |
| **Medium** | Performance concern that should be addressed for scalability |
| **Low** | Minor optimization opportunity |

---

## 1. Frontend Performance

### 1.1 Bundle Size & Code Splitting

| ID | Issue | Location | Severity | Detail |
|---|---|---|---|---|
| **FE-01** | **No code splitting** | `vite.config.ts` | **High** | Vite config has no `manualChunks`, `rollupOptions`, or code splitting. The entire React app (all 42+ pages, ApexCharts, all Radix components, lucide-react icons) loads in a single bundle. No route-based lazy loading. |
| **FE-02** | **No `React.lazy()` anywhere** | All `src/` files | **High** | None of the 42+ page components use `React.lazy()` or dynamic imports. All pages are eagerly imported and bundled. The initial load includes the admin dashboard, all app pages, docs, marketing pages, etc. even though the user will only visit 2-3 routes. |
| **FE-03** | **`lucide-react` fully bundled** | `package.json:34` | **Medium** | `lucide-react` v0.525.0 imports all icons eagerly. For a 42-page app using dozens of icons, this adds significant weight to the initial bundle. Should use tree-shakeable imports. |
| **FE-04** | **`apexcharts` + `react-apexcharts` bundled** | `package.json:30-31` | **Medium** | Charts library loaded even on pages that don't use charts (most pages). Should be lazily loaded on analytics/admin pages only. |
| **FE-05** | **10 Radix UI packages bundled eagerly** | `package.json:16-27` | **Low** | All Radix primitives loaded upfront. Most pages use 1-2. Could benefit from code splitting. |
| **FE-06** | **Tailwind CSS v4 with full config** | `vite.config.ts:1` | **Low** | Tailwind v4 with `@tailwindcss/forms`, `@tailwindcss/typography`, `tailwindcss-animate` — generates a large CSS bundle. Tailwind v4 is better at tree-shaking unused styles but still significant. |

### 1.2 Rendering & React Optimization

| ID | Issue | Location | Severity | Detail |
|---|---|---|---|---|
| **FE-07** | **`useMemo` overuse in App.tsx** | `src/client/App.tsx:19-44` | **Low** | 4 separate `useMemo` hooks for trivial boolean checks (`isMarketingPage`, `shouldDisplayAppNavBar`, `isAppDashboard`, `isAdminDashboard`). These are simple string comparisons — `useMemo` adds more overhead than it saves. Could be plain `const` or inline. |
| **FE-08** | **`memo()` used sparingly** | `src/app/dashboard/DashboardPage.tsx:227` | **Medium** | Only 4 components use `React.memo()`: `StatCard`, `MiniChart`, `BarChartComponent`, `AppLayout`. Most page components and list renders are not memoized. Under frequent re-renders (e.g., polling widget messages), this causes unnecessary VDOM diffs. |
| **FE-09** | **No virtualization for lists** | All list pages | **High** | `getLeads`, `getConversations`, `getConversationsInbox`, `getKnowledgeDocuments` all render lists without windowing/virtualization. Loading 1000 leads renders 1000 DOM nodes. No `react-window` or `react-virtuoso` used. |
| **FE-10** | **`useCallback` on async handlers — missing deps risk** | Multiple files | **Low** | Several `useCallback` hooks wrap async functions with stale closures (e.g., `TriggersPage.tsx:44`). Deps arrays may miss state variables, causing stale reads. |

### 1.3 Hydration & Loading

| ID | Issue | Location | Severity | Detail |
|---|---|---|---|---|
| **FE-11** | **No Suspense boundaries** | All `src/` files | **Medium** | Zero `<Suspense>` or `<SuspenseList>` usage. No fallback UI for loading states at the route level. Each page handles its own loading state independently (with `if (isLoading)` checks). |
| **FE-12** | **No route-level prefetching** | `main.wasp.ts` | **Medium** | Wasp supports route prefetching but none are configured. Users wait for full page loads on navigation. |

### 1.4 Widget SDK Performance

| ID | Issue | Location | Severity | Detail |
|---|---|---|---|---|
| **FE-13** | **Widget polls every 2 seconds** | `src/widget/widget.ts:90-101` | **Medium** | `pollMessages()` fetches `GET /api/widget/messages/:conversationId` every 2 seconds while the widget is open. For 1000 concurrent widget users, this creates 500 requests/second constant polling traffic. Consider WebSocket or SSE for real-time updates. |
| **FE-14** | **Widget SDK rebuilds DOM on every poll** | `src/widget/widget.ts:410-440` | **Low** | `addMessage()` queries the DOM with `querySelector` on every poll cycle to check for existing messages. For conversations with 50+ messages, this is 50 DOM queries per poll cycle. |
| **FE-15** | **Widget inline CSS (Shadow DOM) — large style block** | `src/widget/widget.ts:153-399` | **Low** | ~250 lines of CSS injected as a `<style>` tag. While isolated, it's parsed on every widget load. Could pre-parse or cache. |

---

## 2. Backend Performance

### 2.1 Database Indexes

| ID | Issue | Location | Severity | Detail |
|---|---|---|---|---|
| **DB-01** | **Missing index on `Conversation.lastMessageAt`** | `schema.prisma` | **Critical** | `getConversationsInbox` (operations.ts:798) orders by `lastMessageAt DESC`. No index on this field causes a sort on disk for large orgs. Add `@@index([organizationId, lastMessageAt])`. |
| **DB-02** | **Missing index on `Conversation.visitorId`** | `schema.prisma` | **High** | `getConversationDetail` (operations.ts:863-872) fetches visitor conversation history by `visitorId`. Used in analytics to count distinct visitors (in-memory, operations.ts:1311). |
| **DB-03** | **Missing index on `Conversation.websiteId`** | `schema.prisma` | **High** | `widgetGetConfig` and `widgetInit` join through Website. No index on `websiteId` for conversations table. |
| **DB-04** | **Missing index on `User.subscriptionStatus`** | `schema.prisma` | **High** | `calculateDailyStats` hourly job (stats.ts:41) does `User.count({ where: { subscriptionStatus: Active } })` — full table scan for every job run. |
| **DB-05** | **Missing composite index on `Message[conversationId, status, createdAt]`** | `schema.prisma` | **Medium** | `generateAiResponse` (generate.ts:91-96) queries "last 20 completed messages" by `conversationId`, `status: "completed"`, ordered by `createdAt DESC`. No index. |
| **DB-06** | **Missing full-text search index on `DocumentChunk.content`** | `schema.prisma` | **Critical** | RAG (rag.ts:37-61) loads ALL chunks into memory and token-matches. Without PostgreSQL `tsvector` or embedding index, this is O(N) memory scans on every AI message. |

### 2.2 N+1 Queries & Missing Pagination

| ID | Issue | Location | Severity | Detail |
|---|---|---|---|---|
| **N1-01** | **`getLeads` fetches ALL conversations for EVERY lead** | `operations.ts:1098-1125` | **Critical** | `getLeads` loads all leads for org, then for each lead includes ALL conversations with message counts. An org with 500 leads × 100 conversations each = 50,000 rows loaded. No pagination. |
| **N1-02** | **`getWebsites` has no pagination** | `operations.ts:552-573` | **High** | Fetches ALL websites for the org. Unlimited. |
| **N1-03** | **`getConversations` has no pagination** | `operations.ts:702-722` | **High** | Fetches ALL conversations for the org. Unlimited. |
| **N1-04** | **`getAnalyticsData` counts visitors in-memory** | `operations.ts:1294-1311` | **High** | Fetches ALL conversations for 30 days, then creates a `Set` of visitor IDs in JavaScript. For 50K conversations, this is 50K rows transferred + Set iteration. A SQL `COUNT(DISTINCT visitorId)` would be 1 row. |
| **N1-05** | **`getConversationDetail` N+1 for visitor history** | `operations.ts:863-872` | **Medium** | For visitor history, fetches conversations with `_count: { select: { messages: true } }` — this triggers N subqueries. |
| **N1-06** | **`getDashboardStats` uses 7 parallel queries** | `operations.ts:1220-1252` | **Medium** | 7 independent Prisma queries via `Promise.all`. While parallel, each is a separate DB round-trip. Could be batched with `$transaction` for coalescing. |

### 2.3 AI Pipeline Performance

| ID | Issue | Location | Severity | Detail |
|---|---|---|---|---|
| **AI-01** | **RAG loads ALL chunks into memory before scoring** | `rag.ts:37-61` | **Critical** | `retrieveRelevantChunks` loads **every chunk** for every document in every knowledge base linked to an agent. For a KB with 1000 documents × 50 chunks = 50,000 rows, ALL are loaded into Node.js memory before the simple token-matching filter runs. The `maxChunks: 5` param only limits the return, not the load. |
| **AI-02** | **Token limit check runs on every AI message** | `generate.ts:117-121` | **High** | `prisma.aiUsage.aggregate()` is called on every `widgetSendMessage` request. This aggregates ALL usage for the org month-to-date. For high-traffic orgs, this adds 50-200ms latency per message. Consider caching monthly token count with 30-60s TTL. |
| **AI-03** | **`trackUsage` does findFirst + conditional write instead of upsert** | `generate.ts:273-301` | **Medium** | Classic upsert pattern done in two round trips. Use `prisma.aiUsage.upsert()` with the `@@unique([organizationId, date, model])` constraint. |
| **AI-04** | **Streaming flush debounce race condition** | `generate.ts:186-208` | **Medium** | Last ~500ms of streaming content may not be flushed before the final update. If the stream ends between a debounced `setTimeout` and the final flush check, the last partial content is lost. |
| **AI-05** | **Streaming flushes every 500ms (high DB write frequency)** | `generate.ts:170-176` | **Low** | For a 2000-token response at ~50 chars/s, this means 20+ DB writes. Reduce to 1-2 second flush intervals. |

### 2.4 Widget API Performance

| ID | Issue | Location | Severity | Detail |
|---|---|---|---|---|
| **WIDGET-P-01** | **`widgetInit` does 5+ sequential DB writes** | `widget/api.ts:142-196` | **High** | Upsert visitor, find website, find org, count conversations, create conversation, create message, update conversation — all sequential. No parallelization or batching. |
| **WIDGET-P-02** | **`widgetSendMessage` does 3 sequential DB ops before AI** | `widget/api.ts:237-245` | **High** | Find conversation, create message, update conversation — all serial before the AI generation starts. Adds ~20-50ms latency to every message. |
| **WIDGET-P-03** | **Domain verification is an extra DB query** | `widget/api.ts:58-65` | **Medium** | `verifyConversationDomain()` does a `findUnique` with `include: { website: true }`. Called on every widget API request (init, message, poll, handoff, typing). Could be merged with the main query or cached. |
| **WIDGET-P-04** | **Rate limiter is in-memory only** | `widget/api.ts:8-20` | **High** | Resets on server restart. Doesn't work across instances. In serverless, rate limiting is effectively disabled. |

### 2.5 Analytics Job Performance

| ID | Issue | Location | Severity | Detail |
|---|---|---|---|---|
| **JOB-01** | **Hourly job does full table scans** | `analytics/stats.ts:37-44` | **High** | `User.count({})` and `User.count({ where: { subscriptionStatus } })` are full table scans. For 100K users, this is expensive every hour. |
| **JOB-02** | **PageViewSource upsert loop (N+1)** | `analytics/stats.ts:96-118` | **Medium** | For each analytics source (e.g., 20 sources), does a separate upsert. Use batch upsert or `createMany` with `skipDuplicates`. |
| **JOB-03** | **No transaction wrapping** | `analytics/stats.ts:121-129` | **Medium** | If the job fails after creating DailyStats but before upserting PageViewSources, stats are inconsistent. Wrap in `$transaction`. |

---

## 3. Caching

| ID | Issue | Location | Severity | Detail |
|---|---|---|---|---|
| **CACHE-01** | **No Redis or external cache** | App-wide | **High** | Zero caching infrastructure. Every request hits the database. No caching for: org settings (fetched on every widget API call), token limits (aggregated on every message), website configs, or user memberships. |
| **CACHE-02** | **`getOrCreateUserOrg` hits DB on EVERY operation** | `operations.ts:67-93` | **High** | Every single operation calls `assertUserAndOrg()` → `getOrCreateUserOrg()` → `findFirst` on `OrganizationMember`. A dashboard loading 10 queries makes 10 extra DB reads. No per-request caching. |
| **CACHE-03** | **No CDN or edge caching for widget SDK** | Deploy config | **Medium** | `widget/widget.js` is served from the app server. This embeddable script is loaded on every customer website page view. Should be served from a CDN with aggressive caching (`Cache-Control: public, max-age=31536000, immutable`). |
| **CACHE-04** | **No HTTP caching headers on API responses** | `widget/api.ts` | **Medium** | Widget API responses (config, messages, typing) have no `Cache-Control` headers. Even semi-static data like widget config could be cached for a few seconds. |
| **CACHE-05** | **Org branding/config fetched on every widget init** | `widget/api.ts:91-93` | **Low** | Extra DB query on each widget init. Could be included in the initial website query. |

---

## 4. Memory & State

| ID | Issue | Location | Severity | Detail |
|---|---|---|---|---|
| **MEM-01** | **In-memory typing store doesn't scale** | `operations.ts:1062-1093` | **Medium** | `Map<string, { isTyping, expiresAt }>` is per-process. Multi-instance deployments have inconsistent typing indicators. |
| **MEM-02** | **RAG loads full chunk content** | `rag.ts:37-61` | **Critical** | See AI-01. For a KB with 50K chunks at ~500 chars each = ~25MB loaded into Node.js heap on every AI request. Memory grows linearly with KB size. |
| **MEM-03** | **Rate limit Map unbounded** | `widget/api.ts:8-20` | **Low** | The `RATE_LIMITS` Map has no upper bound or eviction strategy. Under sustained attack, entries accumulate until server restart. |

---

## 5. Connection & Network

| ID | Issue | Location | Severity | Detail |
|---|---|---|---|---|
| **NET-01** | **No connection pooling for fetch** | `operations.ts:1631` | **Low** | `crawlUrl` and `crawlWebsite` use the global `fetch` with no connection reuse. Each URL crawl creates a new connection. |
| **NET-02** | **Sequential URL crawling** | `operations.ts:1795-1809` | **Medium** | `crawlWebsite` crawls URLs one by one. For 20 pages at ~500ms each = 10 seconds. Could use `Promise.allSettled` with concurrency limit (e.g., 5 parallel). |

---

## 6. Summary & Prioritized Recommendations

### By Category

| Category | Critical | High | Medium | Low |
|---|---|---|---|---|
| Frontend | 0 | 2 | 5 | 4 |
| Database Indexes | 2 | 3 | 1 | 0 |
| N+1 & Pagination | 1 | 3 | 2 | 0 |
| AI Pipeline | 1 | 1 | 2 | 1 |
| Widget API | 0 | 3 | 2 | 0 |
| Analytics Job | 0 | 1 | 2 | 0 |
| Caching | 0 | 3 | 2 | 1 |
| Memory & State | 1 | 0 | 1 | 1 |
| Connection & Network | 0 | 0 | 1 | 1 |
| **Total** | **5** | **16** | **18** | **8** |

### Top 10 Actions (by impact)

| Priority | ID | Action | Expected Gain |
|---|---|---|---|
| 1 | **DB-06 / AI-01** | Replace in-memory RAG with PostgreSQL `tsvector` or embedding search | 100-1000x faster RAG, eliminates OOM risk |
| 2 | **DB-01** | Add `@@index([organizationId, lastMessageAt])` on Conversation | Eliminates sort on disk for inbox |
| 3 | **N1-01** | Add pagination to `getLeads`, `getWebsites`, `getConversations` | Prevents browser OOM for large orgs |
| 4 | **AI-02** | Cache monthly token count with 60s TTL | Saves aggregation query on every message |
| 5 | **CACHE-02** | Add per-request cache for `getOrCreateUserOrg` | Eliminates N extra DB reads per page load |
| 6 | **FE-01 / FE-02** | Add `React.lazy()` + Suspense for route-level code splitting | Reduces initial bundle by 60-80% |
| 7 | **DB-04** | Add `@@index([subscriptionStatus])` on User | Fixes full table scan in hourly job |
| 8 | **WIDGET-P-01** | Parallelize widget init DB operations | Reduces widget init latency by 40-60% |
| 9 | **CACHE-03** | Serve widget.js from CDN with immutable cache | Reduces app server load by 90%+ for widget traffic |
| 10 | **FE-09** | Add virtual scrolling for all lists | Smooth UI for 1000+ item lists |

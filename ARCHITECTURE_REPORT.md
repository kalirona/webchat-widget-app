# Architecture Audit: OpenSaaS Webchat Widget App

**Date:** 2026-06-30
**Project Root:** `F:\node apps\git respo make it saas\webchat-widget-app`
**Framework:** Wasp v0.24.0 (spec-based TS config)
**Deployment:** Coolify (Docker Compose)

---

## 1. Project Structure

```
webchat-widget-app/
├── .github/                  # CI/CD: lint, e2e, template-release, blog-deployment, diff-check
├── docker-compose.yml        # Coolify deployment config
├── package.json              # Monorepo root (lint/prettier only)
├── template/
│   ├── app/                  # MAIN APPLICATION — Wasp project
│   │   ├── main.wasp.ts      # Wasp config: routes, auth, queries, actions, jobs, APIs
│   │   ├── schema.prisma     # Prisma schema (PostgreSQL, 20 models)
│   │   ├── Dockerfile        # Multi-stage production build
│   │   ├── package.json      # App dependencies
│   │   ├── vite.config.ts    # Vite + Tailwind v4
│   │   └── src/              # All source code
│   ├── blog/                 # Astro blog (opensaas.sh docs)
│   └── e2e-tests/            # Playwright E2E tests
├── opensaas-sh/              # Shared OpenSaaS docs
├── template-test/            # Template diff harness
└── tools/                    # Helper utilities
```

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Wasp v0.24.0 (declarative config `main.wasp.ts`) |
| **Frontend** | React 19, React Router 7, Vite 7 |
| **Styling** | Tailwind CSS v4 + shadcn/ui (Radix primitives) |
| **Charts** | ApexCharts 5.10 |
| **Icons** | lucide-react |
| **Forms** | react-hook-form + zod v4 |
| **Backend** | Node.js, Express (via Wasp SDK) |
| **Database** | PostgreSQL + Prisma ORM |
| **Auth** | Email/password + Google/GitHub/Discord OAuth |
| **AI** | OpenAI + Google Gemini (abstracted via `AIProvider`) |
| **Payments** | Stripe (default), LemonSqueezy, Polar.sh (3 implementations) |
| **Background Jobs** | PgBoss (1 job: hourly stats) |
| **File Storage** | AWS S3 (presigned URLs) |
| **Container** | Docker multi-stage build |
| **Widget SDK** | Vanilla JS (esbuild bundle, 826 lines, Shadow DOM) |

---

## 3. Database (PostgreSQL — 20 models)

### Core Entities
- **User** — uuid PK, email, isAdmin, subscriptionStatus/Plan
- **Organization** — uuid PK, name, slug, customDomain, aiProvider/Model, encrypted API keys, subscription fields
- **OrganizationMember** — join table with role (admin/member)

### Chat / Widget Entities
- **Website** — uuid PK, url, embedCode, widgetColor/Title/Position, allowedDomains (String[])
- **Agent** — uuid PK, name, model, systemPrompt, temperature, status (draft/published)
- **Visitor** — uuid PK, sessionId (unique), email, name, lastSeenAt
- **Conversation** — uuid PK, status (bot/assigned/resolved), visitorId, assignedToId
- **Message** — uuid PK, content, role (user/assistant/system), tokens, cost, model
- **Lead** — uuid PK, email, name, phone, status (new/contacted/qualified/lost)

### Knowledge Entities
- **KnowledgeBase** — uuid PK, name
- **KnowledgeDocument** — uuid PK, title, sourceType (upload/crawl/text), status, chunkCount
- **DocumentChunk** — uuid PK, content, index

### Billing / Admin Entities
- **Trigger** — uuid PK, type (time_on_page/scroll_depth/exit_intent/page_visit), config (Json)
- **Invitation** — uuid PK, email, token, role, expiresAt
- **AuditLog** — uuid PK, action, metadata (Json)
- **DailyStats** — int PK, date (unique), totalViews, userCount, paidUserCount, revenue
- **PageViewSource** — composite PK (name, date), visitors
- **AiUsage** — uuid PK, date, promptTokens, completionTokens, cost, model, orgId
- **File** — uuid PK, name, type, s3Key (user files)
- **Task** / **GptResponse** / **ContactFormMessage** — legacy demo entities

---

## 4. Auth & Multi-tenancy

- **Auth methods:** Email/password (primary), Google, GitHub, Discord (configured in `userSignupFields.ts`)
- **Email flow:** Verification required, password reset, SMTP provider
- **Admin detection:** `ADMIN_EMAILS` env var (comma-separated)
- **Multi-tenancy:** Auto-creates `Organization` on first access; all resources scoped to org
- **Invitations:** Token-based, role assignment, audit-logged

---

## 5. Routes (42 frontend pages)

| Category | Routes | Auth |
|---|---|---|
| **Public** | `/`, `/features`, `/faq`, `/blog`, `/contact`, `/pricing` | None |
| **Docs** | `/docs/installation`, `/docs/wordpress`, `/docs/shopify`, `/docs/html`, `/docs/webflow` | None |
| **Auth** | `/login`, `/signup`, `/password-reset`, `/email-verification` | None |
| **App** | `/app/dashboard`, `/app/agents/*`, `/app/websites/*`, `/app/conversations/*`, `/app/leads`, `/app/analytics`, `/app/knowledge/*`, `/app/settings`, `/app/install` | Required |
| **Admin** | `/admin`, `/admin/users`, `/admin/settings`, `/admin/calendar`, `/admin/ui/buttons`, `/admin/messages` | Admin |
| **User** | `/account`, `/file-upload`, `/checkout` | Required |

---

## 6. Operations (Wasp Queries & Actions)

### Queries (35+)
- **Dashboard:** `getDashboardStats`, `getUsageQuota`, `getAnalyticsData`
- **Agents:** `getAgents`, `getAgent`, `getAgentStats`
- **Websites:** `getWebsites`, `getWebsite`
- **Conversations:** `getConversations`, `getConversationMessages`, `getConversationsInbox`, `getConversationDetail`
- **Knowledge:** `getKnowledgeBases`, `getKnowledgeBase`, `getKnowledgeDocuments`, `getAgentKnowledgeBases`
- **Leads:** `getLeads`
- **Triggers:** `getTriggers`
- **Admin:** `getPaginatedUsers`, `getDailyStats`
- **File:** `getAllFilesByUser`, `getDownloadFileSignedURL`
- **Payment:** `getCustomerPortalUrl`
- **Demo:** `getGptResponses`, `getAllTasksByUser`

### Actions (30+)
- **Agent CRUD:** `createAgent`, `updateAgent`, `deleteAgent`
- **Website CRUD:** `createWebsite`, `updateWebsite`, `deleteWebsite`
- **Conversation:** `resolveConversation`, `assignConversation`, `escalateConversation`, `sendAgentMessage`, `setAgentTyping`
- **Knowledge:** `createKnowledgeBase`, `deleteKnowledgeBase`, `uploadKnowledgeDocument`, `crawlUrl`, `deleteKnowledgeDocument`, `link/unlinkAgentToKnowledgeBase`
- **Leads:** `createLead`, `updateLead`, `deleteLead`
- **Triggers:** `createTrigger`, `updateTrigger`, `deleteTrigger`
- **Organization:** `createOrganization`, `updateOrganization`, `inviteMember`, `removeMember`
- **AI:** `updateAiSettings`
- **Payment:** `generateCheckoutSession`
- **Invitations:** `sendInvitation`, `cancelInvitation`, `acceptInvitation`

---

## 7. API Endpoints (Custom)

### Widget API (unauthenticated, CORS-protected, rate-limited)
| Endpoint | Purpose |
|---|---|
| `GET /api/widget/:websiteId/config` | Widget config (colors, triggers, branding) |
| `POST /api/widget/init` | Create visitor + conversation |
| `POST /api/widget/message` | Send message + streaming AI response |
| `GET /api/widget/messages/:conversationId` | Poll messages (2s interval) |
| `POST /api/widget/handoff` | Request human agent |
| `GET /api/widget/typing/:conversationId` | Check if agent typing |

### Payment Webhook
| Endpoint | Purpose |
|---|---|
| `POST /payments-webhook` | Stripe subscription lifecycle events |

---

## 8. Background Jobs

| Job | Schedule | Executor | Purpose |
|---|---|---|---|
| `calculateDailyStats` | Every hour (`0 * * * *`) | PgBoss | Aggregates analytics, revenue, user counts |

---

## 9. AI Architecture

- **Abstraction:** `AIProvider` interface in `src/app/ai/provider.ts`
- **Providers:** OpenAI (`openai.ts`), Google Gemini (`gemini.ts`)
- **Generation:** Streaming + non-streaming, retry logic, token tracking
- **RAG:** Keyword-based chunk retrieval (`rag.ts`), token-overlap scoring
- **Cost Tracking:** Per-model token cost calculator (`cost.ts`)
- **Limits:** Monthly token & conversation limits per org, 80% warning emails

---

## 10. Payment Architecture

- **Strategy pattern:** `PaymentProcessor` interface (3 implementations)
  - **Stripe** (default) — `src/payment/stripe/`
  - **LemonSqueezy** — `src/payment/lemonSqueezy/`
  - **Polar.sh** — `src/payment/polar/`
- **Plans:** hobby (subscription), pro (subscription), credits10 (one-time)
- **Limits synced from plan:** websites, conversations/month, tokens/month, members, models
- **Webhook lifecycle:** invoice.paid → subscription.updated → subscription.deleted

---

## 11. Widget SDK

- **File:** `src/widget/widget.ts` (826 lines, vanilla JS)
- **Build:** `npx esbuild src/widget/widget.ts --bundle --minify --outfile=public/widget/widget.js`
- **Embed:** `<script src="https://app.com/widget/widget.js" data-website-id="...">`
- **Isolation:** Shadow DOM (closed mode)
- **Features:** Chat UI, proactive triggers (time/scroll/exit/page), dark mode, handoff, email capture
- **Security:** UUID sanitization, color validation, CSS selector escaping, HTML escaping

---

## 12. Deployment (Docker / Coolify)

### Docker Compose
- Single service `app`, build context `./template/app`, port 3001

### Dockerfile (multi-stage)
- **Builder stage:** Installs wasp CLI v0.24.0 → `npm install` → `wasp install` → `wasp build` → rollup bundle
- **Production stage:** Copies `./.wasp/out` → `npm ci --production` → `prisma generate` → runs `bundle/server.js`

### Current Status
- Build succeeds (wasp compiles, rollup bundles)
- Container crashes at runtime — `dotenv/config` not found (FIXED by removing `-r dotenv/config` from CMD, since Coolify injects env vars directly)
- Re-deployment pending

---

## 13. Known Issues & Migration Notes

### Wasp v0.23 → v0.24 Migration
- All operation types cast to `any` (v0.24's stricter context/return types cause mismatches)
- `useQuery` results cast with `Record<string, any>` (wasn't propagating through destructuring)
- Router imports: `useParams`/`useNavigate` from `"react-router"` not `"wasp/client/router"`
- Zod v4: `_type` → `z.infer<typeof schema>`, `errors` → `issues`
- Build output: `.wasp/out/` not `.wasp/build/`; server now unbundled (requires rollup)

### Docker
- Server bundle step (`npm run bundle`) required post-wasp-build — `tsc --build` fails due to project references; workaround is to run `rollup --config` directly with root tsconfig copied
- BuildKit cache mounts (`--mount=type=cache`) break multi-stage COPY

### Pending
- Re-deploy after `dotenv/config` CMD fix
- Verify runtime with PostgreSQL + all env vars

---

## 14. CI/CD (6 GitHub Workflows)

| Workflow | Trigger | Action |
|---|---|---|
| `lint.yml` | Push/PR to main | Prettier + ESLint |
| `e2e-tests.yml` | Push/PR to main + manual | Playwright + Stripe CLI |
| `template-release.yml` | Tag `wasp-v*-template` | Create template.tar.gz |
| `blog-deployment.yml` | Push/PR to main (blog changes) | Build + deploy Astro blog to Netlify |
| `check-opensaas-diffs.yml` | Push/PR to main | Verify diff consistency |
| `automation-pr-label-external.yaml` | PR opened | Label external PRs |

---

## 15. Summary Metrics

| Metric | Count |
|---|---|
| Database models | 20 |
| Frontend routes | 42 |
| Wasp queries | 35+ |
| Wasp actions | 30+ |
| Custom API endpoints | 7 (6 widget + 1 webhook) |
| Background jobs | 1 (PgBoss) |
| CI/CD workflows | 6 |
| Payment processors | 3 (Stripe, LemonSqueezy, Polar.sh) |
| AI providers | 2 (OpenAI, Gemini) |
| Auth methods | 4 (email, Google, GitHub, Discord) |
| Main server operations file | 2,467 lines |
| Widget SDK | 826 lines (vanilla JS) |
| Docker build stages | 2 (builder + production) |

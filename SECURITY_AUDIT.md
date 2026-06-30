# Security Audit: OpenSaaS Webchat Widget App

**Date:** 2026-06-30
**Scope:** Full-stack Wasp application (frontend, backend, widget SDK, payment, AI, file upload)
**Methodology:** Manual code review of all server operations, widget API, auth, file handling, payment webhooks, and deployment config

---

## Severity Definitions

| Level | Definition |
|---|---|
| **Critical** | Direct, exploitable vulnerability with high impact (data breach, RCE, privilege escalation, financial loss) |
| **High** | Significant weakness requiring non-trivial attacker interaction; limited but real impact |
| **Medium** | Security gap that increases attack surface or violates best practices; low direct exploitability |
| **Low** | Minor hardening opportunity; defense-in-depth improvement |
| **Info** | Observation; no exploitable risk in current context |

---

## 1. Authentication & Session Security

### Critical — None found

### High
| ID | Issue | Location | Detail |
|---|---|---|---|
| **AUTH-01** | OAuth providers coded but disabled — confusion risk | `main.wasp.ts:166-184` | Google, GitHub, Discord OAuth code fully implemented in `userSignupFields.ts` but only email/password is configured in `main.wasp.ts`. If a developer uncomments OAuth in the config without reviewing the scopes, they may expose more data than intended. |
| **AUTH-02** | `isAdmin` auto-detection from env var has no re-verification | `src/auth/userSignupFields.ts:5-7` | `isAdmin` is set at signup time only from `ADMIN_EMAILS`. If `ADMIN_EMAILS` is later updated, existing users retain their admin status. No sync mechanism. |

### Medium — None found

### Low
| ID | Issue | Location | Detail |
|---|---|---|---|
| **AUTH-03** | No brute-force protection on login | Wasp-managed | Wasp's built-in auth doesn't provide rate limiting on login attempts. Login endpoint could be brute-forced. Mitigation: use Cloudflare or reverse proxy for rate limiting. |
| **AUTH-04** | Password policy not enforced | Wasp-managed | No minimum password length or complexity requirements. Wasp defaults may be weak. |

---

## 2. Authorization & RBAC

### Critical — None found

### High
| ID | Issue | Location | Detail |
|---|---|---|---|
| **RBAC-01** | No role distinction between "member" and "admin" for most operations | `src/app/operations.ts` | Only `updateOrganization`, `inviteMember`, `removeMember` check for owner role. Agents, websites, conversations, leads, knowledge bases — all org members (including "member" role) have full CRUD access. No read-only or restricted roles. |
| **RBAC-02** | `sendInvitation` checks `["owner", "admin"]` but invite token allows role assignment | `src/app/operations.ts:2062` | Admin can send invitations with any role (including "admin"). No further approval flow. Attacker who compromises an admin account can invite themselves as admin from any email. |

### Medium
| ID | Issue | Location | Detail |
|---|---|---|---|
| **RBAC-03** | Organization auto-created on first query | `src/app/operations.ts:67-94` | `getOrCreateUserOrg()` creates an org silently when any query is made. A user who never intended to create an org will have one created. No confirmation or onboarding flow. |
| **RBAC-04** | `getConversationMessages` checks org but leaks full message content | `src/app/operations.ts:728-746` | Any org member can read any conversation in the org. No per-conversation access control (e.g., agent-level isolation). |

### Low
| ID | Issue | Location | Detail |
|---|---|---|---|
| **RBAC-05** | Audit logging is inconsistent | Various | `logAuditEvent()` called for agent CRUD, org updates, invitations, but NOT for website CRUD, conversation actions, lead updates, knowledge base operations. |

---

## 3. JWT & Session Security

### Critical — None found

### High — None found

### Medium
| ID | Issue | Location | Detail |
|---|---|---|---|
| **JWT-01** | JWT secret strength depends on environment setup | Environment | `JWT_SECRET` is required but no minimum length validation. If set to a weak value, JWT tokens can be forged. |
| **JWT-02** | No session invalidation on password change | Wasp-managed | Users can change password but old sessions remain valid until JWT expiry. Mitigation depends on Wasp framework implementation. |

### Low — None found

---

## 4. API Keys & Secrets

### Critical — None found

### High — None found

### Medium
| ID | Issue | Location | Detail |
|---|---|---|---|
| **SECRETS-01** | `decryptSecret()` silently returns unencrypted plaintext | `src/shared/crypto.ts:49-52` | If a stored value doesn't match the 4-part encrypted format, it returns the value as-is. This supports migration but means a DB with unencrypted keys will expose them in plaintext until re-saved. If migration is incomplete, keys are stored in plaintext in the DB. |
| **SECRETS-02** | `API_KEY_ENCRYPTION_KEY` is a single master key | `src/shared/crypto.ts:11-20` | All customer API keys are encrypted with the same encryption key. If this key is compromised, all customer keys can be decrypted. No per-org or per-key salt separation beyond the per-value IV. |

### Low
| ID | Issue | Location | Detail |
|---|---|---|---|
| **SECRETS-03** | API key last 4 chars exposed in settings UI | `src/app/operations.ts:1968` | `getAiSettings` returns `"••••••••" + key.slice(-4)`. While this is common practice, it still leaks information that could be used in social engineering attacks. |
| **SECRETS-04** | Encryption key derived with 100K PBKDF2 iterations | `src/shared/crypto.ts:8` | 100K iterations is below current OWASP recommendation (600K+ for PBKDF2-HMAC-SHA512). Consider increasing to 600K-1M. |

---

## 5. Environment Variables

### Critical — None found

### High — None found

### Medium
| ID | Issue | Location | Detail |
|---|---|---|---|
| **ENV-01** | Env schema spreads all feature schemas — no optionalization | `src/env.ts:19-30` | All payment provider env vars (Stripe, LemonSqueezy, Polar) are required even if only one is used. This fails startup if unused provider env vars are missing. |

### Low
| ID | Issue | Location | Detail |
|---|---|---|---|
| **ENV-02** | No validation of JWT_SECRET strength | Wasp-managed | No minimum length or entropy check on JWT secret. |

---

## 6. XSS (Cross-Site Scripting)

### Critical — None found

### High — None found

### Medium
| ID | Issue | Location | Detail |
|---|---|---|---|
| **XSS-01** | No Content-Security-Policy header | App-wide | No CSP headers are set by the server. Any XSS vulnerability in the admin panel or React app would have full impact. |
| **XSS-02** | Widget `companyName` from server branding config rendered in DOM | `src/app/widget/api.ts:101` | `companyName` is read from org branding config and returned to widget. While the widget uses `textContent` (safe), if any other consumer renders this with `innerHTML`, it could be exploited. |

### Low
| ID | Issue | Location | Detail |
|---|---|---|---|
| **XSS-03** | Widget SDK uses `textContent` for messages | `src/widget/widget.ts:427` | All message rendering uses `textContent` instead of `innerHTML` — correctly prevents XSS. |
| **XSS-04** | Widget uses closed Shadow DOM | `src/widget/widget.ts:134` | Excellent isolation from host page CSS/JS. |
| **XSS-05** | Widget sanitizes hex colors and CSS selectors | `src/widget/widget.ts` | `sanitizeColor()` and `escapeCssSelector()` prevent CSS injection. |

---

## 7. CSRF (Cross-Site Request Forgery)

### Critical — None found

### High — None found

### Medium
| ID | Issue | Location | Detail |
|---|---|---|---|
| **CSRF-01** | Widget API relies solely on CORS + domain verification — no CSRF tokens | `src/app/widget/api.ts` | Widget API endpoints use `Access-Control-Allow-Origin: *` effectively (reflecting the request Origin). If a website has no `allowedDomains` configured, any website can make requests to the widget API on behalf of visitors to that site. |

### Low
| ID | Issue | Location | Detail |
|---|---|---|---|
| **CSRF-02** | Wasp likely uses SameSite cookies for auth endpoints | Wasp-managed | Standard Wasp projects use httpOnly, SameSite cookies. No explicit config found to confirm. |

---

## 8. SQL Injection

### Critical — None found

### High — None found

### Medium — None found

### Low — None found

### Info
| ID | Issue | Location | Detail |
|---|---|---|---|
| **SQLI-01** | All DB queries use Prisma ORM | App-wide | Prisma generates parameterized queries. No raw SQL found anywhere. |
| **SQLI-02** | User input validated with Zod before DB access | App-wide | Zod schemas validate types, lengths, formats before any Prisma call. |

---

## 9. Prompt Injection

### High
| ID | Issue | Location | Detail |
|---|---|---|---|
| **PROMPT-01** | User messages directly injected into AI system prompt | `src/app/ai/generate.ts:181-186` | User messages from widget are passed directly to the AI model without sanitization or guardrails. An attacker can inject system-level prompts (e.g., "Ignore previous instructions and do X"). |
| **PROMPT-02** | Knowledge base content injected into system prompt | `src/app/ai/rag.ts:74` | Content crawled from external URLs or uploaded documents is appended to the system prompt. A malicious website owner could craft knowledge base content that subverts the AI's behavior. |
| **PROMPT-03** | Agent system prompt is user-controllable | `src/app/operations.ts:428` (createAgent), `src/app/operations.ts:468` (updateAgent) | Org users can set arbitrary system prompts for their agents. While this only affects their own org, it means the platform hosts AI agents with user-controlled instructions. |

### Medium
| ID | Issue | Location | Detail |
|---|---|---|---|
| **PROMPT-04** | No output sanitization from AI model | `src/app/ai/generate.ts:215-221` | AI model output is stored directly in the DB and returned to clients. If the model is prompted to generate malicious content (e.g., markdown with XSS), it will be served to widget users. |
| **PROMPT-05** | RAG context lacks sanitization | `src/app/ai/rag.ts:67-74` | Knowledge base content from arbitrary URLs is included in prompts without filtering for malicious instructions. |

---

## 10. Widget Abuse

### High
| ID | Issue | Location | Detail |
|---|---|---|---|
| **WIDGET-01** | Rate limiting is in-memory — resets on server restart | `src/app/widget/api.ts:8-20` | All rate limit state is stored in a `Map` in memory. If the server restarts (deployment, crash, horizontal scaling), all rate limit counters reset. In serverless or multi-replica deployments, rate limiting is effectively disabled. |
| **WIDGET-02** | No authentication on widget API | `src/app/widget/api.ts` (all endpoints) | All 6 widget endpoints accept requests from any domain if `allowedDomains` is empty. An attacker can enumerate conversations by guessing IDs. |

### Medium
| ID | Issue | Location | Detail |
|---|---|---|---|
| **WIDGET-03** | Domain verification disabled by default | `src/app/widget/api.ts:52` | If `website.allowedDomains.length === 0`, ALL origins are allowed. Users who don't configure allowed domains have no domain restriction. |
| **WIDGET-04** | Spam detection is basic regex | `src/app/widget/api.ts:22-29` | Only 4 patterns (long URLs, repeated chars, `<script>`, `<iframe>`). Bypassable with Unicode obfuscation or alternative HTML tags. |
| **WIDGET-05** | Message length limit (10K chars) can be used for DoS | `src/app/widget/api.ts:215-217` | Each message up to 10K chars triggers AI generation (with RAG + token counting). An attacker sending 20 messages/minute can consume significant AI tokens and costs. |

### Low
| ID | Issue | Location | Detail |
|---|---|---|---|
| **WIDGET-06** | No conversation ID entropy check | `src/app/widget/api.ts:75-123` | Conversation IDs are UUIDs (v4), which are unguessable. But widgetGetConfig accepts any websiteId parameter without auth. |
| **WIDGET-07** | Visitor session IDs are predictable | `src/widget/widget.ts:40` | Session IDs use `Math.random()` + `Date.now()` — not cryptographically secure. |

---

## 11. Rate Limiting

### High
| ID | Issue | Location | Detail |
|---|---|---|---|
| **RATE-01** | In-memory rate limits don't scale | `src/app/widget/api.ts:8-20` | See WIDGET-01. Rate limits are per-process, in-memory, not persisted. Horizontal scaling or restarts reset counters. |
| **RATE-02** | No rate limiting on auth endpoints | Wasp-managed | Login, signup, password reset endpoints are not rate-limited by the application. Could be brute-forced. |

### Medium
| ID | Issue | Location | Detail |
|---|---|---|---|
| **RATE-03** | No global rate limiting | App-wide | All rate limiting is per-endpoint. No global IP-based throttle. An attacker can distribute requests across endpoints. |

---

## 12. CORS & CSP

### Medium
| ID | Issue | Location | Detail |
|---|---|---|---|
| **CORS-01** | Wildcard CORS with Origin reflection | `src/app/widget/api.ts:68-69` | `Access-Control-Allow-Origin` is set to the request's Origin header. This is more permissive than `*` — any origin is echoed back, including `null` origin (sandboxed iframes, data: URIs). |
| **CORS-02** | No CSP headers configured | App-wide | No Content-Security-Policy is set on any response. This amplifies any XSS risk (see XSS-01). |

### Low
| ID | Issue | Location | Detail |
|---|---|---|---|
| **CORS-03** | CORS allows all methods on widget endpoints | `src/app/widget/api.ts:70` | `Access-Control-Allow-Methods: GET, POST, OPTIONS` — doesn't restrict to specific endpoints (e.g., GET endpoints can't POST). |

---

## 13. File Uploads

### Medium
| ID | Issue | Location | Detail |
|---|---|---|---|
| **FILE-01** | Allowed file types include `text/*` and video | `src/file-upload/validation.ts:3-10` | `"text/*"` is very broad — includes `text/html`, `text/javascript`, etc. JavaScript files masquerading as `text/*` could be handled dangerously depending on S3 configuration. |
| **FILE-02** | Knowledge base uploads accept base64 without server-side size limit | `src/app/operations.ts:1496-1546` | File data is sent as base64 string via the action — no size limit validated on the server before base64 decoding. A large base64 payload could cause OOM or DoS. |
| **FILE-03** | File type derived from extension only | `src/app/knowledge/processing.ts:74-80` | File type is determined by the file extension, not by content inspection. A `.txt` file containing executable code would be accepted. |

### Low
| ID | Issue | Location | Detail |
|---|---|---|---|
| **FILE-04** | S3 presigned URL conditions are minimal | `src/file-upload/s3Utils.ts:37-44` | Only content-length-range condition. No content-type restriction in presigned post conditions (Content-Type is in Fields but not a Condition). |
| **FILE-05** | Orphaned S3 files on deletion failure | `src/file-upload/operations.ts:167-174` | If DB deletion succeeds but S3 deletion fails, the S3 file becomes an orphan. Error is logged but not retried. |

---

## 14. Webhooks & Payment Security

### Critical — None found

### High — None found

### Medium
| ID | Issue | Location | Detail |
|---|---|---|---|
| **WEBHOOK-01** | Unhandled webhook events return 204 (success) | `src/payment/stripe/webhook.ts:68-69` | Unhandled events return 204 to stop Stripe retries. While this is correct behavior, it means events that are NOT handled are silently accepted. If a new Stripe event type becomes critical (e.g., `payment_intent.succeeded`), it won't be processed and no warning is raised. |
| **WEBHOOK-02** | `syncOrgLimitsFromPlan` falls back to Hobby (not Free) on subscription deletion | `src/payment/stripe/webhook.ts:254` | When a subscription is deleted (cancelled), org limits are set to Hobby plan, not Free plan. The comment says "fallback to hobby (free equivalent)" but this is incorrect — Hobby has higher limits than Free. Users retain paid-level limits after cancelling. |

### Low
| ID | Issue | Location | Detail |
|---|---|---|---|
| **WEBHOOK-03** | Webhook error surface in HTTP response | `src/payment/stripe/webhook.ts:73-75` | Error message is returned in the HTTP response body to Stripe. While Stripe is the receiver, this could leak internal details in error cases. |
| **WEBHOOK-04** | `getInvoicePriceId` assumes single line item | `src/payment/stripe/webhook.ts:140-154` | If an invoice has more than one line item (e.g., proration + subscription), it throws an error. This could break billing for complex scenarios. |

---

## 15. Crypto & Encryption

### Medium
| ID | Issue | Location | Detail |
|---|---|---|---|
| **CRYPTO-01** | PBKDF2 iteration count below modern recommendations | `src/shared/crypto.ts:8` | 100,000 iterations of PBKDF2-SHA512. OWASP 2023+ recommends 600,000+ for SHA512. Consider increasing. |
| **CRYPTO-02** | `API_KEY_ENCRYPTION_KEY` is loaded from env var every encryption call | `src/shared/crypto.ts:11-20` | Called on every encrypt/decrypt operation. Could be optimized by caching the derived key in memory after first derivation. |

### Low — None found

---

## 16. Prompt Injection (AI-specific)

### High
| ID | Issue | Location | Detail |
|---|---|---|---|
| **PROMPT-06** | AI error messages leak model/provider info to client | `src/app/ai/generate.ts:247` | Error messages like "Model X not allowed on your plan" or "API quota exceeded" are thrown as generic `Error` but the user gets different fallback behaviors. No structured error handling that could be exploited for enumeration. |
| **PROMPT-07** | User-controlled AI model selection | `src/app/operations.ts:427` | Org users can select any model string. If a model name like "gpt-4o-mini" is entered that matches a cheaper model, the system uses it. No validation against actually available models beyond `getAllowedModels`. |

---

## 17. Deployment & Infrastructure

### Medium
| ID | Issue | Location | Detail |
|---|---|---|---|
| **DEPLOY-01** | Docker container runs as root | `template/app/Dockerfile` | Node containers run as root by default. No `USER node` directive. Container breakout or RCE would give root access. |
| **DEPLOY-02** | Build args include secrets in Docker history | `docker-compose.yml` | Build args like `DATABASE_URL`, `JWT_SECRET`, `STRIPE_API_KEY` are passed as Docker build args. They will be visible in the image history (`docker history`). |

### Low
| ID | Issue | Location | Detail |
|---|---|---|---|
| **DEPLOY-03** | npm install runs with all dependencies (not --production) in builder | `template/app/Dockerfile:16` | Dev dependencies installed in builder stage. While not in final image, this increases build time and attack surface for supply chain. |
| **DEPLOY-04** | `2>/dev/null` suppresses error output | `template/app/Dockerfile:31` | `npm ci --production` errors are suppressed. If npm install fails silently, the container could start with missing dependencies. |

---

## 18. Summary

### By Category

| Category | Critical | High | Medium | Low |
|---|---|---|---|---|
| Auth & Sessions | 0 | 2 | 0 | 2 |
| Authorization & RBAC | 0 | 2 | 2 | 1 |
| JWT & Sessions | 0 | 0 | 2 | 0 |
| API Keys & Secrets | 0 | 0 | 2 | 2 |
| Environment Variables | 0 | 0 | 1 | 1 |
| XSS | 0 | 0 | 2 | 3 |
| CSRF | 0 | 0 | 1 | 1 |
| SQL Injection | 0 | 0 | 0 | 2 |
| Prompt Injection | 0 | 3 | 2 | 0 |
| Widget Abuse | 0 | 2 | 3 | 2 |
| Rate Limiting | 0 | 2 | 1 | 0 |
| CORS & CSP | 0 | 0 | 2 | 1 |
| File Uploads | 0 | 0 | 3 | 2 |
| Webhooks & Payments | 0 | 0 | 2 | 2 |
| Crypto & Encryption | 0 | 0 | 2 | 0 |
| Deployment | 0 | 0 | 2 | 2 |
| **Total** | **0** | **11** | **27** | **19** |

### Top 5 Risks (by impact × exploitability)

1. **[HIGH] Rate limiting in-memory only** — Widget API rate limits reset on every server restart/deploy. An attacker restarting the container (e.g., by triggering a deploy) bypasses all rate limits.

2. **[HIGH] Widget API unauthenticated by default** — If `allowedDomains` is empty (default), ANY website can use the widget API (init conversations, send messages, query messages) on behalf of any website.

3. **[HIGH] Prompt injection via user messages** — No guardrails on AI input. Attackers can inject system-level prompts to manipulate AI behavior, extract data, or generate harmful content.

4. **[HIGH] No CSP headers** — Any XSS vulnerability in the admin panel has full impact. Widget isolation (Shadow DOM) is good but the main app is unprotected.

5. **[HIGH] Auth brute-forcing possible** — Login endpoint has no rate limiting. Credential brute-forcing is feasible without external protection.

### Recommended Immediate Actions

1. Replace in-memory rate limiter with persistent store (Redis or DB-backed)
2. Add rate limiting to auth endpoints (login, signup, password reset)
3. Enforce `allowedDomains` configuration on website creation (warn if empty)
4. Add CSP headers to all responses (consider `helmet` middleware)
5. Add AI prompt guardrail layer (input/output sanitization, instruction boundaries)
6. Add `USER node` to Dockerfile
7. Increase PBKDF2 iterations to 600K+
8. Use Docker secrets instead of build args for sensitive values
9. Add Content-Type condition to S3 presigned post to match the declared file type
10. Add `MAX_FILE_SIZE` server-side check for knowledge base uploads (base64 payload)

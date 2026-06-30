# Production Readiness Audit: OpenSaaS Webchat Widget App

**Date:** 2026-06-30
**Scope:** Deployment infrastructure, Docker, CI/CD, monitoring, operational practices

---

## Severity Definitions

| Level | Definition |
|---|---|
| **Critical** | Will cause production outage, data loss, or security breach |
| **High** | Significant risk of downtime or operational failure in production |
| **Medium** | Best practice gap that increases operational complexity |
| **Low** | Minor hardening or documentation improvement |

---

## 1. Docker Container

### 1.1 Health Checks — CRITICAL

| ID | Issue | Location | Severity | Detail |
|---|---|---|---|---|
| **DOCKER-01** | **No `HEALTHCHECK` directive** | `template/app/Dockerfile` | **High** | Docker/Coolify cannot detect if the app is alive. If the Node process hangs or enters a bad state, the orchestrator will not restart it. No liveness or readiness probes. |
| **DOCKER-02** | **No `healthcheck` in docker-compose** | `docker-compose.yml` | **Medium** | No container-level health check. Combined with DOCKER-01, there is zero health monitoring. |

### 1.2 Graceful Shutdown — CRITICAL

| ID | Issue | Location | Severity | Detail |
|---|---|---|---|---|
| **DOCKER-03** | **Shell CMD does not forward SIGTERM to Node** | `template/app/Dockerfile:38` | **Critical** | `CMD ["sh", "-c", "cd server && ...; node ..."]` — Docker sends SIGTERM to the shell (`sh`), which does NOT propagate it to the Node process. The Node server continues running until the 10-second Docker kill timeout, then is SIGKILLed. In-flight requests are terminated, DB connections leak, active AI generations are aborted without saving. |
| **DOCKER-04** | **No `STOPSIGNAL` directive** | `template/app/Dockerfile` | **Medium** | No explicit `STOPSIGNAL SIGTERM` or `STOPSIGNAL SIGINT`. Docker defaults to SIGTERM but without assurance of handling. |
| **DOCKER-05** | **No `process.on('SIGTERM')` handlers anywhere** | All `src/` files | **Critical** | Zero graceful shutdown handlers in the entire codebase. Grepped: no `SIGTERM`, `SIGINT`, `graceful`, or `shutdown` found. The app cannot cleanly shut down: no Prisma disconnection, no in-flight request draining, no AI generation persistence. |

### 1.3 Security & Permissions

| ID | Issue | Location | Severity | Detail |
|---|---|---|---|---|
| **DOCKER-06** | **Container runs as root** | `template/app/Dockerfile:1,25` | **High** | No `USER node` directive. Both builder and production stages run as root. Container breakout = host root. |
| **DOCKER-07** | **Secrets baked into Docker image layers** | `docker-compose.yml:9-33` | **High** | All env vars (`DATABASE_URL`, `JWT_SECRET`, `STRIPE_API_KEY`, etc.) are passed as Docker build args and visible in `docker history`. |
| **DOCKER-08** | **No `.dockerignore` file** | Project root | **Medium** | `node_modules/`, `.git/`, `.env*`, and other build artifacts may leak into the Docker build context. |

### 1.4 Build Reliability

| ID | Issue | Location | Severity | Detail |
|---|---|---|---|---|
| **DOCKER-09** | **`npm ci` errors suppressed with `2>/dev/null; true`** | `template/app/Dockerfile:31-32` | **Critical** | `RUN (cd server && npm ci --production) 2>/dev/null; true` — ALL failures are silenced. If `npm ci` fails (network, lockfile mismatch), the build succeeds with missing dependencies. Container starts but crashes at runtime with `MODULE_NOT_FOUND`. |
| **DOCKER-10** | **`npm install` used instead of `npm ci` in builder** | `template/app/Dockerfile:16` | **Medium** | `npm install` can resolve newer patch versions than `package-lock.json`, creating non-reproducible builds. |
| **DOCKER-11** | **`prisma generate` errors suppressed** | `template/app/Dockerfile:32` | **Medium** | `RUN npx prisma generate --schema=db/schema.prisma 2>/dev/null; true` — same silent failure pattern. |
| **DOCKER-12** | **Wasp CLI installation has hardcoded paths** | `template/app/Dockerfile:8-9` | **Low** | Hardcoded GHC version path (`ghc-9.6.7`). Any Wasp release with a different GHC version breaks the Dockerfile. |

### 1.5 Runtime Configuration

| ID | Issue | Location | Severity | Detail |
|---|---|---|---|---|
| **DOCKER-13** | **No `restart` policy in docker-compose** | `docker-compose.yml` | **High** | If the container crashes (as documented in earlier phases), it stays dead. No `restart: unless-stopped` or `restart: always`. |
| **DOCKER-14** | **No resource limits** | `docker-compose.yml` | **Medium** | No CPU/memory limits. Container can exhaust host resources. |
| **DOCKER-15** | **No `--init` flag** | `docker-compose.yml` | **Low** | PID 1 is the shell/Node process. Zombie processes can accumulate. Docker `init: true` would handle this. |
| **DOCKER-16** | **Migrations run on every container startup** | `template/app/Dockerfile:38` | **Medium** | `npx prisma migrate deploy` runs before the server starts. If the database is unavailable, the container crashes. No retry logic or startup script. Could cause crash loops during DB maintenance. |

---

## 2. Process Management

| ID | Issue | Location | Severity | Detail |
|---|---|---|---|---|
| **PROC-01** | **No PM2, supervisor, or process manager** | App-wide | **Medium** | The app relies entirely on Docker/Coolify for process management. No PM2 ecosystem file, no clustering, no watch/restart on crash. |
| **PROC-02** | **Single-process architecture** | `template/app/Dockerfile:38` | **Low** | Node.js runs as a single process. No worker threads, no clustering. For a SaaS app with 42 pages + AI generation, a single process handles all requests. Under load, the event loop blocks during AI calls and heavy DB queries. |

---

## 3. Logging & Observability

| ID | Issue | Location | Severity | Detail |
|---|---|---|---|---|
| **LOG-01** | **No structured logging** | All `src/` files | **High** | All 43+ logging calls use `console.log`, `console.error`, `console.warn`, `console.info`. No JSON output, no log levels, no correlation IDs. Cannot be ingested by log aggregators (Datadog, ELK, Loki) without parsing unstructured text. |
| **LOG-02** | **No request correlation IDs** | All `src/` files | **High** | No `X-Request-ID` or correlation IDs in logs. Tracing a single request across multiple operations is impossible without manual log inspection. |
| **LOG-03** | **Email failure logs are silent** | `src/app/billing/emails.ts` | **Medium** | All email sends are fire-and-forget with `.catch(console.error)`. Failures are logged to console but no alerts, no retries, no queue. |
| **LOG-04** | **Error logging exposes stack traces to console** | `src/app/widget/api.ts:120,200,297` | **Low** | `console.error(err)` in widget API endpoints logs full error objects. In production, these could contain sensitive data in error messages. |

---

## 4. Environment Variables

| ID | Issue | Location | Severity | Detail |
|---|---|---|---|---|
| **ENV-01** | **All payment provider env vars required even if unused** | `src/env.ts:19-30` | **Medium** | Stripe, LemonSqueezy, and Polar env schemas are all spread unconditionally. If only Stripe is used, the server won't start without dummy values for LemonSqueezy and Polar. |
| **ENV-02** | **No `DATABASE_URL` validation in env schema** | `src/env.ts` | **Low** | Wasp validates this internally, but app-level Zod schema doesn't check `DATABASE_URL` format or protocol. |
| **ENV-03** | **No `JWT_SECRET` strength validation** | `src/auth/env.ts` | **Medium** | `JWT_SECRET` is required by Wasp but no minimum length/entropy check. If set to a weak value, tokens can be forged. |
| **ENV-04** | **No `.env.example` in template/app/** | `template/app/` | **Low** | Only `.env.server.example` and `.env.client.example` exist. No single `.env.example` with all documented variables. |

---

## 5. Node.js Version & Dependencies

| ID | Issue | Location | Severity | Detail |
|---|---|---|---|---|
| **NODE-01** | **Node 24 — very new, risk of ecosystem incompatibility** | `template/app/Dockerfile:1` | **Medium** | Node 24 (bookworm-slim) was released recently. Some npm packages may not have native bindings for this version yet. Consider Node 22 LTS for production stability. |
| **NODE-02** | **No `.nvmrc` in `template/app/`** | `template/app/` | **Low** | Developers working in `template/app/` don't get automatic Node version switching via `nvm use`. |
| **NODE-03** | **`prettier` in production dependencies** | `template/app/package.json:40` | **Low** | `prettier` and `prettier-plugin-tailwindcss` are listed in `dependencies` instead of `devDependencies`. Adds ~5MB to production image. |
| **NODE-04** | **`@wasp.sh/spec` file dependency is fragile** | `template/app/package.json:60` | **Medium** | `"@wasp.sh/spec": "file:.wasp/spec"` — local file dependency. If `.wasp/spec` doesn't exist (e.g., after `git clean`), `npm install` fails. |

---

## 6. CI/CD & Deployment

| ID | Issue | Location | Severity | Detail |
|---|---|---|---|---|
| **CI-01** | **No Docker build/deploy workflow** | `.github/workflows/` | **High** | Zero GitHub Actions workflows build or deploy the production Docker container. Only lint, E2E tests, and blog deployment exist. No automated container registry push or deployment pipeline. |
| **CI-02** | **No integration tests against built container** | `.github/workflows/` | **Medium** | E2E tests exist (Playwright) but don't run against the production Docker image. They run against `wasp start` (development mode). |
| **CI-03** | **No pre-commit hooks** | Project root | **Low** | Linting runs only in CI (push/PR). No husky, lint-staged, or pre-commit hooks for local development. |

---

## 7. Monitoring & Alerting

| ID | Issue | Location | Severity | Detail |
|---|---|---|---|---|
| **MON-01** | **No APM or profiling** | App-wide | **High** | No application performance monitoring (Datadog, New Relic, Sentry, OpenTelemetry). No visibility into slow queries, error rates, request latencies, or memory usage in production. |
| **MON-02** | **No error tracking** | App-wide | **High** | No Sentry, Rollbar, or error tracking service. All errors go to `console.error` which may or may not be captured by Coolify's log stack. |
| **MON-03** | **No uptime monitoring** | Deploy config | **Medium** | No external uptime checks (Pingdom, UptimeRobot, or Coolify health checks). If the app goes down, no one is notified. |
| **MON-04** | **No metrics endpoint** | App-wide | **Medium** | No `/metrics` endpoint for Prometheus or similar. Cannot monitor request rates, error rates, or latency percentiles. |

---

## 8. Security (Production-Relevant)

*Cross-referenced from SECURITY_AUDIT.md*

| ID | Issue | Severity | Detail |
|---|---|---|---|
| **DEPLOY-01** | Container runs as root (DOCKER-06) | **High** | |
| **DEPLOY-02** | Build args expose secrets (DOCKER-07) | **High** | |
| **RATE-01** | In-memory rate limiting resets on restart | **High** | Every deploy/restart resets rate limit counters |
| **ENV-01** | Unused payment provider vars required | **Medium** | |

---

## 9. Summary & Prioritized Recommendations

### By Category

| Category | Critical | High | Medium | Low |
|---|---|---|---|---|
| Docker Container | 3 | 3 | 5 | 2 |
| Process Management | 0 | 0 | 1 | 1 |
| Logging & Observability | 0 | 2 | 1 | 1 |
| Environment Variables | 0 | 0 | 2 | 2 |
| Node.js & Dependencies | 0 | 0 | 2 | 2 |
| CI/CD & Deployment | 0 | 1 | 1 | 1 |
| Monitoring & Alerting | 0 | 2 | 2 | 0 |
| **Total** | **3** | **8** | **14** | **9** |

### Top 10 Actions (by impact)

| Priority | ID | Action | Effort |
|---|---|---|---|
| **1** | **DOCKER-03** | Fix SIGTERM forwarding: use `exec` in CMD or `tini`/`dumb-init` as PID 1 | 30 min |
| **2** | **DOCKER-05** | Add `process.on('SIGTERM')` handler: close Prisma, drain requests, persist AI state | 2 hours |
| **3** | **DOCKER-09** | Remove `2>/dev/null; true` — let `npm ci` and `prisma generate` fail loudly | 5 min |
| **4** | **DOCKER-01** | Add `HEALTHCHECK` to Dockerfile (e.g., `curl -f http://localhost:3001/health || exit 1`) | 15 min |
| **5** | **DOCKER-13** | Add `restart: unless-stopped` to docker-compose.yml | 2 min |
| **6** | **LOG-01** | Add structured logging (pino or winston) with JSON output | 4 hours |
| **7** | **DOCKER-06** | Add `USER node` to production stage in Dockerfile | 5 min |
| **8** | **MON-01** | Add Sentry or OpenTelemetry for error tracking and APM | 4 hours |
| **9** | **DOCKER-07** | Move secrets from build args to runtime env vars (not baked into image) | 30 min |
| **10** | **CI-01** | Create GitHub Actions workflow for Docker build + push to registry | 2 hours |

### Quick Wins (can be done in <1 hour)

1. `CMD` → `exec node ...` to fix SIGTERM forwarding (`DOCKER-03`)
2. Add `USER node` to production stage (`DOCKER-06`)
3. Add `HEALTHCHECK` to Dockerfile (`DOCKER-01`)
4. Add `restart: unless-stopped` to docker-compose (`DOCKER-13`)
5. Remove `2>/dev/null; true` from Dockerfile (`DOCKER-09`)
6. Add `init: true` to docker-compose (`DOCKER-15`)
7. Move secrets from build args to compose runtime env (`DOCKER-07`)
8. Add `.dockerignore` (`DOCKER-08`)
9. Move `prettier` to devDependencies (`NODE-03`)

### The `dotenv/config` Error (Found & Fixed)

The `dotenv/config` preload crash (container startup failure) was caused by:
- `CMD` included `-r dotenv/config` but `dotenv` wasn't installed in the production stage
- Env vars are injected by Coolify at runtime — `dotenv` isn't needed **Fix applied**: Removed `-r dotenv/config` from CMD in `template/app/Dockerfile:38`

**Root cause:** Dockerfile production stage runs `npm ci --production` which doesn't install devDependencies. If `dotenv` was in devDependencies, it was excluded.

**Prevention:** Remove `2>/dev/null; true` from npm install commands so missing dependencies fail the build, not runtime.

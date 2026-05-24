# Atlas — Runbook & Operations Manual

This document is the authoritative reference for operating Atlas in production. It is written for the person on call. Every section is self-contained: you should be able to read one playbook in the middle of an incident and act on it without context from elsewhere.

## Table of Contents

1. [Service Overview](#1-service-overview)
2. [On-Call Basics](#2-on-call-basics)
3. [Service Level Objectives (SLOs)](#3-service-level-objectives-slos)
4. [Alert Catalog](#4-alert-catalog)
5. [Incident Response Procedure](#5-incident-response-procedure)
6. [Common Runbook Playbooks](#6-common-runbook-playbooks)
7. [Routine Operations](#7-routine-operations)
8. [Diagnostic Recipes](#8-diagnostic-recipes)
9. [Maintenance Tasks](#9-maintenance-tasks)
10. [Disaster Recovery](#10-disaster-recovery)
11. [Escalation & Contacts](#11-escalation--contacts)

---

## 1. Service Overview

### 1.1 Architecture at a Glance

| Component | What it does | Failure blast radius |
|---|---|---|
| `atlas-api` | HTTP gateway, query orchestration | All user-facing traffic |
| `atlas-ingestion-worker` | Background document parsing & embedding | New uploads only; queries unaffected |
| `atlas-mcp-server` | MCP protocol surface for agents | External agent integrations |
| `atlas-web` | Next.js frontend (SSR + BFF) | Web UI only; API directly callable |
| Postgres (managed, e.g. Neon) | Source of truth for all tenant data | Total outage |
| Redis (managed, e.g. Upstash) | Cache, rate limit, job queue | Degraded: caches miss, queue stalls |
| Object store (R2/MinIO) | Document originals | New uploads fail; existing chunks unaffected |
| LangSmith | Tracing | Loss of observability; service still serves traffic |

### 1.2 Critical Dependencies

External APIs Atlas depends on:

- **Anthropic API** (primary LLM): outage → fall back to OpenAI; if both down, return cached degradation message.
- **OpenAI API** (fallback LLM + optional embedder): if down while primary also down, queries return 502.
- **Cohere API** (optional reranker): if a tenant is configured for Cohere reranker and Cohere is down, fall back to BGE local reranker; log as degraded.

### 1.3 Production Topology

```
                         ┌──────────────┐
                         │   Vercel     │  atlas-web
                         └──────┬───────┘
                                │ HTTPS
                                ▼
                         ┌──────────────┐
                         │   Fly.io     │  atlas-api  (multi-region, autoscale)
                         │              │  atlas-mcp-server
                         └──┬───────┬───┘
                            │       │
                  ┌─────────┘       └─────────┐
                  ▼                            ▼
           ┌──────────────┐             ┌──────────────┐
           │   Neon       │             │   Upstash    │
           │  Postgres    │             │   Redis      │
           │  (primary +  │             └──────────────┘
           │   read-only) │
           └──────────────┘
                  ▲
                  │
           ┌──────────────┐
           │   Fly.io     │  atlas-ingestion-worker (autoscale 1..N)
           └──────────────┘
                  │
                  ▼
           ┌──────────────┐
           │ Cloudflare   │
           │     R2       │
           └──────────────┘
```

---

## 2. On-Call Basics

### 2.1 What You Need Before You Take an Incident

Verify you have access to ALL of these before your shift starts:

- [ ] PagerDuty (or equivalent) account with Atlas escalation policy
- [ ] GitHub repo with at least `triage` role
- [ ] Fly.io account with `member` role
- [ ] Neon (Postgres) console access
- [ ] Upstash (Redis) console access
- [ ] LangSmith project access
- [ ] Grafana dashboard URL bookmarked
- [ ] Status page editor (e.g., statuspage.io) credentials
- [ ] `flyctl` CLI installed and `flyctl auth login` done
- [ ] `psql` installed and a current `DATABASE_URL` for the prod read-replica saved securely
- [ ] This document available offline (a screenshot is fine)

### 2.2 The First 5 Minutes of Any Page

1. **Acknowledge** the page within 5 minutes. This silences the pager and tells the rest of the team someone is on it.
2. **Open the Grafana dashboard** — `https://grafana.atlas.example.com/d/atlas-overview`. Look at the four golden signals (request rate, error rate, p95 latency, saturation) for the last 30 minutes.
3. **Open the incident channel** — `#atlas-incidents` in Slack/Discord. Post: "Acknowledged page <id>. Investigating."
4. **Check the status page** — is there an upstream incident reported on Anthropic, OpenAI, Cohere, Neon, Upstash, Fly.io, or Vercel status pages?
5. **Find the alert in the catalog below** and follow the linked playbook.

### 2.3 What Counts as "Resolved"

An incident is resolved when:

- The alerting condition no longer fires.
- The user-visible symptom has cleared (verified by manually exercising the affected path).
- A `#atlas-incidents` summary message has been posted with: timeline, root cause hypothesis, mitigation taken, follow-up actions.
- An issue or incident document has been opened with `incident` label for post-incident review.

---

## 3. Service Level Objectives (SLOs)

### 3.1 SLO Targets

| SLI | Target (30-day window) | Burn rate alert |
|---|---|---|
| API availability (non-5xx / total) | 99.5% | Fast: 2% budget burn in 1h |
| Query p95 latency | < 1.5s | 2× target sustained 10 min |
| First token latency p95 | < 600ms | 2× target sustained 10 min |
| Ingestion job success rate | 98% | < 95% sustained 30 min |
| Cost per query (rolling 24h) | < $0.001 | > $0.002 sustained 1h |

### 3.2 Error Budget

99.5% availability = 3.6 hours of allowed downtime per 30-day window. The error budget gates risky deploys: when burn exceeds 50% of budget for the window, all non-critical deploys pause until the window resets or a follow-up SLO PR is merged with mitigations.

### 3.3 Where SLOs Live

- Defined in code: `infra/observability/slos.yaml`
- Tracked in Grafana: `https://grafana.atlas.example.com/d/atlas-slos`
- Burn-rate alerts route to PagerDuty Atlas escalation policy

---

## 4. Alert Catalog

Each alert below has: name, condition, severity, playbook link, and expected response time.

| Alert | Condition | Sev | Playbook | Ack SLA |
|---|---|---|---|---|
| `AtlasAPIDown` | `up{job="atlas-api"} == 0` for 2 min | **SEV1** | [P-001](#p-001-atlas-api-is-down) | 5 min |
| `AtlasHighErrorRate` | 5xx rate > 5% for 5 min | **SEV1** | [P-002](#p-002-elevated-5xx-rate) | 5 min |
| `AtlasHighLatencyP95` | Query p95 > 3s for 10 min | SEV2 | [P-003](#p-003-elevated-latency) | 15 min |
| `AtlasIngestionStalled` | Queue depth > 100 for 15 min | SEV2 | [P-004](#p-004-ingestion-queue-backed-up) | 15 min |
| `AtlasIngestionFailureSpike` | Failure rate > 10% for 10 min | SEV2 | [P-005](#p-005-ingestion-failures-spiking) | 15 min |
| `AtlasPostgresUnreachable` | Readiness `postgres: fail` for 1 min | **SEV1** | [P-006](#p-006-postgres-unreachable) | 5 min |
| `AtlasRedisUnreachable` | Readiness `redis: fail` for 1 min | SEV2 | [P-007](#p-007-redis-unreachable) | 15 min |
| `AtlasLLMProviderOutage` | Anthropic AND OpenAI circuit breakers OPEN | **SEV1** | [P-008](#p-008-all-llm-providers-down) | 5 min |
| `AtlasBudgetSpike` | Per-tenant cost > 3× 24h rolling avg | SEV3 | [P-009](#p-009-tenant-cost-spike) | 1 hour |
| `AtlasCostBurnGlobal` | Projected monthly cost > $50 on demo | SEV3 | [P-010](#p-010-demo-cost-overrun) | 1 hour |
| `AtlasRLSPolicyViolation` | Any audit log with `app.current_tenant unset` | **SEV1** | [P-011](#p-011-rls-policy-violation-suspected-leak) | Immediate |
| `AtlasEvalRegression` | Nightly eval recall@5 drops > 2pp vs baseline | SEV3 | [P-012](#p-012-eval-regression-detected) | Next business day |
| `AtlasDiskSpaceLow` | Postgres disk usage > 85% | SEV2 | [P-013](#p-013-postgres-disk-pressure) | 30 min |

---

## 5. Incident Response Procedure

### 5.1 Severity Definitions

| Severity | User impact | Examples | Pager |
|---|---|---|---|
| **SEV1** | Service down for many users; data integrity at risk | API hard down, Postgres unreachable, suspected tenant leak | Page immediately, 24/7 |
| **SEV2** | Significant degradation for many users; no data risk | High latency, ingestion stalled | Page during waking hours; ticket overnight |
| **SEV3** | Minor issue affecting few users; or cost/quality regression | Single tenant cost spike, eval regression | Ticket only |

### 5.2 Incident Lifecycle

```
[Page] → [Acknowledge] → [Investigate] → [Mitigate] → [Verify] → [Resolve] → [Postmortem]
   ≤5m         ≤5m            varies        varies      <30m       commit       ≤7 days
```

### 5.3 Roles During an Incident

For SEV1, declare these roles (one person can hold multiple if the team is small):

- **Incident Commander (IC):** owns decisions; runs the call; does NOT debug.
- **Operations Lead (OL):** drives the technical investigation; runs commands; pairs with subject experts.
- **Communications Lead (CL):** updates status page and stakeholders every 15 min.
- **Scribe:** records timeline in `#atlas-incidents` for the postmortem.

For SEV2 and below, one on-call engineer handles all roles informally.

### 5.4 Status Page Templates

| Phase | Template |
|---|---|
| Investigating | "We are investigating reports of <symptom>. Customers may experience <impact>." |
| Identified | "We have identified the cause as <component>. We are working on a fix." |
| Monitoring | "A fix has been deployed. We are monitoring to confirm full recovery." |
| Resolved | "This incident is resolved. A full incident review will follow." |

### 5.5 Postmortem Template

Every SEV1 and SEV2 requires a written postmortem within 7 days. Use this skeleton in `docs/incidents/YYYY-MM-DD-<slug>.md`:

```markdown
# Incident: <one-line title>
- Date: YYYY-MM-DD
- Severity: SEV1
- Duration: HH:MM
- Author: <name>

## Summary
One paragraph: what happened, who was affected, how long, how it was resolved.

## Timeline (all UTC)
- HH:MM — first signal
- HH:MM — page acknowledged
- HH:MM — root cause identified
- HH:MM — mitigation applied
- HH:MM — service restored

## Impact
- Users affected: ~N
- Requests failed: ~N
- Tenants impacted: <list or "all">
- Revenue / SLA impact: <if applicable>

## Root Cause
What actually went wrong. Include the specific code, config, or external event.

## Contributing Factors
What made this incident worse than it had to be?

## What Went Well
- ...

## What Went Poorly
- ...

## Action Items
| # | Owner | Action | Due | Type |
|---|---|---|---|---|
| 1 | @alice | Add alert for X | YYYY-MM-DD | preventive |
| 2 | @bob | Update playbook P-NNN | YYYY-MM-DD | response |

Postmortems are blameless. Do not name individual mistakes; name system failures.
```

---

## 6. Common Runbook Playbooks

### P-001: Atlas API is down

**Symptom:** Health check failing, users seeing connection errors or 502s.

**Diagnose:**

1. Check Fly status: `flyctl status -a atlas-api`
2. Check recent deploys: `flyctl releases -a atlas-api | head -10` — was there a release in the last 60 min?
3. Open Grafana → "API overview" — what changed?
4. Tail logs: `flyctl logs -a atlas-api`

**Mitigate:**

- **If a recent deploy caused it:** roll back. `flyctl deploy --image registry.fly.io/atlas-api:<previous-sha> -a atlas-api`. Verify with `curl https://api.atlas.example.com/healthz`.
- **If no recent deploy and machines crashed:** restart. `flyctl machine restart -a atlas-api --select`.
- **If config issue (env var):** `flyctl secrets list -a atlas-api`. Fix and redeploy.
- **If platform issue (Fly itself):** check fly status page; if confirmed, post on status page and wait.

**Verify:**

- `curl https://api.atlas.example.com/readyz` returns 200.
- Run a query manually with a known-good account.
- Watch error rate in Grafana for 10 min.

---

### P-002: Elevated 5xx Rate

**Symptom:** Grafana shows 5xx rate spike above 5%.

**Diagnose:**

1. Open Grafana → "Errors by route" — which endpoint is hot?
2. `flyctl logs -a atlas-api | grep -i error` — find the most common error message.
3. Check upstream provider status pages.

**Common Causes & Mitigations:**

| Pattern | Mitigation |
|---|---|
| `502` from `/v1/query` with "anthropic" in error | Check Anthropic status. If confirmed outage, see P-008. |
| `503` with "pool exhausted" | Increase API replicas: `flyctl scale count 4 -a atlas-api`. |
| `500` with stack traces pointing to a single line | Likely a regression. Roll back if recent deploy. |
| 429s spike with no 5xx | Likely a single client hammering; identify in logs, contact tenant. |

---

### P-003: Elevated Latency

**Symptom:** Query p95 > 3s.

**Diagnose:**

1. Open LangSmith for the time window. Sort recent traces by total latency desc.
2. Open the slowest trace. Identify the longest node.

**By dominant node:**

| Slow node | Likely cause | Mitigation |
|---|---|---|
| `retrieve_parallel` | Postgres slow query, HNSW degraded | Run `ANALYZE chunks;`; check Postgres CPU |
| `rerank` | BGE model slow, or Cohere API latency | Failover reranker per affected tenant; scale ingestion-worker (which hosts BGE) |
| `generate` | LLM provider degraded | Switch primary to OpenAI temporarily |
| `verify` | Same as generate | Same |

**Quick fixes:**

- Bump API replicas: `flyctl scale count +2 -a atlas-api`.
- If Postgres is hot, add a temporary read replica for queries.

---

### P-004: Ingestion Queue Backed Up

**Symptom:** `arq` queue depth > 100; documents stuck in `processing` status.

**Diagnose:**

```bash
# Inspect queue depth
redis-cli -u $REDIS_URL llen arq:queue:default

# Inspect worker count
flyctl status -a atlas-ingestion-worker
```

**Mitigate:**

- Scale up workers: `flyctl scale count 4 -a atlas-ingestion-worker`.
- If individual jobs are stuck (one tenant uploading 10K-page PDFs), check per-tenant concurrency semaphore in Redis: `redis-cli get ingestion:semaphore:<tenant_id>`. Reset if stuck: `redis-cli del ingestion:semaphore:<tenant_id>`.
- If embedding service is the bottleneck (most common), inspect ingestion worker logs for embedding timeouts.

**Verify:**

- Queue depth drops monotonically.
- New uploads progress from `pending` → `processing` → `ready` within expected time (~10s per MB for PDFs).

---

### P-005: Ingestion Failures Spiking

**Symptom:** Failure rate > 10% in the last 10 min.

**Diagnose:**

```bash
# Sample failure reasons
psql "$DATABASE_URL_RO" -c "
  SELECT failure_reason, count(*)
  FROM documents
  WHERE status = 'failed' AND uploaded_at > now() - interval '1 hour'
  GROUP BY failure_reason ORDER BY count(*) DESC LIMIT 10;
"
```

**Common Causes:**

| Failure reason | Mitigation |
|---|---|
| `Unstructured: cannot parse PDF` | Check if a single tenant is uploading corrupted PDFs. Failover parser to PyMuPDF for that tenant. |
| `Embedding timeout` | See P-004; embedding service degraded. |
| `Object store: connection refused` | R2/MinIO down; check provider status. |
| `Postgres: deadlock detected` | Reduce ingestion worker concurrency: `flyctl secrets set ARQ_MAX_JOBS=5 -a atlas-ingestion-worker`. |

---

### P-006: Postgres Unreachable

**Symptom:** Readiness shows `postgres: fail`; queries returning 503.

**Diagnose:**

1. Open Neon console — is the project active? Are there incidents?
2. Try direct connect: `psql "$DATABASE_URL"`. Note exact error.

**Common Causes:**

| Cause | Mitigation |
|---|---|
| Neon project paused (free tier) | Resume in console; configure tier to avoid pausing |
| Connection limit reached | Check `pg_stat_activity`; kill idle connections; raise `max_connections` |
| Disk full | See P-013 |
| Network partition | Wait; switch to read replica for reads if available |

**Hard failure:**

If Postgres is unreachable for > 5 min, escalate to SEV1 and post on status page. Atlas cannot serve queries without Postgres.

---

### P-007: Redis Unreachable

**Symptom:** Readiness shows `redis: fail`. The API can still serve queries with degraded caching (slower, more expensive) but ingestion queue stalls.

**Diagnose:**

1. Upstash console — is the instance alive?
2. `redis-cli -u $REDIS_URL ping`.

**Mitigate:**

- If Upstash is hard down, Atlas degrades gracefully for queries but ingestion stops. Communicate this on the status page.
- Caches will rebuild automatically once Redis returns.
- If queue messages were lost, affected jobs are re-enqueued by Postgres backstop (`documents.status='pending'` rows older than 5 min are re-queued by a maintenance cron).

---

### P-008: All LLM Providers Down

**Symptom:** Both Anthropic and OpenAI circuit breakers OPEN; queries returning 502 or graceful-degradation messages.

**Diagnose:**

1. Anthropic status page
2. OpenAI status page

**Mitigate:**

- This is the worst case. The graceful degradation message is what users see: "We're temporarily unable to generate answers; retrieval is still working. Please retry in a few minutes."
- Update the status page immediately.
- Wait. There is no Atlas-side fix.
- Monitor circuit breaker state in Grafana; closures self-test once per minute.

**Prevent recurrence:**

- After the incident, evaluate whether to add a third provider (Bedrock, Mistral, etc.) to the fallback chain.

---

### P-009: Tenant Cost Spike

**Symptom:** A single tenant's cost is 3× its rolling 24h average.

**Diagnose:**

```bash
psql "$DATABASE_URL_RO" -c "
  SELECT user_id, model, count(*) as n, sum(cost_usd) as total
  FROM usage_events
  WHERE tenant_id = '<tenant_uuid>'
    AND created_at > now() - interval '6 hours'
  GROUP BY user_id, model
  ORDER BY total DESC;
"
```

**Mitigate:**

- If a single user is responsible (likely a bot/scraper), revoke their token via admin tooling and contact the tenant admin.
- If usage looks legitimate but exceeds budget, the budget enforcement is already returning 429; the alert may simply reflect a tenant who should raise their cap.
- Document the case in the postmortem if cost broke budget (race condition between Redis budget and DB record).

---

### P-010: Demo Cost Overrun

**Symptom:** Projected monthly cost on the live demo > $50 (target $25).

**Diagnose:**

- Open the Fly.io billing page.
- Open the cost-per-query Grafana panel.

**Common Causes:**

| Cause | Mitigation |
|---|---|
| Bot traffic hitting public endpoints | Tighten rate limits; add Cloudflare in front |
| Spike in MCP traffic | Verify which tenant's API key; throttle if needed |
| Inefficient queries (long contexts) | Investigate trace samples; ensure context compressor is working |

---

### P-011: RLS Policy Violation (Suspected Leak)

**Symptom:** Audit log shows a query executed without `app.current_tenant` set, or an integration test for RLS isolation failed in CI.

**This is SEV1 regardless of measured impact.** Treat as a security incident.

**Immediate actions:**

1. **Halt all deploys.** Notify the team in `#atlas-security`.
2. Capture the trace ID and the query that triggered the audit log.
3. Review the code path. The default behavior of RLS without `SET LOCAL` returns ZERO rows, so data exposure is unlikely — but verify against logs.
4. If any cross-tenant data was returned, identify which tenants. Contact affected tenants with disclosure.
5. Patch the missing `SET LOCAL`. Add a regression test.

**Follow-up:**

- Run a full RLS isolation test sweep before next deploy.
- Add static analysis (a pre-commit hook) that requires `with_tenant_session` calls in any module that imports the DB engine.

---

### P-012: Eval Regression Detected

**Symptom:** Nightly eval shows recall@5 dropped > 2pp vs the last green run.

**Diagnose:**

1. Open the latest eval report at `evals/reports/`.
2. Compare its config to the previous report.
3. Identify the commit range between green and red runs: `git log --oneline <green_sha>..<red_sha>`.
4. Look for changes to retrieval, chunking, or prompt code.

**Mitigate:**

- If a clear culprit commit is found, revert and reopen the work in a branch with the eval running locally.
- If no clear culprit, the regression might be data-side (eval dataset shifted) — verify the dataset hasn't been modified.

**Not an emergency.** No user-facing impact. Schedule fix during business hours.

---

### P-013: Postgres Disk Pressure

**Symptom:** Disk usage > 85%.

**Diagnose:**

```sql
-- Find largest tables
SELECT relname, pg_size_pretty(pg_total_relation_size(oid)) AS size
FROM pg_class WHERE relkind = 'r'
ORDER BY pg_total_relation_size(oid) DESC LIMIT 20;

-- Find oldest data
SELECT min(created_at), count(*) FROM usage_events;
SELECT min(created_at), count(*) FROM audit_events;
```

**Mitigate:**

- Run retention job (manually if cron hasn't run): see [§9.3 Data Retention](#93-data-retention).
- If `chunks` is the largest table, no quick fix — must add storage. Bump Neon tier.
- `VACUUM FULL` requires a maintenance window and exclusive lock. Plan it.

---

## 7. Routine Operations

### 7.1 Deploy Procedure

Atlas uses GitOps via `main` branch + signed tags.

**Standard deploy (non-breaking):**

1. PR merges to `main` after all CI gates pass.
2. `build.yml` builds and pushes the image to GHCR with `:sha` and `:main` tags.
3. `deploy.yml` triggers automatically; rolling deploy to staging via Helm.
4. Smoke tests run against staging.
5. On green, manual approval gate; promote to production with `helm upgrade --install atlas atlas/atlas --values prod.yaml`.

**Breaking deploy (schema migration):**

Follow the two-deploy rule:

1. **Deploy 1:** new column nullable, code writes both old and new, reads from old.
2. Backfill data.
3. **Deploy 2:** code reads from new, drops old.

Never combine schema-breaking changes with code logic changes in the same deploy.

### 7.2 Rollback Procedure

```bash
# 1. Identify previous green SHA
flyctl releases -a atlas-api | head -5

# 2. Re-deploy that SHA
flyctl deploy --image registry.fly.io/atlas-api:<sha> -a atlas-api
flyctl deploy --image registry.fly.io/atlas-ingestion-worker:<sha> -a atlas-ingestion-worker

# 3. Verify
curl https://api.atlas.example.com/readyz
```

**Schema rollbacks** are dangerous. If a migration was applied that the previous code doesn't understand, you cannot simply roll back the binary. Options:

- Forward-fix: deploy a new release that handles the new schema.
- Migration rollback: only if the migration is purely additive and the new column is unused; run `alembic downgrade -1`.

### 7.3 Scaling Operations

| When | What |
|---|---|
| Sustained CPU > 70% on API | `flyctl scale count +2 -a atlas-api` |
| Ingestion queue depth > 50 sustained | `flyctl scale count +1 -a atlas-ingestion-worker` |
| Postgres CPU > 80% | Bump Neon compute tier in console; ANALYZE; review slow query log |
| Redis memory > 75% | Inspect key distribution; raise plan or shorten TTLs |

### 7.4 Tenant Onboarding

Tenants self-onboard via `/v1/auth/signup`. Operations needed only for:

- Plan upgrades (free → pro): update `tenants.plan` and `daily_budget_usd`.
- Custom configuration: bespoke embedding/LLM combos.
- Enterprise SSO: out of scope in v1.0.

### 7.5 Tenant Offboarding

When a tenant departs:

1. Notify via email at least 30 days before deletion.
2. On the scheduled date: `DELETE FROM tenants WHERE id = '<uuid>';` — cascades to all tenant data.
3. Object store: run a sweep to delete documents for that tenant.
4. Audit trail: keep `audit_events` for that tenant for 90 days for compliance.

---

## 8. Diagnostic Recipes

### 8.1 Find the Slowest Queries Right Now

```sql
SELECT query, calls, mean_exec_time, max_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 20;
```

Look for queries touching `chunks` without using the HNSW or GIN index.

### 8.2 Inspect a Specific Trace

```
Open LangSmith: https://smith.langchain.com/o/<org>/projects/p/atlas-production
Filter: trace_id == "<trace_id>"
```

Or query via API:

```bash
curl -H "X-API-Key: $LANGSMITH_API_KEY" \
  "https://api.smith.langchain.com/runs?project=atlas-production&id=<run_id>"
```

### 8.3 Find a User's Recent Activity

```sql
SELECT created_at, action, payload
FROM audit_events
WHERE tenant_id = '<tid>' AND user_id = '<uid>'
  AND created_at > now() - interval '24 hours'
ORDER BY created_at DESC;
```

### 8.4 Inspect Tenant Storage Footprint

```sql
SELECT
  t.slug,
  count(DISTINCT d.id) AS documents,
  count(c.id) AS chunks,
  pg_size_pretty(sum(pg_column_size(c.content) + pg_column_size(c.embedding_bge))) AS approx_size
FROM tenants t
LEFT JOIN documents d ON d.tenant_id = t.id
LEFT JOIN chunks c ON c.tenant_id = t.id
GROUP BY t.slug
ORDER BY count(c.id) DESC;
```

### 8.5 Verify RLS Is Active on All Tenant-Scoped Tables

```sql
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname IN ('documents','chunks','conversations','messages',
                  'citations','usage_events','audit_events','api_keys')
ORDER BY relname;
```

Both `relrowsecurity` and `relforcerowsecurity` MUST be `true` for every row.

### 8.6 Check Circuit Breaker State

```bash
curl https://api.atlas.example.com/metrics | grep atlas_circuit_breaker_state
# 0=closed, 1=half-open, 2=open
```

### 8.7 Replay a Failed Ingestion Job

```bash
# Find failed documents
psql -c "SELECT id, title, failure_reason FROM documents WHERE status='failed' ORDER BY uploaded_at DESC LIMIT 20;"

# Re-enqueue
curl -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  https://api.atlas.example.com/v1/documents/<id>/reindex
```

---

## 9. Maintenance Tasks

### 9.1 Backups

| What | Frequency | Owner | Retention |
|---|---|---|---|
| Postgres logical dump | Daily 02:00 UTC | Neon (managed) | 30 days |
| Postgres PITR | Continuous | Neon (managed) | 7 days |
| Object store (R2) | Versioned by default | Cloudflare | Lifecycle: 90 days |
| Eval reports | On every nightly run | GitHub repo | Forever (git) |

**Restore drill:** quarterly. Restore latest backup to a scratch Neon project, run the test suite against it, confirm RLS still works.

### 9.2 Certificate Rotation

- TLS: managed by Fly.io / Vercel; auto-renewed.
- JWT signing key: rotate annually via `JWT_SECRET` env var. Old tokens become invalid; users re-login.
- API keys: customer-managed via `/v1/api-keys`.

### 9.3 Data Retention

Cron jobs (run via Fly cron machines or GitHub Actions schedule):

| Job | Schedule | Action |
|---|---|---|
| `purge_old_audit_events` | Daily | Delete `audit_events` older than 365 days |
| `purge_old_usage_events` | Daily | Aggregate `usage_events` older than 90 days into monthly summary; delete raw rows |
| `gc_orphan_chunks` | Daily | Delete `chunks` whose `document_id` no longer exists (should be impossible due to FK cascade, but guard against bugs) |
| `gc_object_store` | Weekly | Delete objects whose corresponding `documents` row was deleted |
| `gc_checkpoints` | Daily | Delete LangGraph checkpoints older than 24h |

### 9.4 Dependency Updates

- **Patch dependencies:** weekly via Dependabot PRs; auto-merged after CI green.
- **Minor dependencies:** monthly via grouped Dependabot PRs; merged after manual review.
- **Major dependencies (LangGraph, FastAPI, Next.js, Pydantic, SQLAlchemy):** quarterly, with a dedicated upgrade branch and full eval run.

### 9.5 Secret Rotation

| Secret | Frequency | Procedure |
|---|---|---|
| `ANTHROPIC_API_KEY` | Quarterly | Generate new key in Anthropic console; rotate via `flyctl secrets set`; verify; revoke old |
| `OPENAI_API_KEY` | Quarterly | Same pattern |
| `COHERE_API_KEY` | Quarterly | Same |
| `JWT_SECRET` | Annually | Generate; set as `JWT_SECRET_NEXT`; deploy; switch to `JWT_SECRET=JWT_SECRET_NEXT`; users re-login |
| DB password | Annually | Rotate via Neon console; update connection string secret |

---

## 10. Disaster Recovery

### 10.1 RTO and RPO Targets

| Scenario | RTO (Recovery Time) | RPO (Data Loss) |
|---|---|---|
| API process loss | 5 min (auto-restart) | 0 |
| Region loss (Fly) | 30 min (failover region) | 0 |
| Postgres primary loss | 1 hour (Neon failover) | < 5 min |
| Postgres total loss | 4 hours (restore from backup) | < 24 hours |
| Object store loss | 4 hours (restore from R2 lifecycle) | < 7 days for deleted; 0 for current |
| Full account compromise | Variable | Variable |

### 10.2 Postgres Restore from Backup

```bash
# 1. Create scratch project in Neon
neonctl projects create --name atlas-restore-$(date +%s)

# 2. Restore from PITR or daily backup
neonctl branches create --project-id <scratch> --from-snapshot <snapshot_id>

# 3. Run RLS verification suite against it
psql "$RESTORE_URL" -f tests/rls_verify.sql

# 4. Cut over by updating DATABASE_URL secret
flyctl secrets set DATABASE_URL="$RESTORE_URL" -a atlas-api -a atlas-ingestion-worker
```

### 10.3 Account Compromise Procedure

If credentials for Fly, Neon, GitHub, or any provider are suspected compromised:

1. **Immediately rotate the affected credential** in the provider console.
2. **Force re-login for all users** by rotating `JWT_SECRET`.
3. **Audit recent activity:** check `audit_events` and provider audit logs for the past 90 days.
4. **Revoke and re-issue all API keys** (`UPDATE api_keys SET revoked_at = now()`; notify affected tenants).
5. **Open a security incident document** under `docs/incidents/security-*`.
6. **Notify affected tenants** within 72 hours per GDPR-style guidelines (even if not legally required).

---

## 11. Escalation & Contacts

### 11.1 Escalation Order

1. **Primary on-call** — pager
2. **Secondary on-call** — pager after 15 min unack
3. **Engineering lead** — phone after 30 min unack
4. **Project owner** — phone for SEV1 only

### 11.2 External Contacts

| Provider | Support channel | SLA |
|---|---|---|
| Fly.io | support@fly.io | Best effort (free), 24h (paid) |
| Neon | support@neon.tech | 24h (paid) |
| Upstash | console chat | 24h |
| Anthropic | console support | Per plan |
| OpenAI | help@openai.com | Per plan |
| Cohere | support@cohere.com | Per plan |
| Cloudflare | dash chat | Per plan |
| Vercel | dash chat | Per plan |

### 11.3 Internal Channels

| Channel | Purpose |
|---|---|
| `#atlas-incidents` | Active incident war room |
| `#atlas-on-call` | On-call shift handoffs |
| `#atlas-security` | Security incidents only |
| `#atlas-deploys` | Deploy notifications |
| `#atlas-dev` | Engineering chat |

### 11.4 Status Page

- Public: `https://status.atlas.example.com`
- Editor: `https://manage.statuspage.io/...` (credentials in 1Password vault)
- Auto-updated by Grafana alerts mapped via webhook

---

## Appendix A: Common Commands Cheat Sheet

```bash
# === Fly ===
flyctl status -a atlas-api                  # current state
flyctl logs -a atlas-api                    # tail logs
flyctl scale count 4 -a atlas-api           # scale replicas
flyctl machine restart -a atlas-api --select
flyctl deploy --image <ref> -a atlas-api    # deploy specific image
flyctl secrets set KEY=value -a atlas-api
flyctl releases -a atlas-api | head -5

# === Postgres ===
psql "$DATABASE_URL_RO"                     # read-only prod
\dt                                          # list tables
\d+ chunks                                   # describe table
SELECT pg_stat_activity FROM pg_stat_activity WHERE state='active';

# === Redis ===
redis-cli -u "$REDIS_URL" ping
redis-cli -u "$REDIS_URL" info memory
redis-cli -u "$REDIS_URL" llen arq:queue:default

# === Helm (if using Path C) ===
helm list -n atlas
helm rollback atlas <revision> -n atlas
helm get values atlas -n atlas
kubectl logs -n atlas -l app=atlas-api --tail=100 -f
kubectl get pods -n atlas
kubectl describe pod -n atlas <pod>

# === LangSmith ===
# Web only — no useful CLI. Bookmark project URL.

# === Atlas-specific ===
curl https://api.atlas.example.com/healthz
curl https://api.atlas.example.com/readyz
curl https://api.atlas.example.com/metrics | grep atlas_

# === Eval ===
uv run atlas-eval run --dataset smoke
uv run atlas-eval compare --baseline main
```

---

## Appendix B: Glossary

| Term | Meaning |
|---|---|
| MTTA | Mean Time To Acknowledge — how long from page to ack |
| MTTR | Mean Time To Resolve |
| SLO | Service Level Objective — target reliability |
| SLI | Service Level Indicator — measurement |
| RTO | Recovery Time Objective — how fast we restore |
| RPO | Recovery Point Objective — how much data we can lose |
| IC | Incident Commander |
| PITR | Point-In-Time Recovery |
| RLS | Row-Level Security (Postgres) |

---

*End of document — Atlas Runbook v1.0. This document is living. Every incident should result in either a new playbook here or an edit to an existing one.*

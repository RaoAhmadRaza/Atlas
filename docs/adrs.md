# Atlas — Architecture Decision Records (ADRs)

This document collects the major architecture decisions made for Atlas v1.0. Each ADR records the *context*, the *decision*, the *alternatives considered*, the *consequences*, and the *status*. ADRs are immutable once accepted — future changes are recorded as new ADRs that supersede earlier ones.

## ADR Index

| # | Title | Status | Date |
|---|---|---|---|
| [0001](#adr-0001-use-postgresql-row-level-security-for-tenant-isolation) | Use PostgreSQL Row-Level Security for Tenant Isolation | Accepted | 2026-01-15 |
| [0002](#adr-0002-use-pgvector-as-primary-vector-store) | Use pgvector as Primary Vector Store | Accepted | 2026-01-18 |
| [0003](#adr-0003-use-langgraph-for-query-orchestration) | Use LangGraph for Query Orchestration | Accepted | 2026-01-22 |
| [0004](#adr-0004-hybrid-retrieval-with-reciprocal-rank-fusion) | Hybrid Retrieval with Reciprocal Rank Fusion | Accepted | 2026-01-25 |
| [0005](#adr-0005-bge-large-as-default-embedder-bge-reranker-as-default-reranker) | BGE-large as Default Embedder, BGE-reranker as Default Reranker | Accepted | 2026-01-28 |
| [0006](#adr-0006-paired-bootstrap-for-eval-statistical-significance) | Paired Bootstrap for Eval Statistical Significance | Accepted | 2026-02-02 |
| [0007](#adr-0007-monorepo-with-uv-and-pnpm-workspaces) | Monorepo with uv and pnpm Workspaces | Accepted | 2026-02-05 |
| [0008](#adr-0008-server-sent-events-over-websockets-for-streaming) | Server-Sent Events over WebSockets for Streaming | Accepted | 2026-02-08 |
| [0009](#adr-0009-three-deployment-paths-docker-compose-managed-cloud-helm) | Three Deployment Paths: Docker Compose, Managed Cloud, Helm | Accepted | 2026-02-12 |
| [0010](#adr-0010-citation-verifier-loop-instead-of-post-hoc-faithfulness-scoring) | Citation Verifier Loop Instead of Post-Hoc Faithfulness Scoring | Accepted | 2026-02-15 |
| [0011](#adr-0011-mcp-server-as-separate-process) | MCP Server as Separate Process | Accepted | 2026-02-18 |
| [0012](#adr-0012-arq-over-celery-for-the-job-queue) | arq over Celery for the Job Queue | Accepted | 2026-02-20 |
| [0013](#adr-0013-no-fine-tuning-in-v10) | No Fine-Tuning in v1.0 | Accepted | 2026-02-22 |
| [0014](#adr-0014-apache-20-license) | Apache 2.0 License | Accepted | 2026-02-25 |

---

## ADR-0001: Use PostgreSQL Row-Level Security for Tenant Isolation

**Status:** Accepted
**Date:** 2026-01-15
**Deciders:** Engineering

### Context

Atlas is a multi-tenant SaaS-shaped platform. Every chunk, document, conversation, and message belongs to exactly one tenant, and cross-tenant data leakage would be a catastrophic failure — both reputationally and legally. The team had to choose where in the stack to enforce tenant boundaries.

In multi-tenant systems, isolation is typically enforced in one of four places:

1. **Application code** — every query has `WHERE tenant_id = ?`. Standard practice.
2. **ORM layer** — the ORM injects tenant filters via a session-level hook.
3. **Database row-level security (RLS)** — the database itself refuses to return rows that don't match the tenant context.
4. **Schema-per-tenant** — each tenant has its own schema or database.

The risk profile differs sharply across these. Application-layer filtering means a single missing `WHERE` clause leaks data. ORM-layer filtering is better but only works as long as everyone uses the ORM. Schema-per-tenant gives the strongest isolation but explodes operationally past a few dozen tenants.

### Decision

Atlas enforces tenant isolation at the database layer using PostgreSQL Row-Level Security. Every queryable table has `tenant_id UUID NOT NULL` and `ENABLE ROW LEVEL SECURITY` with `FORCE ROW LEVEL SECURITY` so the table owner is also constrained. Each request begins its transaction with `SET LOCAL app.current_tenant = '<uuid>'`, and policies reference `current_setting('app.current_tenant', true)::uuid`.

### Alternatives Considered

- **Application-layer filtering.** Rejected: a single bug leaks data. This is the *most common* multi-tenant bug class. We refuse to depend on developer discipline at this layer for a security boundary.
- **ORM-layer filtering via SQLAlchemy events.** Rejected: doesn't protect raw SQL, doesn't protect background workers that bypass the ORM, doesn't survive a junior contributor copy-pasting a query.
- **Schema-per-tenant.** Rejected: connection pool fragmentation, migration multiplication (N tenants × M migrations), inability to support efficient cross-tenant analytics for the eval harness. Defensible at 5 tenants, untenable at 500.
- **Database-per-tenant.** Rejected for the same reasons as schema-per-tenant, only more so.

### Consequences

**Positive:**
- A single point of enforcement at the database layer. Application bugs cannot leak data.
- Background workers and the MCP server inherit the same enforcement automatically as long as they set the tenant GUC.
- The Postgres planner uses the `tenant_id` predicate the policy injects, so queries remain efficient.
- The pattern is a strong signal of senior engineering judgment in code review.

**Negative:**
- Slightly more complex DB session management — every connection acquisition must `SET LOCAL` first.
- Migrations must explicitly enable RLS and create policies for new tables (mitigated by a custom Alembic operation).
- An accidentally-missing `SET LOCAL` returns zero rows rather than all rows — a confusing failure mode on first encounter, but the safe direction.
- Eval and admin tasks that legitimately span tenants need a separate `admin_session()` with a privileged role, which must be carefully gated.

### Compliance Check

A required RLS test suite runs in CI: insert as tenant A, query as tenant B, assert zero rows. Repeated for SELECT, UPDATE, DELETE, and the unset-context case. Failure of any of these blocks merge.

---

## ADR-0002: Use pgvector as Primary Vector Store

**Status:** Accepted
**Date:** 2026-01-18
**Deciders:** Engineering

### Context

Atlas needs an approximate nearest-neighbor (ANN) index over embeddings. The market splits into:

- **Embedded in Postgres:** pgvector
- **Standalone open source:** Qdrant, Weaviate, Milvus
- **Managed:** Pinecone, Vespa Cloud, MongoDB Atlas Vector Search

Atlas's expected scale at launch is well under 10M vectors per tenant, with total system scale on the order of 100M vectors. Latency target is p95 < 1.5s end-to-end, of which the ANN step is one component.

### Decision

Use pgvector as the primary, production vector store. Mirror writes to Qdrant behind a feature flag for benchmarking and for the eval matrix only. The public API does not expose backend selection in v1.0.

### Alternatives Considered

- **Qdrant as primary.** Rejected for v1.0: adds a second stateful service to operate, doubles the surface area for tenant isolation enforcement (Qdrant has its own collection-level access model), and the recall delta we measured (<1pp at our scale) doesn't justify the operational cost. Kept as a benchmark target.
- **Pinecone.** Rejected: managed service with per-query cost that scales poorly with the low cost-per-query target. Vendor lock-in and lack of self-hosting story conflicts with the open-source positioning.
- **Weaviate.** Rejected: heavier operational footprint than Qdrant for similar recall.

### Consequences

**Positive:**
- One fewer stateful service to operate, monitor, back up, and secure.
- Tenant isolation inherits automatically from Postgres RLS — no separate enforcement layer for the vector store.
- Single transaction for chunk content + embedding write — no two-phase commit or eventual consistency between content store and vector store.
- HNSW index in pgvector ≥ 0.7 is competitive with standalone vector DBs at our scale.

**Negative:**
- HNSW index build is expensive on large tables — requires `CREATE INDEX CONCURRENTLY` operationally.
- Above ~50M vectors per index, recall and latency may degrade compared to specialized stores. We expect to revisit this if any single tenant approaches that scale.
- Less flexibility around vector quantization, filtering DSL, and payload indexing than Qdrant offers.

### Revisit Trigger

Reopen this ADR if any single tenant exceeds 20M chunks, or if p95 ANN latency exceeds 200ms.

---

## ADR-0003: Use LangGraph for Query Orchestration

**Status:** Accepted
**Date:** 2026-01-22
**Deciders:** Engineering

### Context

The query pipeline has seven stages with branching: rewrite → parallel retrieve → fuse → rerank → compress → generate → verify, with a conditional loop back to generate on verification failure. We need orchestration that supports:

- Per-node streaming to the frontend (the user should see "rewriting → retrieving → reranking → answering" progress).
- Checkpointing so a crashed query is resumable without re-running expensive steps.
- Native tracing integration with LangSmith.
- Conditional edges for the verifier retry loop.

### Decision

Use LangGraph (`langgraph>=0.2`) as the query orchestrator. Compile the graph with a `PostgresCheckpointer` so checkpoints persist across worker restarts. Tag every node with LangSmith metadata for free tracing.

### Alternatives Considered

- **Hand-rolled orchestration with asyncio and explicit state classes.** Rejected: we'd reinvent checkpointing, retry semantics, and tracing — a multi-week diversion that produces a worse, less-debuggable result.
- **Temporal / Inngest / Restate.** Rejected: durable workflow engines optimized for hour/day-scale workflows. Atlas queries complete in seconds; the overhead and operational complexity don't pay back.
- **LlamaIndex Workflows.** Rejected: less mature than LangGraph at decision time, weaker conditional edge ergonomics, and the team's familiarity with LangChain tooling tipped the balance.
- **Direct LangChain Runnables.** Rejected: lacks first-class state, conditional edges become awkward, and the streaming story is weaker for a graph with parallel branches.

### Consequences

**Positive:**
- Per-node streaming and checkpointing come for free.
- LangSmith traces are emitted by every node without explicit instrumentation.
- The verifier retry loop is a clean two-line conditional edge.
- Adding new nodes (e.g., a query classifier in v1.1) is mechanical.

**Negative:**
- Bound to LangGraph's API surface, which is evolving. Pin the version and review release notes monthly.
- Adds a heavy dependency tree to the API service.
- TypedDict-based state has less type safety than Pydantic models would; we accept this for compatibility with LangGraph internals.

### Risk Mitigation

Pin `langgraph` to a specific minor version. Maintain a thin abstraction layer in `packages/atlas-core/orchestration/` so a future migration off LangGraph would require changing one module rather than every node.

---

## ADR-0004: Hybrid Retrieval with Reciprocal Rank Fusion

**Status:** Accepted
**Date:** 2026-01-25
**Deciders:** Engineering

### Context

A pure dense retriever excels at semantic matching but loses on exact phrases, named entities, acronyms, code identifiers, and rare technical terms. A pure BM25 retriever does the opposite. Combining them generally outperforms either alone — but how to combine them is a real choice.

Common fusion methods:

1. **Reciprocal Rank Fusion (RRF):** `score = Σ 1/(k + rank)`. Rank-based, parameter-light.
2. **Weighted score combination:** `score = α·dense_score + (1-α)·bm25_score`. Requires score normalization across very different distributions.
3. **Learned fusion:** train a model to combine signals. Requires labeled data and infrastructure.

### Decision

Use Reciprocal Rank Fusion with `k=60` to combine BM25 and dense retrieval. Both retrievers fetch their top-30; RRF fuses to a single top-30; the reranker reduces to top-8.

### Alternatives Considered

- **Weighted score combination.** Rejected: requires non-trivial calibration. Dense cosine similarities and BM25 `ts_rank_cd` outputs have different scales and distributions per query. Calibrating α per tenant or per query type is a research problem we don't need to solve.
- **Learned fusion.** Deferred to post-v1.0. Requires the eval dataset to be larger and to have explicit relevance grades.
- **Cross-encoder as the only ranker (no fusion).** Rejected: cross-encoders are too slow to score the full corpus. Fusion + rerank is the right two-stage architecture.

### Consequences

**Positive:**
- Parameter-light: `k=60` is a well-studied default from the original RRF paper and is robust across domains.
- No score normalization needed.
- Works with any underlying retriever pair without tuning.
- Implementation is ~15 lines of code.

**Negative:**
- Loses the magnitude information from each retriever's score; rank position is all that matters.
- If one retriever is dramatically better than the other on a specific query, RRF still gives both equal weight by rank.
- The reranker is the layer that's responsible for fine-grained quality, not RRF.

### Validation

The eval matrix includes `baseline` (dense only) vs `+bm25` (Hybrid+RRF) as a paired ablation. The published eval report quantifies the RRF uplift.

---

## ADR-0005: BGE-large as Default Embedder, BGE-reranker as Default Reranker

**Status:** Accepted
**Date:** 2026-01-28
**Deciders:** Engineering

### Context

The choice of default embedder and reranker shapes Atlas's cost model and self-hostability. The leading options at decision time:

| Role | Open-source default | Commercial alternative |
|---|---|---|
| Embedder | BGE-large-en-v1.5 (BAAI) | OpenAI text-embedding-3-large |
| Reranker | BGE-reranker-v2-m3 (BAAI) | Cohere rerank-english-v3.0 |

### Decision

Default both to BGE. Make the OpenAI embedder and Cohere reranker first-class supported alternatives, configurable per-tenant.

### Alternatives Considered

- **Default to OpenAI / Cohere.** Rejected: makes the live demo's monthly cost target ($25/month) impossible, breaks the "self-hosted at $0 marginal cost" narrative, and conflicts with the open-source positioning.
- **Support only BGE.** Rejected: the eval matrix needs commercial alternatives as comparison points; some users will already have OpenAI credentials and prefer them.

### Consequences

**Positive:**
- Marginal compute cost per query is $0 in the default configuration.
- The eval can publish a head-to-head: "did OpenAI beat BGE on your domain?" — interesting content, regardless of outcome.
- Tenants who care about latency or have unusual domains can swap in commercial alternatives without code changes.

**Negative:**
- Self-hosting BGE adds ~2GB to the ingestion worker image and requires GPU or capable CPU to keep ingestion throughput at the 200 chunks/sec target.
- Model files must be vendored or pre-pulled during image build; we cannot rely on first-call download in production.

### Implementation Note

Both BGE and OpenAI embeddings are stored on every chunk in the eval corpus (different columns: `embedding_bge`, `embedding_openai`) to enable apples-to-apples ablation without re-ingesting. Production tenants only populate the embedding for their selected model.

---

## ADR-0006: Paired Bootstrap for Eval Statistical Significance

**Status:** Accepted
**Date:** 2026-02-02
**Deciders:** Engineering

### Context

The PRD demands that every retrieval improvement claim be backed by statistical confidence intervals, not point estimates. Available methods:

1. **Paired t-test.** Parametric, assumes normality of differences. Fast.
2. **Wilcoxon signed-rank test.** Non-parametric paired test.
3. **Paired bootstrap.** Resampling-based, non-parametric, gives confidence intervals directly.
4. **Permutation test.** Resampling-based, gives p-values directly.

### Decision

Use paired bootstrap with 10,000 resamples for every ablation. Report observed difference, 95% confidence interval, and p-value (computed as the two-sided proportion of bootstrap samples crossing zero).

### Alternatives Considered

- **Paired t-test.** Rejected: per-question score differences for ranked retrieval metrics are not normally distributed; we'd violate the test's assumptions.
- **Wilcoxon.** Acceptable but doesn't naturally produce a confidence interval, only a p-value.
- **Permutation test.** Acceptable; we chose bootstrap because the CI is the more useful artifact for the report ("we improved by X, between Y and Z") than a bare p-value.

### Consequences

**Positive:**
- Confidence intervals are the headline format the eval report leads with.
- Non-parametric: no assumptions to violate or defend.
- Reproducible: deterministic seed makes the same data yield the same CI.
- The implementation is ~15 lines of numpy.

**Negative:**
- 10K resamples × 8 configurations × ~5 metrics adds ~15 seconds to the eval pipeline. Not a hot path; acceptable.
- Bootstrap CIs are approximate; for very small N they can be misleading. Our N=1000 makes this irrelevant.

### Reporting Standard

Every comparison in published reports MUST follow this format:

> Δ recall@5: +0.184 (95% CI [+0.151, +0.217], p<0.001, n=1000, 10K bootstrap resamples)

---

## ADR-0007: Monorepo with uv and pnpm Workspaces

**Status:** Accepted
**Date:** 2026-02-05
**Deciders:** Engineering

### Context

Atlas spans Python (API, workers, eval) and TypeScript (frontend). Code is naturally shared (Pydantic schemas → Zod schemas; eval logic also used by API), and changes often span both ecosystems. Repository topology choices:

1. **Single repo, single language tree, separate workspaces.**
2. **Monorepo with language-specific workspace managers.**
3. **Multi-repo, one per app.**

### Decision

Single monorepo at `github.com/<owner>/atlas`, with `uv` workspaces managing Python packages and `pnpm` workspaces managing Node packages. Top-level layout per the TRD §3.

### Alternatives Considered

- **Multi-repo.** Rejected: synchronizing schema changes across `atlas-api`, `atlas-web`, and `atlas-schemas` repositories would require coordinated tagging and version bumping for every cross-cutting change. The friction is not worth it for a project this size.
- **Nx / Turborepo for cross-language task orchestration.** Rejected for v1.0: adds tooling complexity that doesn't pay back at our scale. We re-evaluate if CI runtime becomes a bottleneck.

### Consequences

**Positive:**
- Cross-cutting changes ship in a single PR.
- One CI configuration to maintain.
- Shared schemas have a single source of truth.
- Newcomers clone one repo and have everything.

**Negative:**
- CI must be smart about which jobs to run per change (path filters).
- Some IDE integrations need configuration to understand both workspaces.

### Discipline

The dependency rule (apps → packages, never packages → apps, never apps → apps) is enforced by an import-linter rule in CI.

---

## ADR-0008: Server-Sent Events over WebSockets for Streaming

**Status:** Accepted
**Date:** 2026-02-08
**Deciders:** Engineering

### Context

Atlas streams two kinds of events to the frontend:

1. **Query streaming:** stage updates ("rewriting", "retrieving", ...) plus token-by-token answer streaming.
2. **Ingestion progress:** chunks-embedded counter while a document processes.

The transport options are HTTP/2 + Server-Sent Events (SSE), WebSockets, and HTTP long-polling.

### Decision

Use Server-Sent Events for both query streaming and ingestion progress. No WebSockets in v1.0.

### Alternatives Considered

- **WebSockets.** Rejected: bidirectional channel we don't need (the client never streams data to the server), more complex client-side reconnection logic, less friendly to HTTP/2 multiplexing, and inferior compatibility with HTTP proxies / load balancers.
- **HTTP long-polling.** Rejected: higher latency and worse server-side resource utilization than SSE.

### Consequences

**Positive:**
- Standard HTTP, works through every proxy and load balancer.
- Auto-reconnect is built into the browser EventSource API.
- Easy to test with `curl`.
- Plays well with the Vercel AI SDK's streaming primitives.

**Negative:**
- SSE is unidirectional; if a future feature needs bidirectional streaming (e.g., live agent collaboration), we'll need to revisit.
- HTTP/1.1 has a 6-connections-per-origin limit; we standardize on HTTP/2 in production to avoid this.

### Reopening Trigger

Add WebSockets only if a future feature requires bidirectional streaming and SSE+POST cannot model it cleanly.

---

## ADR-0009: Three Deployment Paths: Docker Compose, Managed Cloud, Helm

**Status:** Accepted
**Date:** 2026-02-12
**Deciders:** Engineering

### Context

Atlas's audience is heterogeneous: a developer evaluating it locally, a small team wanting a hosted demo, and a platform engineer deploying to their company's Kubernetes cluster. A single deployment path serves none of them well.

### Decision

Officially support three deployment paths, each with first-class documentation and verified before launch:

1. **Path A — Local:** `docker compose up` to a working stack in <5 minutes.
2. **Path B — Managed cloud:** Fly.io + Neon + Vercel + R2 + Upstash live demo at ≤$25/month.
3. **Path C — Self-host:** Helm chart for any conformant Kubernetes cluster.

### Alternatives Considered

- **Single path (Docker Compose only).** Rejected: undersells the project as a "toy"; senior reviewers expect a Helm chart.
- **Single path (Kubernetes only).** Rejected: barrier to entry too high for casual evaluators.
- **Adding a Terraform module.** Deferred: useful but not differentiating for v1.0.

### Consequences

**Positive:**
- Every category of user has a documented path.
- The Helm chart specifically signals seriousness to enterprise reviewers.
- The live demo path produces a public URL that drives evaluation.

**Negative:**
- Three paths × `docs/deployment.md` is 3× the documentation surface area.
- Each path must be re-verified before each release.

### Validation Gate

Before any tagged release, all three paths MUST be reproduced end-to-end by someone other than the author (typically a recruited friend). A signed-off `RELEASE_CHECKLIST.md` records this.

---

## ADR-0010: Citation Verifier Loop Instead of Post-Hoc Faithfulness Scoring

**Status:** Accepted
**Date:** 2026-02-15
**Deciders:** Engineering

### Context

Hallucinated citations — answers that claim support from chunks that don't actually contain the claim — are a primary failure mode of RAG systems. Two ways to handle them:

1. **Post-hoc faithfulness scoring.** Run faithfulness eval (ragas) periodically; surface degradation in dashboards; never block a query in flight.
2. **In-line citation verification loop.** After generation, verify each `[^n]` claim against its cited chunk; if any fail, regenerate with feedback. Capped retries.

### Decision

Both. The eval harness measures faithfulness on the golden set (offline, statistical confidence). The query pipeline also runs an in-line verifier loop (online, per-query) using a cheap Claude Haiku call.

### Alternatives Considered

- **Verifier only, no offline metric.** Rejected: we lose the ability to track quality drift over time.
- **Offline metric only, no verifier.** Rejected: the verifier catches roughly 6% of unsupported citations that would otherwise reach the user. That's a meaningful real-time improvement.
- **More than 2 retry loops.** Rejected: diminishing returns and latency cost.

### Consequences

**Positive:**
- Users see fewer hallucinations.
- Adds a measurable success metric ("verifier catch rate") that goes in the eval report.
- The retry-with-feedback pattern is a clean illustration of LLM self-correction — good for the technical narrative.

**Negative:**
- Adds ~150-300ms to p95 latency (one Haiku call per citation).
- Adds ~$0.0001 per query.
- A buggy verifier (e.g., systematically returning NO) could degrade UX. Mitigated by capping retries at 2 and shipping the answer with a warning flag if the final attempt still fails verification.

### Cost Containment

Verifier calls use Haiku (the cheapest tier), not the same model that generated the answer. This keeps verifier cost ~5% of generation cost.

---

## ADR-0011: MCP Server as Separate Process

**Status:** Accepted
**Date:** 2026-02-18
**Deciders:** Engineering

### Context

The MCP server exposes Atlas's RAG capability to external agents (Claude Desktop, Cursor, custom agents). It needs to authenticate via API keys (not JWTs), can have very different scaling characteristics than the main API, and must share the database and embedding logic with the main API.

### Decision

The MCP server is a separate deployable process (`apps/mcp-server/`) that imports from `packages/atlas-core` but not from `apps/api`. It scales independently and authenticates via tenant-scoped API keys.

### Alternatives Considered

- **Mount MCP routes inside the main API.** Rejected: couples scaling of two very different traffic patterns, mixes authentication mechanisms (JWT vs API key) at the same listener, and complicates the resource accounting for the live demo.
- **Embed the MCP server in the Next.js frontend.** Rejected: MCP is a backend protocol; routing it through the frontend would add latency for no gain.

### Consequences

**Positive:**
- The MCP server can be deployed with smaller resource limits than the API.
- The API can be down for maintenance without affecting MCP traffic, and vice versa.
- Cleaner separation of authentication schemes.
- Listing the MCP server in the public registry creates inbound interest from the agent ecosystem.

**Negative:**
- Two processes to operate instead of one.
- Two sets of health checks, metrics, and logs.

### Shared Code Contract

The MCP server imports only from `packages/atlas-core/`. If MCP needs functionality currently in `apps/api/`, that functionality MUST be promoted into `packages/atlas-core/` first.

---

## ADR-0012: arq over Celery for the Job Queue

**Status:** Accepted
**Date:** 2026-02-20
**Deciders:** Engineering

### Context

The ingestion worker is asynchronous: file uploads return 202 quickly, ingestion happens in the background. A job queue is needed. Options:

1. **arq** — Redis-backed, async-first, lightweight.
2. **Celery** — feature-complete, multi-broker, ecosystem-rich, but synchronous-first.
3. **RQ** — Redis-backed, simple, but synchronous.
4. **Postgres-backed (e.g., `pgqueue`, `procrastinate`)** — no extra service.

### Decision

Use `arq` (Redis-backed) as the v1.0 job queue. Revisit Postgres-backed if Redis cost spikes or operational simplicity becomes more important than throughput.

### Alternatives Considered

- **Celery.** Rejected for v1.0: heavyweight, async support is bolted on, and the project's "best practices" landscape moves slowly. arq is purpose-built for asyncio.
- **Postgres-backed (e.g., `procrastinate`).** Strong contender — would remove Redis as a hard dependency for the job queue specifically. We already use Redis for caching and rate limiting, so the marginal cost is zero. Kept as the fallback if Redis becomes a concern.
- **RQ.** Rejected: synchronous; doesn't compose with our async codebase.

### Consequences

**Positive:**
- Async-first; integrates with the existing FastAPI/asyncpg/redis-py stack with no thread-pool gymnastics.
- Simple worker lifecycle, predictable resource use.
- Lightweight enough that the worker pod can run with modest resources.

**Negative:**
- Smaller ecosystem than Celery; fewer prewritten integrations (Sentry, Datadog, etc.).
- Less battle-tested at extreme scale.

### Revisit Trigger

Move to Postgres-backed if Redis costs become significant, or if a future requirement needs at-least-once delivery semantics across a transaction with Postgres writes (which Postgres-backed queues handle more cleanly).

---

## ADR-0013: No Fine-Tuning in v1.0

**Status:** Accepted
**Date:** 2026-02-22
**Deciders:** Engineering

### Context

It would be possible — and tempting — to add custom embedding fine-tuning, custom reranker fine-tuning, or LLM fine-tuning to Atlas v1.0. Each represents a meaningful uplift on the right corpus. But each also adds substantial complexity: training infrastructure, model versioning, dataset curation, and (often) GPU requirements.

### Decision

Atlas v1.0 uses only off-the-shelf models. No fine-tuning, no custom training, no LoRA adapters. The eval harness compares off-the-shelf alternatives but does not produce new model artifacts.

### Alternatives Considered

- **Fine-tune the BGE embedder on per-tenant data.** Rejected for v1.0: requires per-tenant training data, training infrastructure, model versioning, and per-tenant model serving. None of which we are positioned to operate at our scale.
- **Fine-tune the reranker.** Rejected for the same reasons.
- **Add a "bring your own fine-tuned model" hook.** Deferred to post-v1.0.

### Consequences

**Positive:**
- Sharp scope. Atlas ships in 10–14 weeks instead of 6 months.
- The story remains coherent: "the system gets the most out of off-the-shelf components, measured rigorously."
- No GPU operations to manage in production.

**Negative:**
- Atlas leaves quality improvements on the table that fine-tuning would unlock.
- For specialized domains (legal, biomedical) where general-purpose embeddings underperform, Atlas's headline quality numbers will trail what's possible.

### Post-v1.0 Path

If fine-tuning is added later, it goes into a separate `atlas-train` package, runs out-of-band of normal ingestion, and produces versioned model artifacts that are loaded by the embedder/reranker abstractions.

---

## ADR-0014: Apache 2.0 License

**Status:** Accepted
**Date:** 2026-02-25
**Deciders:** Engineering

### Context

License choice affects both adoption and the contribution model. The realistic options for an open-source RAG platform:

1. **MIT** — maximally permissive, no patent grant.
2. **Apache 2.0** — permissive, explicit patent grant, standard for enterprise.
3. **AGPL** — copyleft, requires network-use sharing.
4. **BSL** (Business Source License) — source-available, time-delayed open source.
5. **Elastic License v2 / SSPL** — source-available, restricts SaaS competitors.

### Decision

Apache 2.0.

### Alternatives Considered

- **MIT.** Rejected: lacks an explicit patent grant. Apache 2.0 is more enterprise-friendly for the same permissive intent.
- **AGPL.** Rejected: scares away enterprise users and we have no commercial business model to protect with copyleft.
- **BSL or SSPL.** Rejected: source-available licenses undermine the open-source positioning that is the entire point of the project.

### Consequences

**Positive:**
- Apache 2.0 is the standard for enterprise-adopted open-source projects (Kubernetes, Kafka, Postgres extensions). It signals seriousness.
- Explicit patent grant clarifies a real risk that MIT leaves ambiguous.
- Allows commercial use, modification, and redistribution without forcing source disclosure.

**Negative:**
- Anyone can run a SaaS competitor on this code. We accept this — the goal is signal, adoption, and inbound interest, not a commercial moat.

### Required Headers

All source files SHOULD carry an SPDX license identifier:

```python
# SPDX-License-Identifier: Apache-2.0
```

A `LICENSE` file at the repo root contains the full Apache 2.0 text. A `NOTICE` file lists material attributions.

---

## Process for New ADRs

To add an ADR:

1. Copy the template below into a new section, numbered next-available (`ADR-NNNN`).
2. Status starts as `Proposed`. Set `Date` to today.
3. Open a PR for discussion. Two engineering reviewers required.
4. On merge, change status to `Accepted` and update the index table at the top.
5. To supersede an existing ADR, create a new ADR with status `Accepted` and edit the older one's status to `Superseded by ADR-NNNN`. Never delete or rewrite an accepted ADR.

### Template

```markdown
## ADR-NNNN: <Title>

**Status:** Proposed | Accepted | Superseded by ADR-NNNN | Deprecated
**Date:** YYYY-MM-DD
**Deciders:** <names or team>

### Context
<What problem are we facing? What forces are in play?>

### Decision
<What did we choose, in one or two sentences?>

### Alternatives Considered
- **Option A.** Why rejected.
- **Option B.** Why rejected.

### Consequences
**Positive:**
- ...

**Negative:**
- ...

### Revisit Trigger (optional)
<What conditions would cause us to reopen this ADR?>
```

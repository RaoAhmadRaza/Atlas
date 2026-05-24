# Atlas — Product Requirements Document

**Production-Grade Multi-Tenant RAG Platform**
Hybrid Retrieval • Reranking • Eval Harness • Multi-Tenant Isolation

| | |
|---|---|
| **Version** | 1.0 |
| **Status** | Draft for Review |
| **Owner** | Engineering |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement & Background](#2-problem-statement--background)
3. [Goals & Non-Goals](#3-goals--non-goals)
4. [System Architecture](#4-system-architecture)
5. [Functional Requirements](#5-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Data Model](#7-data-model)
8. [Retrieval Pipeline Specification](#8-retrieval-pipeline-specification)
9. [Evaluation Harness](#9-evaluation-harness)
10. [User Experience Specifications](#10-user-experience-specifications)
11. [Deployment Specifications](#11-deployment-specifications)
12. [Roadmap & Phasing](#12-roadmap--phasing)
13. [Risks & Mitigations](#13-risks--mitigations)
14. [Success Metrics & Launch Criteria](#14-success-metrics--launch-criteria)
15. [Appendices](#15-appendices)

---

## 1. Executive Summary

Atlas is an open-source, production-grade Retrieval-Augmented Generation (RAG) platform engineered to demonstrate senior-level engineering rigor in five dimensions that most RAG projects neglect: measured retrieval quality, multi-tenant data isolation, an automated evaluation harness, production observability, and deployable artifacts.

Unlike typical "chat with your PDF" demos, Atlas is built around a measurement-first philosophy. Every retrieval decision is justified by paired-bootstrap confidence intervals over a 1,000-question benchmark, regressions are gated in CI, and the system ships with three documented deployment paths (Docker Compose, managed cloud, and a Kubernetes Helm chart).

### 1.1 Vision Statement

Build the reference implementation of a production RAG system — one that a stranger can deploy, evaluate, and trust within a single afternoon, and that anchors the engineer's professional identity as someone who builds AI systems with measurement discipline.

### 1.2 Strategic Positioning

Atlas differentiates from competitors in the open-source RAG ecosystem through four engineering signals:

- **Measured improvements:** Statistical confidence intervals on every retrieval ablation — not subjective claims.
- **Database-level tenant isolation:** PostgreSQL Row-Level Security (RLS) enforces tenant boundaries below the application layer.
- **CI-gated evaluation:** A 1,000-question regression eval runs on every release; PRs run a 100-question smoke eval.
- **Operational completeness:** Helm chart, Docker Compose, live demo, MCP server integration, and cost dashboards out of the box.

### 1.3 Headline Success Metrics

| Dimension | Target | Measurement Method |
|---|---|---|
| Retrieval recall@5 | ≥ 0.85 | 1,000-question golden set |
| Retrieval recall@10 | ≥ 0.92 | 1,000-question golden set |
| Generation faithfulness | ≥ 0.90 | ragas faithfulness metric |
| Answer relevancy | ≥ 0.85 | ragas relevancy metric |
| System p95 latency | < 1.5 seconds | Live production traffic |
| Cost per query | < $0.001 | Tracked per-query in CostTracker |
| Reranker uplift | ≥ +15 absolute pts recall@5 | Paired bootstrap, 95% CI excludes 0 |
| Full eval runtime | < 15 minutes | CI workflow runtime |

---

## 2. Problem Statement & Background

### 2.1 The Problem Space

Most RAG implementations available publicly suffer from systematic shortcomings that prevent them from being credible in production environments or as portfolio artifacts for senior engineering roles:

- **No measurement discipline.** Claims like "works well" or "improved retrieval" appear without confidence intervals, baselines, or reproducible benchmarks.
- **Application-layer tenancy.** Tenant filtering lives in Python `WHERE` clauses, where a single missing predicate exposes another tenant's data.
- **No regression protection.** Changes to chunking, embedding models, or prompts ship without anyone knowing whether quality degraded.
- **Opaque internals.** Users see an answer but cannot inspect which chunks were retrieved, how they were ranked, or whether citations are grounded.
- **Demo-only deployment.** "Run this notebook" rather than "helm install this chart on your cluster."

### 2.2 Target Users

Atlas serves three primary user personas, each with distinct needs:

| Persona | Primary Use | Key Requirements |
|---|---|---|
| End User (Knowledge Worker) | Upload internal documents and chat with them; retrieve cited answers | Fast streaming, clear citations, source links, document management |
| Tenant Administrator | Configure embedding model, LLM, chunking strategy, daily budget per tenant | Settings UI, cost dashboards, usage analytics, model selection |
| Platform Engineer / Evaluator | Deploy Atlas, evaluate retrieval quality, integrate via MCP, customize pipeline | Eval reports, deploy guides, MCP server, observability traces, Helm chart |

### 2.3 Why Now

Three concurrent trends make Atlas timely:

1. The maturation of open-source rerankers (BGE-reranker-v2-m3) and embedding models (BGE-large) now match closed-source quality at near-zero marginal cost.
2. The Model Context Protocol (MCP) creates a standardized way for agents to consume RAG services.
3. Hiring managers across AI engineering teams increasingly require demonstrable measurement discipline, not just demo-level competence.

---

## 3. Goals & Non-Goals

### 3.1 In-Scope Goals (v1.0)

1. Ship a working hybrid retrieval system (BM25 + dense + RRF + reranker) with end-to-end query flow.
2. Enforce multi-tenant data isolation via PostgreSQL Row-Level Security from day one.
3. Build an automated eval harness covering retrieval metrics (recall@k, MRR, nDCG), generation metrics (ragas), and system metrics (latency, cost), with paired-bootstrap confidence intervals.
4. Provide three documented deployment paths: local Docker Compose, managed cloud, and Kubernetes via Helm chart.
5. Expose the RAG system over the Model Context Protocol so any MCP-compatible agent can query it.
6. Ship per-tenant cost tracking, daily budgets, and observability via LangSmith tracing and Prometheus metrics.
7. Publish a reproducible evaluation report demonstrating ≥15 absolute points of recall@5 uplift from reranking with statistical confidence.

### 3.2 Explicit Non-Goals (v1.0)

- **Multi-modal ingestion.** Image/video understanding is deferred to a later phase. v1.0 handles PDF, DOCX, MD, and HTML only.
- **Fine-tuning infrastructure.** Atlas uses off-the-shelf embedding and reranker models. Custom model training is out of scope.
- **GraphRAG / knowledge graph extraction.** Listed as a post-MVP enhancement.
- **Real-time collaborative editing.** Atlas is read-heavy; documents are uploaded asynchronously, not edited.
- **Per-user permissions within a tenant.** All users within a tenant see the same documents in v1.0. Document-level ACLs are deferred.
- **On-device or air-gapped operation.** Atlas assumes outbound internet for managed LLM calls in default configuration.

### 3.3 Definition of Done

Atlas v1.0 ships when a stranger can independently execute all of the following without contacting the maintainer:

- Visit the live demo URL, sign up, upload a PDF, and receive cited answers.
- Clone the repository and run `docker compose up`, reaching a working chat interface in under 5 minutes.
- Deploy Atlas to their own Kubernetes cluster with `helm install` using the published `values.yaml`.
- Read the eval report at `evals/reports/` and reproduce the headline numbers by running `atlas-eval run`.
- Connect a Claude Desktop or Cursor instance to the Atlas MCP server and successfully query its RAG.

---

## 4. System Architecture

### 4.1 High-Level Component Overview

Atlas is decomposed into seven logical components, each with clear ownership and contract boundaries:

| Component | Responsibility | Technology |
|---|---|---|
| Web Frontend | Auth, upload UI, chat UI, eval dashboard | Next.js 15, Vercel AI SDK |
| API Gateway | Auth, rate limiting, tenant resolution, tracing | FastAPI |
| Ingestion Service | Parse, chunk, embed, store documents | Python worker (async) |
| Query Service | Multi-step LangGraph DAG: rewrite → retrieve → rerank → generate → verify | LangGraph, LangSmith |
| Eval Service | Run benchmark suites and compute statistical results | Python CLI + ragas |
| MCP Server | Expose RAG capability to MCP-compatible agents | FastMCP |
| Data Layer | Postgres (chunks, RLS), Redis (cache), MinIO/R2 (objects) | Postgres 16 + pgvector |

### 4.2 Ingestion Data Flow

1. User uploads a document through the Next.js frontend (PDF, DOCX, MD, or HTML).
2. File is written to S3-compatible object storage (MinIO locally, Cloudflare R2 in production).
3. A `documents` row is created with `status=pending` and an ingestion job is enqueued in Redis or Postgres.
4. The ingestion worker picks up the job and parses content using Unstructured.io, with format-specific fallbacks (PyMuPDF, trafilatura, python-docx, markdown-it).
5. The semantic chunker splits content into 512-token chunks with 80-token overlap.
6. Both BGE-large-en-v1.5 and OpenAI text-embedding-3-large embeddings are computed (the tenant's configured model is used for retrieval; the other is stored for ablation).
7. Chunks and embeddings are written to Postgres in a single bulk transaction using `COPY` for performance; the `tenant_id` is set on every row.
8. A Postgres trigger materializes the `tsvector` column for BM25 retrieval.
9. Status updates are streamed to the frontend via Server-Sent Events (e.g., "47/120 chunks embedded").

### 4.3 Query Data Flow (LangGraph DAG)

Every query passes through a deterministic seven-stage directed acyclic graph orchestrated by LangGraph, with checkpointing in Postgres for resumability:

| Stage | Function | Output |
|---|---|---|
| 1. Rewrite | LLM rewrites question into 2–3 retrieval queries; handles coreference ("it/that/those") | List of rewritten queries |
| 2. Parallel Retrieve | BM25 and dense retrievers run concurrently; each returns top-30 | Two ranked chunk lists |
| 3. RRF Fusion | Reciprocal Rank Fusion combines both lists into a single unified ranking | Single fused list (top-30) |
| 4. Rerank | BGE-reranker-v2-m3 or Cohere Rerank scores top-30 and reduces to top-8 | Reranked list (top-8) |
| 5. Compress | Drops redundant chunks; fits remaining context to LLM token budget | Final context string |
| 6. Generate | Claude streams cited answer with `[^n]` citation markers | Answer + token usage |
| 7. Verify | Each `[^n]` claim is checked against its cited chunk using a cheap Haiku call; on failure, loop back to Generate (cap: 2 loops) | Verified answer or retry signal |

### 4.4 Why LangGraph

- **Checkpointing.** Postgres-backed checkpointer means a crashed query is resumable without re-running expensive retrieval steps.
- **Per-node streaming.** The frontend can display "rewriting → retrieving → reranking → answering" status as the graph executes.
- **Self-correction loops.** The verifier → generate conditional edge is a clean implementation of an LLM-correction pattern.
- **Native observability.** Every node automatically emits LangSmith traces.

---

## 5. Functional Requirements

### 5.1 Document Management

1. Users can upload PDF, DOCX, MD, and HTML documents up to 50MB through a drag-and-drop interface.
2. Upload progress is shown in real time; ingestion progress (chunks embedded) streams to the UI.
3. Users can list, delete, and reindex documents in their tenant.
4. Document status (`pending`, `processing`, `ready`, `failed`) is visible with failure reasons exposed.
5. Re-uploading the same document content is idempotent — chunks are not duplicated.

### 5.2 Chat & Retrieval

1. Users submit free-text queries against their tenant's document corpus.
2. Answers stream token-by-token using the Vercel AI SDK.
3. Each citation is rendered as a clickable `[1] [2] [3]` chip; clicking opens the source document at the cited page.
4. A "Show retrieval trace" expander reveals which chunks were retrieved, reranked, and used.
5. Conversations persist; users can view, resume, and delete past conversations.
6. Each query displays its cost (e.g., "$0.0007") and latency (e.g., "1.1s · 412 tokens").

### 5.3 Tenant Configuration

1. Each tenant has a settings page exposing embedding model selection (BGE-large or OpenAI), LLM selection (Claude variants), chunking strategy, daily budget cap, and reranker choice.
2. Changes to embedding model trigger a background reindex; users see reindex progress and are not blocked from querying with the prior model.
3. Exceeding the daily budget returns a 429 with a clear error and a documented `Retry-After` hint.

### 5.4 Authentication & Authorization

1. Users sign up with email and password (Clerk or Lucia).
2. JWT tokens carry `tenant_id` and `user_id` claims.
3. Every API request resolves the JWT, sets `app.current_tenant` for the DB transaction, and inherits RLS-enforced isolation.
4. Admin users within a tenant can manage settings; member users can only upload and query.

### 5.5 Evaluation Dashboard

1. A public `/app/evals` page renders the latest eval report visually: headline metrics, ablation chart, per-configuration breakdown.
2. Each eval run is identified by a timestamp + git SHA and archived as a Markdown report under `evals/reports/`.
3. Users can download the raw JSON results for any past run.

### 5.6 MCP Server

1. The MCP server exposes a `search_atlas(query, tenant_slug, top_k)` tool returning answer, citations, and trace ID.
2. A `list_documents` resource exposes per-tenant document inventory.
3. MCP authentication uses API keys scoped to a tenant.
4. The server is published to the public MCP registry.

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Metric | Target | Conditions |
|---|---|---|
| End-to-end query p50 | < 800ms | Cold cache, single tenant, 10K chunks |
| End-to-end query p95 | < 1.5s | Cold cache, single tenant, 10K chunks |
| End-to-end query p99 | < 3.0s | Cold cache, single tenant, 10K chunks |
| First token latency | < 600ms | Streaming generation |
| Ingestion throughput | ≥ 200 chunks/sec | Per worker, BGE embedding |
| Concurrent queries | ≥ 50/sec | Per API instance, mixed cache |
| Cache hit reduces latency by | ≥ 80% | Reranker cache, embedding cache |

### 6.2 Reliability

- **Idempotent ingestion.** Worker crashes mid-job must not duplicate chunks; enforced by a `(document_id, ordinal)` unique constraint.
- **LLM fallback chain.** Primary (Claude) → Secondary (OpenAI) → Cached graceful-degradation message.
- **Circuit breakers.** Five consecutive embedding-service timeouts open a circuit; queries fall back to BM25-only mode.
- **Graceful 503s.** Connection pool exhaustion returns 503 with `Retry-After` rather than crashing.
- **Reranker degradation.** Reranker timeouts skip rerank and return RRF-fused results; logged as a degraded query.

### 6.3 Security

- **Tenant isolation at the database layer.** All queryable tables have `tenant_id NOT NULL` and `ENABLE ROW LEVEL SECURITY` with policies referencing `current_setting('app.current_tenant')`.
- **Secrets management.** API keys and database credentials loaded from environment variables; never committed to repo.
- **Rate limiting.** Per-tenant and per-IP rate limits enforced via Redis token buckets.
- **Input validation.** All user inputs validated by Pydantic schemas at the FastAPI boundary; uploaded files MIME-checked.
- **Audit logging.** Every document upload, deletion, and config change writes to `audit_events` with `tenant_id`, `user_id`, action, and timestamp.

### 6.4 Cost

- **Cost per query target.** < $0.001 for a typical query under the recommended Claude Haiku + BGE embedding configuration.
- **Per-tenant daily budget.** Configurable cap; exceeded queries return 429 with clear messaging.
- **Live demo monthly cost.** Target ≤ $25/month using Fly.io + Neon + Vercel + R2 + Upstash with autoscale-to-zero off-hours.
- **Self-hosted cost model.** Documented in `docs/cost-model.md`; BGE-only configuration costs $0 per query in compute beyond fixed infrastructure.

### 6.5 Observability

- **Distributed tracing.** LangSmith captures every LangGraph node with input, output, latency, and token usage.
- **Prometheus metrics.** Request count, latency histograms, retrieval recall (online), tokens per query, per-tenant cost.
- **Grafana dashboard.** Shipped as JSON in the repo; covers golden signals, cost per tenant, and eval drift.
- **Structured logs.** JSON logs with `trace_id`, `tenant_id`, `request_id`; queryable in any log aggregator.

---

## 7. Data Model

### 7.1 Core Schema

All queryable tables include `tenant_id UUID NOT NULL` and have Row-Level Security policies enabled. The killer design choice — RLS — makes cross-tenant data leakage physically impossible at the database layer, even if application code has a bug that forgets the `WHERE` clause.

| Table | Purpose | Key Columns |
|---|---|---|
| `tenants` | Tenant directory and per-tenant configuration | `id`, `slug`, `plan`, `embedding_model`, `llm_model` |
| `users` | User accounts scoped to a tenant | `id`, `tenant_id`, `email`, `role` |
| `documents` | Document metadata and ingestion status | `id`, `tenant_id`, `title`, `source_uri`, `status` |
| `chunks` | Chunk content, embeddings, and BM25 vector | `id`, `tenant_id`, `document_id`, `embedding_bge`, `embedding_openai`, `content_tsv` |
| `conversations` | Chat conversation containers | `id`, `tenant_id`, `user_id`, `title` |
| `messages` | Individual messages within conversations | `id`, `conversation_id`, `role`, `content` |
| `citations` | Mapping of messages to cited chunks | `id`, `message_id`, `chunk_id`, `ordinal` |
| `usage_events` | Per-request token usage and cost | `id`, `tenant_id`, `model`, `input_tokens`, `output_tokens`, `cost_usd` |
| `audit_events` | Tenant-scoped audit log | `id`, `tenant_id`, `user_id`, `action`, `payload` |

### 7.2 Indexing Strategy

- **HNSW index.** `chunks.embedding_bge` and `chunks.embedding_openai` use `hnsw(embedding vector_cosine_ops)` for sub-millisecond approximate nearest-neighbor search.
- **GIN index.** `chunks.content_tsv` uses GIN for full-text search; supports BM25-style `ts_rank_cd` ranking.
- **Tenant index.** `chunks(tenant_id)` accelerates the tenant predicate that RLS injects.
- **Compound indices.** `(tenant_id, document_id, ordinal)` on `chunks` for deterministic ordering and idempotency.

### 7.3 Row-Level Security Pattern

Every API request authenticates the user, resolves the tenant, and executes `SET LOCAL app.current_tenant = '<uuid>'` at the start of the database transaction. From that point, all queries against RLS-enabled tables are physically constrained to that tenant. Even a query missing a `WHERE tenant_id = ?` clause cannot return another tenant's rows.

> **Why this matters:** Most candidates filter by `tenant_id` in Python and must remember to include it in every query. RLS makes leakage impossible — a single point of enforcement at the database layer rather than a discipline that must be maintained across thousands of lines of application code.

---

## 8. Retrieval Pipeline Specification

### 8.1 Retrievers

Atlas implements three retrievers, each conforming to a common `Retriever` protocol returning a list of `ScoredChunk` objects:

- **Dense retriever.** Cosine similarity over HNSW-indexed embeddings; configurable per tenant between BGE-large-en-v1.5 (1024-dim) and OpenAI text-embedding-3-large (3072-dim).
- **BM25 retriever.** Postgres `ts_rank_cd` over the materialized `content_tsv` column. Tuned with stop-word removal and English stemming.
- **Hybrid retriever via RRF.** Reciprocal Rank Fusion combines BM25 and dense lists using `score = sum(1 / (k + rank + 1))` with `k=60`.

### 8.2 Rerankers

Three rerankers are supported, all behind a common Protocol. The `NoopReranker` is critical — it is the baseline against which all reranker uplift is measured.

| Reranker | Model | Cost | Use Case |
|---|---|---|---|
| `BGEReranker` | `bge-reranker-v2-m3` | $0 (self-hosted) | Default production reranker |
| `CohereReranker` | `rerank-english-v3.0` | ~$1 per 1K calls | Managed alternative; benchmark comparison |
| `NoopReranker` | Identity (pass-through) | $0 | Baseline for ablation; preserves RRF order |

### 8.3 Chunking Strategies

Atlas supports four chunking strategies, all implementing a common `Chunker` interface. At least two are implemented in v1.0; all four are part of the eval matrix.

| Strategy | Description | Best For |
|---|---|---|
| Recursive char/token | 512-token chunks with 80-token overlap; default baseline | General corpora, fast ingestion |
| Semantic chunking | Splits at semantic boundaries using embedding similarity drops | Long-form articles, blog posts |
| Late chunking | Embeds the full document first, then segments embeddings; preserves global context | Long technical documents |
| Markdown header-aware | Respects markdown heading hierarchy as natural chunk boundaries | Documentation sites, technical reference |

### 8.4 Citation Verification Loop

After answer generation, the verifier extracts every `[^n]` citation marker and asks a cheap Claude Haiku call: "Does this passage support this claim? Yes/No/Partial." If any claim returns No or Partial, the graph loops back to the Generate node with feedback in the system prompt ("the prior answer made an unsupported claim in citation N; do not include it"). The loop is capped at 2 retries; after that, the answer ships with a warning flag.

Expected impact: the verifier catches approximately 6% of hallucinated or unsupported citations that would otherwise reach the user. This is a measurable success metric tracked in the eval harness.

---

## 9. Evaluation Harness

> **The Crown Jewel:** The eval harness is the single most important component of Atlas. It separates this project from every other RAG demo on GitHub. Build it thoroughly: a reproducible eval pipeline that anyone can point at and say "here, run it yourself, the numbers are real."

### 9.1 Golden Dataset

Atlas ships with a 1,000-question benchmark constructed from three public corpora to ensure defensibility and breadth:

- **HotpotQA subset.** Multi-hop reasoning questions requiring chained retrieval across multiple documents.
- **FinanceBench.** Real-world financial document Q&A; high signal for enterprise relevance.
- **Custom open-documentation corpus.** Built from open-source documentation (Kubernetes, PostgreSQL) with human-curated Q&A pairs.

Each question includes: question text, gold chunk IDs (the chunks that should be retrieved), gold answer text, question type tag, and difficulty grade. Questions are stored as YAML under `evals/datasets/` for version control and inspection.

### 9.2 Retrieval Metrics

| Metric | Formula / Source | Why it matters |
|---|---|---|
| recall@k | `|retrieved_top_k ∩ gold| / |gold|` | Did we find the right documents at all? |
| MRR | `1 / rank_of_first_relevant` | How highly is the first correct hit ranked? |
| nDCG@k | Discounted cumulative gain with graded relevance | Are highly relevant items ranked above marginally relevant ones? |
| Hit rate | 1 if any gold chunk in top-k else 0 | Coarse pass/fail signal per query |

### 9.3 Generation Metrics (ragas)

- **Faithfulness.** Does the generated answer say only things supported by retrieved context? Penalizes hallucinations.
- **Answer relevancy.** Is the answer on-topic with respect to the question?
- **Context precision.** Are retrieved chunks relevant? Penalizes noisy retrieval.
- **Context recall.** Does retrieval contain all information needed to answer?

### 9.4 Paired Bootstrap Confidence Intervals

Most candidates report point estimates ("we improved recall by 12 points"). Atlas reports statistical confidence.

For every ablation, Atlas runs paired bootstrap: for each of N=10,000 resamples, sample N questions with replacement, compute the per-question score difference between baseline and treatment, and store the mean. The 2.5th and 97.5th percentiles of the resulting distribution form a 95% confidence interval; the p-value is computed against the null hypothesis that the true mean difference is zero.

> **The Killer Sentence:** Instead of "we improved recall by 12 points," Atlas reports: "We improved recall@5 by +12.4 absolute points, 95% CI [9.8, 15.1], p < 0.001 by paired bootstrap with n=1000 questions and 10,000 resamples." This single sentence signals senior engineering judgment.

### 9.5 Configuration Matrix

Atlas evaluates a matrix of at least 8 configurations, each ablated against the baseline:

| Config | Chunker | Embedding | Retriever | Reranker |
|---|---|---|---|---|
| baseline | recursive-512 | BGE-large | Dense only | None |
| +bm25 | recursive-512 | BGE-large | Hybrid+RRF | None |
| +rerank | recursive-512 | BGE-large | Hybrid+RRF | BGE-rerank |
| +cohere | recursive-512 | BGE-large | Hybrid+RRF | Cohere |
| +openai-emb | recursive-512 | OpenAI-3-large | Hybrid+RRF | BGE-rerank |
| +semantic-chunk | semantic | BGE-large | Hybrid+RRF | BGE-rerank |
| +query-rewrite | semantic | BGE-large | Hybrid+RRF + rewrite | BGE-rerank |
| qdrant | semantic | BGE-large | Qdrant Hybrid | BGE-rerank |

### 9.6 CI Integration

- **Smoke eval on every PR.** 100-question subset runs in ~3 minutes at ~$0.30; enforces no regression beyond defined thresholds (e.g., recall@5 cannot drop more than 2pp; faithfulness cannot drop more than 3pp).
- **Full eval nightly.** 1,000-question full suite runs as a scheduled GitHub Action; produces a fresh dated report committed to `evals/reports/`.
- **Eval-driven decisions.** Every retrieval design choice in Atlas is justified by a row in an eval report, not by intuition.

---

## 10. User Experience Specifications

### 10.1 Page Inventory

| Page | Purpose | Key Elements |
|---|---|---|
| `/` | Marketing splash + live demo entry | Headline metric, demo button, GitHub link |
| `/login`, `/signup` | Authentication | Email/password form, OAuth optional |
| `/app/documents` | Document management | Drag-drop upload, list, status badges |
| `/app/chat` | Primary chat interface | Streaming answer, citations, retrieval trace |
| `/app/conversations` | Chat history | List with search and date filters |
| `/app/settings` | Tenant configuration | Model selection, chunking, budget |
| `/app/evals` | Public eval dashboard | Latest report visualization, ablation chart |

### 10.2 Critical UX Details

- **Token-by-token streaming.** Uses Vercel AI SDK; first token must appear within 600ms.
- **Inline clickable citations.** `[1] [2] [3]` chips opening the source document at the cited page in a side panel.
- **Retrieval trace expander.** "Show retrieval trace" reveals retrieved chunks, ranks before and after reranking, fusion scores.
- **Cost meter in corner.** "$0.0007 this query · $0.04 today" updates live.
- **Latency badge.** "1.1s · 412 tokens" surfaces query performance to power users.
- **Per-stage progress.** During query: "rewriting → retrieving → reranking → answering" status indicator.

> **Senior Signal in the UI:** The retrieval trace UI is a senior-engineer signal. Most chat apps hide the internals. Showing them tells reviewers that the author understands evaluation, debugging, and the fundamental importance of transparency in AI systems.

---

## 11. Deployment Specifications

### 11.1 Path A: Local Development (Docker Compose)

Goal: 5 minutes from `git clone` to working chat. The `docker-compose.yml` boots PostgreSQL with pgvector, Redis, MinIO, Qdrant, the FastAPI service, the Next.js frontend, and the ingestion worker. Verified locally as the primary onboarding experience.

### 11.2 Path B: Managed Cloud (Live Demo)

| Component | Provider | Rationale |
|---|---|---|
| API + workers | Fly.io or Railway | Autoscale to zero off-hours; low cost |
| PostgreSQL | Neon | Free tier with pgvector enabled |
| Frontend | Vercel | Native Next.js hosting, edge caching |
| Object store | Cloudflare R2 | No egress fees; cheapest at low scale |
| Redis | Upstash | Serverless Redis; pay-per-request |
| Tracing | LangSmith | Free tier for moderate volume |

Total target budget: $15–$25 per month for a low-traffic demo. Documented end-to-end in `docs/deployment.md`.

### 11.3 Path C: Self-Hosted Kubernetes (Helm)

A complete Helm chart at `infra/helm/atlas/` ships with: API deployment, ingestion worker deployment, PostgreSQL statefulset, Redis deployment, ingress, secrets template, and a `values.yaml` documenting every configurable parameter. Tested on a local kind cluster and on a real cluster (DigitalOcean Kubernetes) before release. Installation reduces to a documented `helm install atlas atlas/atlas --values prod.yaml`.

### 11.4 Deployment Acceptance Criteria

- All three paths verified by a stranger (recruited friend) before launch.
- Each path documented with copy-pasteable commands and expected outputs.
- Each path includes a teardown / cleanup procedure.
- Live demo URL responsive in p95 < 1.5s under typical load.

---

## 12. Roadmap & Phasing

### 12.1 Phase-by-Phase Build Plan

Total realistic timeline: 10–14 weeks at 15–20 hours/week, or 6–8 weeks full-time. Phases are sequenced so that the eval harness (Phase 5) is operational before any optimization work, and the live demo (Phase 10) ships before final polish.

| Phase | Week | Deliverable |
|---|---|---|
| 0. Foundation | 1 | Empty repo to "hello world" with CI, lint, Docker Compose |
| 1. Multi-tenant DB | 1–2 | Postgres schema, RLS, Alembic migrations |
| 2. Ingestion pipeline | 2–3 | Upload, parse, chunk, embed, index |
| 3. Retrieval layer | 3–4 | Dense + BM25 + RRF + reranker abstractions |
| 4. Query orchestrator | 4–5 | LangGraph DAG with streaming and verification |
| 5. Eval harness | 5–6 | 1,000 questions, ragas, paired bootstrap, CI |
| 6. Frontend | 6–7 | Next.js chat, citations, retrieval trace |
| 7. Observability | 7 | LangSmith, Prometheus, Grafana, cost tracking |
| 8. Caching + resilience | 8 | Redis caches, circuit breakers, fallbacks |
| 9. MCP server | 9 | FastMCP server, published to registry |
| 10. Deployment | 9–10 | Docker Compose, live demo, Helm chart |
| 11. Documentation | 10–11 | README, architecture docs, blog post |
| 12. Launch | 11–12 | Show HN, social posts, recruiter outreach |

### 12.2 Pacing Rules

- **Eval harness by week 6.** Every later decision references the eval. Build it before optimizing.
- **Live demo by week 8.** Deploy even if rough. Polish later. Launch is the goal.
- **No new features after week 9.** Polish, documentation, and content only.
- **Measure before optimizing.** Any optimization claim must be backed by a row in an eval report.

### 12.3 Post-v1.0 Enhancements

Once Atlas v1.0 ships and gathers attention, the following enhancements are prioritized:

1. Per-query learned routing — train a classifier that selects the optimal retrieval configuration per query type.
2. Contextual retrieval (Anthropic's prepending technique) as an additional chunking strategy.
3. Late chunking support for improved long-document retrieval.
4. ColBERT-style late-interaction reranker.
5. GraphRAG hybrid mode for entity-heavy corpora.
6. Eval-as-a-service — let other developers point their RAG at the Atlas eval CLI.
7. Multi-modal ingestion using vision-language models for PDFs with diagrams.
8. In-production A/B testing framework for prompt versions.

---

## 13. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Scope creep into too many features | High | Project never ships | Hard rule: eval harness first; ship Path A by week 6 even if rough |
| Golden eval dataset is low quality | Medium | All measurements suspect | Spot-check 50 random questions manually before trusting numbers |
| Live demo costs exceed budget | Medium | Demo gets taken down | Tenant daily budgets, autoscale-to-zero, R2 (no egress fees) |
| Burnout before launch | Medium | Project unfinished | Ship Path A by week 6 regardless of polish; launch is the goal |
| LangGraph version churn | Low | Refactor toil | Pin versions; check release notes monthly |
| Multi-tenant data leak in public demo | Low | Reputational damage | Public demo runs single-tenant if needed; multi-tenant shown in local stack |
| Cohere/OpenAI API outages affect eval | Low | Eval CI fails | Mock LLM/reranker for CI smoke evals; full eval allows retries |
| Reranker doesn't show expected uplift | Low | Story becomes weaker | Honest reporting wins — "surprised by negative result" is also a senior signal |

---

## 14. Success Metrics & Launch Criteria

### 14.1 Engineering Metrics

- **Headline uplift:** ≥ +15 absolute points of recall@5 from reranking, with 95% CI excluding zero.
- **Retrieval recall:** recall@5 ≥ 0.85, recall@10 ≥ 0.92 on the combined benchmark.
- **Generation quality:** ragas faithfulness ≥ 0.90, answer relevancy ≥ 0.85.
- **System performance:** p95 latency < 1.5s, cost per query < $0.001.
- **Eval runtime:** Full 1,000-question suite completes in < 15 minutes in CI.

### 14.2 Repository & Community Metrics (30 days post-launch)

- **GitHub stars:** ≥ 100 stars within first month following a successful Show HN.
- **External contributions:** ≥ 1 PR from a stranger within 60 days.
- **Inbound interest:** ≥ 5 recruiter reach-outs within 60 days of public launch.
- **MCP registry:** Atlas listed in the public MCP server registry.
- **Reproducibility:** ≥ 3 third-party reproductions of headline eval numbers reported.

### 14.3 Launch Checklist

- [ ] Live demo URL working and monitored.
- [ ] Repository has Apache 2.0 LICENSE.
- [ ] README with screenshots and demo GIF.
- [ ] 90-second video walkthrough published on YouTube.
- [ ] Architecture diagram pinned at top of README.
- [ ] Latest eval report committed and linked.
- [ ] All three deployment paths tested by an external user.
- [ ] Show HN draft prepared.
- [ ] Tweet thread, LinkedIn post, dev.to cross-post drafted.
- [ ] Atlas submitted to MCP server registry.

---

## 15. Appendices

### 15.1 Glossary

| Term | Definition |
|---|---|
| RAG | Retrieval-Augmented Generation — augmenting LLM responses with retrieved context |
| BM25 | Best Matching 25 — a classical lexical ranking function for full-text search |
| RRF | Reciprocal Rank Fusion — combining ranked lists by summing `1/(k+rank)` |
| HNSW | Hierarchical Navigable Small World — graph-based approximate nearest-neighbor index |
| RLS | Row-Level Security — PostgreSQL feature that enforces row-visibility policies at the DB layer |
| MCP | Model Context Protocol — standard for agents to consume external tools and data |
| nDCG | Normalized Discounted Cumulative Gain — ranking quality metric with graded relevance |
| MRR | Mean Reciprocal Rank — average of `1/rank` of the first correct result |
| ragas | Open-source RAG evaluation library producing faithfulness and relevancy metrics |
| LangGraph | DAG-based LLM orchestration library with checkpointing and streaming |

### 15.2 Key Engineering Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| Vector store | pgvector (primary), Qdrant (benchmark) | 5× cheaper at expected scale (~10M vectors); <1pp recall delta vs Qdrant |
| Tenancy enforcement | PostgreSQL RLS | Database-level isolation; bugs cannot leak data |
| Orchestrator | LangGraph | Checkpointing, streaming, native tracing |
| Default reranker | BGE-reranker-v2-m3 | Self-hosted, free, matches commercial alternatives in quality |
| Embedding default | BGE-large-en-v1.5 | Self-hosted; matched OpenAI 3-large in domain corpora |
| Eval methodology | Paired bootstrap, 10K resamples | Statistical rigor; CI bands not point estimates |
| Chunk size baseline | 512 tokens, 80 overlap | Won the chunk-size ablation across difficulty levels |
| License | Apache 2.0 | Maximum permissiveness; standard for enterprise adoption |

### 15.3 References

- Anthropic — Contextual Retrieval blog post
- BGE Reranker v2 m3 model card (Hugging Face)
- ragas: Evaluation framework for RAG pipelines
- LangGraph documentation
- PostgreSQL Row-Level Security documentation
- pgvector — Open-source vector similarity search for Postgres
- Model Context Protocol specification
- HotpotQA, FinanceBench public datasets

---

*End of document — Atlas PRD v1.0*

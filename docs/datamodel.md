# Atlas — Data Model & Entity-Relationship Reference

This document is the authoritative reference for Atlas's data model. It covers entities, relationships, cardinalities, keys, constraints, indexes, security policies (RLS), evolution rules, and the most useful query patterns. It is intended for engineers writing new queries, designing migrations, or debugging a data issue.

## Table of Contents

1. [Scope & Conventions](#1-scope--conventions)
2. [Entity Catalog](#2-entity-catalog)
3. [Entity-Relationship Diagram](#3-entity-relationship-diagram)
4. [Relationships & Cardinalities](#4-relationships--cardinalities)
5. [Table Specifications](#5-table-specifications)
6. [Indexes](#6-indexes)
7. [Row-Level Security Policies](#7-row-level-security-policies)
8. [Constraints, Triggers, and Generated Columns](#8-constraints-triggers-and-generated-columns)
9. [Data Lifecycle](#9-data-lifecycle)
10. [Common Query Patterns](#10-common-query-patterns)
11. [Schema Evolution Rules](#11-schema-evolution-rules)
12. [Appendix: Full DDL](#12-appendix-full-ddl)

---

## 1. Scope & Conventions

### 1.1 Scope

This document covers the *application* schema in Postgres. It does NOT cover:

- Redis key structures (see Runbook §Appendix A and TRD §13.1).
- Object store layout (see TRD §7).
- LangGraph checkpointer tables (managed by LangGraph; see `langgraph_checkpoints` if you really need to inspect).

### 1.2 Conventions

- All primary keys are `UUID` generated via `gen_random_uuid()` from `pgcrypto`. We use UUIDv7 in application code where ordering matters; UUIDv4 is acceptable.
- All timestamps are `TIMESTAMPTZ` and default to `NOW()` at insert.
- All tenant-scoped tables have `tenant_id UUID NOT NULL` as a *non-PK* column.
- Foreign keys cascade on delete unless explicitly noted (e.g., audit tables intentionally retain on user delete).
- JSON storage uses `JSONB` for indexability.
- Snake_case for everything.
- No `created_by` columns unless audit demands it (use `audit_events` instead).

### 1.3 Why This Model Looks the Way It Does

Three design principles drive the schema:

1. **Tenant isolation is enforced at the database, not the app.** Every queryable table has `tenant_id` and an RLS policy. The app's job is to set `app.current_tenant`; the database's job is to refuse data leaks.
2. **Idempotency is built in via content-addressing.** Re-uploading the same file produces the same `documents.content_hash` and is rejected by the unique constraint, so chunks never duplicate.
3. **Observability data is first-class.** `usage_events` and `audit_events` are tables, not log lines, so they can be queried, indexed, and joined to user-facing data.

---

## 2. Entity Catalog

Atlas's domain breaks into four entity clusters:

| Cluster | Entities | Purpose |
|---|---|---|
| **Identity** | `tenants`, `users`, `api_keys` | Who can use the system, with what permissions |
| **Knowledge** | `documents`, `chunks` | The corpus and its searchable units |
| **Interaction** | `conversations`, `messages`, `citations` | Chat history and grounding |
| **Telemetry** | `usage_events`, `audit_events` | Cost accounting and security audit trail |

Tenancy is the spine: every entity outside `tenants` itself has a `tenant_id` pointer.

---

## 3. Entity-Relationship Diagram

```
                           ┌─────────────────────┐
                           │       tenants       │
                           │  PK id              │
                           │     slug (UQ)       │
                           │     embedding_model │
                           │     llm_model       │
                           │     daily_budget    │
                           └──────────┬──────────┘
                                      │ 1
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              │ N                     │ N                     │ N
        ┌─────▼──────┐         ┌──────▼──────┐         ┌──────▼─────┐
        │   users    │         │  documents  │         │  api_keys  │
        │  PK id     │         │  PK id      │         │  PK id     │
        │     email  │         │  FK tenant  │         │  FK tenant │
        │     role   │         │     status  │         │  key_hash  │
        │  FK tenant │         │  hash (UQ + │         │            │
        └─────┬──────┘         │   tenant)   │         └────────────┘
              │                └──────┬──────┘
              │ 1                     │ 1
              │                       │ N
              │ N                     │
        ┌─────▼─────────┐      ┌──────▼──────┐
        │ conversations │      │   chunks    │
        │  PK id        │      │  PK id      │
        │  FK tenant    │      │  FK tenant  │
        │  FK user      │      │  FK document│
        │     title     │      │     ordinal │
        └─────┬─────────┘      │     content │
              │ 1              │  emb_bge    │
              │                │  emb_openai │
              │ N              │  content_tsv│
        ┌─────▼─────────┐      └──────┬──────┘
        │   messages    │             │
        │  PK id        │             │
        │  FK conv      │             │
        │     role      │             │
        │     content   │             │
        │     trace_id  │             │
        └─────┬─────────┘             │
              │ 1                     │
              │ N                     │ N
              │                       │
        ┌─────▼─────────┐             │
        │   citations   │─────────────┘
        │  PK id        │   FK chunk
        │  FK message   │
        │  FK chunk     │
        │     ordinal   │
        └───────────────┘

        ┌───────────────┐         ┌───────────────┐
        │ usage_events  │         │ audit_events  │
        │  PK id        │         │  PK id        │
        │  FK tenant    │         │  FK tenant    │
        │  user_id?     │         │  user_id?     │
        │  model        │         │  action       │
        │  in_tokens    │         │  payload      │
        │  out_tokens   │         │     (JSONB)   │
        │  cost_usd     │         │               │
        │  trace_id     │         │               │
        └───────────────┘         └───────────────┘
        (audit/telemetry tables — not joined to entities in v1.0)
```

### Diagram Notation

- `1` and `N` on a line denote one-to-many cardinality.
- `PK` = primary key. `FK` = foreign key. `UQ` = unique constraint.
- Composite unique constraints noted in parentheses (e.g., `hash (UQ + tenant)`).
- Tables in the bottom row are append-only telemetry; they carry `tenant_id` for RLS but are not in the joinable relational graph from `tenants` for business logic.

---

## 4. Relationships & Cardinalities

| Parent | Child | Cardinality | On Delete | Notes |
|---|---|---|---|---|
| `tenants` | `users` | 1:N | CASCADE | Deleting a tenant removes all users |
| `tenants` | `documents` | 1:N | CASCADE | |
| `tenants` | `chunks` | 1:N | CASCADE | Denormalized — also reachable via documents |
| `tenants` | `conversations` | 1:N | CASCADE | |
| `tenants` | `api_keys` | 1:N | CASCADE | |
| `tenants` | `usage_events` | 1:N | RESTRICT | Telemetry survives tenant delete for compliance |
| `tenants` | `audit_events` | 1:N | RESTRICT | Same |
| `users` | `conversations` | 1:N | CASCADE | |
| `users` | `documents.uploaded_by` | 1:N | SET NULL | Document survives user deletion |
| `documents` | `chunks` | 1:N | CASCADE | Deleting document drops all its chunks |
| `conversations` | `messages` | 1:N | CASCADE | |
| `messages` | `citations` | 1:N | CASCADE | |
| `chunks` | `citations` | 1:N | CASCADE | Citation points to a chunk; chunk delete cascades |

### Cardinality Justifications

- `chunks.tenant_id` exists alongside `chunks.document_id` even though tenant is reachable via document. This denormalization makes the RLS policy on `chunks` a direct equality check, which the planner can use without a join. It's enforced by a trigger (§8) that copies `tenant_id` from the parent document on insert.
- `citations` is its own table (not a JSONB column on `messages`) because we sometimes need to query "which chunks are most-cited" — a join is the natural way.
- `usage_events` and `audit_events` use `BIGSERIAL` PKs (not UUID) because they are pure append-only and benefit from B-tree locality on the primary key.

---

## 5. Table Specifications

### 5.1 `tenants`

The root entity. One row per organization.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` | no | `gen_random_uuid()` | PK |
| `slug` | `TEXT` | no | — | UQ; matches `^[a-z0-9-]+$` |
| `name` | `TEXT` | no | — | Display name |
| `plan` | `TEXT` | no | `'free'` | `free` / `pro` / `enterprise` |
| `embedding_model` | `TEXT` | no | `'bge-large-en-v1.5'` | See TRD §21.2 for allowed values |
| `llm_model` | `TEXT` | no | `'claude-haiku-4-5'` | |
| `reranker` | `TEXT` | no | `'bge-reranker-v2-m3'` | |
| `chunking_strategy` | `TEXT` | no | `'recursive-512'` | |
| `daily_budget_usd` | `NUMERIC(10,4)` | no | `1.00` | Per-day spend cap |
| `created_at` | `TIMESTAMPTZ` | no | `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | no | `NOW()` | Touched by trigger on UPDATE |

**Constraints:**
- `slug` UNIQUE
- `plan` CHECK in `('free','pro','enterprise')`
- `slug` CHECK matches `^[a-z0-9-]+$`

**Why this table is special:** `tenants` is the ONE table that does NOT have `tenant_id` (it IS the tenant). It is also the ONE table where RLS is *disabled*. Reads of `tenants` are mediated by the application layer (the JWT middleware looks up the row by `id` from claims).

---

### 5.2 `users`

A user account scoped to exactly one tenant.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` | no | `gen_random_uuid()` | PK |
| `tenant_id` | `UUID` | no | — | FK → `tenants(id)` CASCADE |
| `email` | `TEXT` | no | — | Lowercase-normalized in app |
| `role` | `TEXT` | no | `'member'` | `admin` / `member` |
| `external_auth_id` | `TEXT` | yes | — | For Clerk/Lucia ID |
| `password_hash` | `TEXT` | yes | — | NULL if external auth |
| `created_at` | `TIMESTAMPTZ` | no | `NOW()` | |

**Constraints:**
- UNIQUE `(tenant_id, email)` — two tenants can each have an `alice@example.com`, but never within one tenant
- `role` CHECK in `('admin','member')`

**RLS:** enabled. Policy: `tenant_id = current_setting('app.current_tenant', true)::uuid`.

---

### 5.3 `documents`

Metadata for an uploaded document.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` | no | `gen_random_uuid()` | PK |
| `tenant_id` | `UUID` | no | — | FK → `tenants(id)` CASCADE |
| `title` | `TEXT` | no | — | Original filename if not provided |
| `source_uri` | `TEXT` | no | — | `s3://...` or `r2://...` |
| `mime_type` | `TEXT` | yes | — | Detected at upload |
| `byte_size` | `BIGINT` | yes | — | |
| `content_hash` | `TEXT` | yes | — | `sha256:<hex>` |
| `status` | `TEXT` | no | `'pending'` | State machine; see §9.1 |
| `failure_reason` | `TEXT` | yes | — | Truncated to 1000 chars |
| `uploaded_by` | `UUID` | yes | — | FK → `users(id)` SET NULL |
| `uploaded_at` | `TIMESTAMPTZ` | no | `NOW()` | |
| `ingested_at` | `TIMESTAMPTZ` | yes | — | Set when status → `ready` |

**Constraints:**
- UNIQUE `(tenant_id, content_hash)` — idempotent uploads
- `status` CHECK in `('pending','processing','ready','failed')`

**RLS:** enabled.

**The content_hash story:** when a user re-uploads a file with the same bytes, the unique constraint fails. The API catches this and returns the existing document with `idempotent: true`. The user sees the same upload "succeed" without producing duplicate chunks. This is the *only* idempotency mechanism — clients don't need to send idempotency keys for uploads.

---

### 5.4 `chunks`

The core retrievable unit. By far the largest table.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` | no | `gen_random_uuid()` | PK |
| `tenant_id` | `UUID` | no | — | FK; denormalized from document |
| `document_id` | `UUID` | no | — | FK → `documents(id)` CASCADE |
| `ordinal` | `INT` | no | — | Position within document (0-based) |
| `content` | `TEXT` | no | — | The actual chunk text |
| `content_tsv` | `TSVECTOR` | no | GENERATED | `to_tsvector('english', content)` |
| `embedding_bge` | `VECTOR(1024)` | yes | — | BGE-large-en-v1.5 |
| `embedding_openai` | `VECTOR(3072)` | yes | — | OpenAI 3-large |
| `token_count` | `INT` | yes | — | Per-tokenizer for the active embedder |
| `page_number` | `INT` | yes | — | From parser |
| `section_heading` | `TEXT` | yes | — | From parser |
| `metadata` | `JSONB` | no | `'{}'` | Misc parser data |
| `created_at` | `TIMESTAMPTZ` | no | `NOW()` | |

**Constraints:**
- UNIQUE `(tenant_id, document_id, ordinal)` — required for idempotent re-ingestion (worker crash recovery)

**Generated column:** `content_tsv` is `STORED` (materialized) so the GIN index on it is dense and avoids re-tokenization at read time.

**Vector columns:** both `embedding_bge` and `embedding_openai` are nullable. Typically only the active embedder's column is populated. For eval corpora, both are populated so the eval matrix can compare them apples-to-apples without re-ingestion.

**RLS:** enabled.

---

### 5.5 `conversations`

A chat session.

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | `UUID` | no | `gen_random_uuid()` |
| `tenant_id` | `UUID` | no | — |
| `user_id` | `UUID` | no | FK → `users(id)` CASCADE |
| `title` | `TEXT` | yes | — |
| `created_at` | `TIMESTAMPTZ` | no | `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | no | `NOW()` |

**RLS:** enabled.

---

### 5.6 `messages`

Individual messages within a conversation.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` | no | `gen_random_uuid()` | |
| `tenant_id` | `UUID` | no | — | Denormalized for RLS |
| `conversation_id` | `UUID` | no | — | FK → `conversations(id)` CASCADE |
| `role` | `TEXT` | no | — | `user` / `assistant` / `system` |
| `content` | `TEXT` | no | — | The message text |
| `trace_id` | `TEXT` | yes | — | LangSmith trace ID |
| `created_at` | `TIMESTAMPTZ` | no | `NOW()` | |

**Constraints:**
- `role` CHECK in `('user','assistant','system')`

**RLS:** enabled.

---

### 5.7 `citations`

The mapping that grounds an answer in the corpus.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` | no | `gen_random_uuid()` | |
| `tenant_id` | `UUID` | no | — | |
| `message_id` | `UUID` | no | — | FK → `messages(id)` CASCADE |
| `chunk_id` | `UUID` | no | — | FK → `chunks(id)` CASCADE |
| `ordinal` | `INT` | no | — | The `[^N]` number used in the answer |

**Why a separate table:** lets us query "which chunks are most-cited" and "for this message, what evidence was used", and lets a message cite many chunks without storing arrays. Also makes cascading cleanup simple.

**RLS:** enabled.

---

### 5.8 `usage_events`

Per-LLM-call cost record. Append-only.

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | `BIGSERIAL` | no | — |
| `tenant_id` | `UUID` | no | — |
| `user_id` | `UUID` | yes | — |
| `model` | `TEXT` | no | — |
| `input_tokens` | `INT` | no | `0` |
| `output_tokens` | `INT` | no | `0` |
| `cost_usd` | `NUMERIC(10,6)` | no | `0` |
| `trace_id` | `TEXT` | yes | — |
| `created_at` | `TIMESTAMPTZ` | no | `NOW()` |

**Why `BIGSERIAL`:** monotonically-growing PK gives B-tree locality and fast inserts. Order matches time for free.

**RLS:** enabled.

**Lifecycle:** Rows are aggregated into monthly summary tables after 90 days and the raw rows are deleted. See §9.3.

---

### 5.9 `audit_events`

Tenant-scoped audit trail. Append-only.

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | `BIGSERIAL` | no | — |
| `tenant_id` | `UUID` | no | — |
| `user_id` | `UUID` | yes | — |
| `action` | `TEXT` | no | — |
| `payload` | `JSONB` | no | `'{}'` |
| `created_at` | `TIMESTAMPTZ` | no | `NOW()` |

**Standard action names:**
- `document.uploaded`, `document.deleted`, `document.reindexed`
- `tenant.settings_updated`
- `apikey.created`, `apikey.revoked`
- `user.role_changed`
- `auth.login`, `auth.logout`, `auth.failed_attempt`

**Payload examples:**
```json
{ "document_id": "01J0...", "byte_size": 1245678, "mime_type": "application/pdf" }
{ "before": { "llm_model": "claude-haiku-4-5" }, "after": { "llm_model": "claude-sonnet-4-6" } }
```

**RLS:** enabled.

**Retention:** 365 days.

---

### 5.10 `api_keys`

Tenant-scoped programmatic credentials. Plaintext is NEVER stored.

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | `UUID` | no | `gen_random_uuid()` |
| `tenant_id` | `UUID` | no | — |
| `key_hash` | `TEXT` | no | UNIQUE |
| `key_prefix` | `TEXT` | yes | — |
| `label` | `TEXT` | yes | — |
| `last_used_at` | `TIMESTAMPTZ` | yes | — |
| `created_at` | `TIMESTAMPTZ` | no | `NOW()` |
| `revoked_at` | `TIMESTAMPTZ` | yes | — |

**Format of plaintext key:** `atlas_sk_<32 base32 chars>` — 12-char prefix + 26-char secret part.

**Storage:** `key_hash = bcrypt(key)`. `key_prefix` is the first 12 chars stored for display ("show me which key was last used").

**RLS:** enabled.

---

## 6. Indexes

### 6.1 Index Catalog

| Table | Index | Columns | Type | Purpose |
|---|---|---|---|---|
| `tenants` | `tenants_pkey` | `id` | btree | PK |
| `tenants` | `tenants_slug_key` | `slug` | btree UQ | Lookup by slug |
| `users` | `users_pkey` | `id` | btree | PK |
| `users` | `users_tenant_email_uq` | `tenant_id, email` | btree UQ | Login lookup |
| `documents` | `documents_pkey` | `id` | btree | PK |
| `documents` | `documents_tenant_idx` | `tenant_id` | btree | RLS accelerator |
| `documents` | `documents_tenant_hash_uq` | `tenant_id, content_hash` | btree UQ | Idempotency |
| `documents` | `documents_tenant_status_idx` | `tenant_id, status` | btree | Status filtering |
| `chunks` | `chunks_pkey` | `id` | btree | PK |
| `chunks` | `chunks_tsv_idx` | `content_tsv` | GIN | BM25 |
| `chunks` | `chunks_bge_hnsw` | `embedding_bge` | HNSW | Dense ANN (BGE) |
| `chunks` | `chunks_openai_hnsw` | `embedding_openai` | HNSW | Dense ANN (OpenAI) |
| `chunks` | `chunks_tenant_idx` | `tenant_id` | btree | RLS accelerator |
| `chunks` | `chunks_doc_ord_uq` | `tenant_id, document_id, ordinal` | btree UQ | Idempotent re-ingest |
| `conversations` | `conversations_pkey` | `id` | btree | PK |
| `conversations` | `conversations_tenant_user_idx` | `tenant_id, user_id, updated_at DESC` | btree | List my conversations |
| `messages` | `messages_pkey` | `id` | btree | PK |
| `messages` | `messages_conv_idx` | `conversation_id, created_at` | btree | Render a conversation |
| `citations` | `citations_pkey` | `id` | btree | PK |
| `citations` | `citations_message_idx` | `message_id` | btree | Citations for a message |
| `citations` | `citations_chunk_idx` | `chunk_id` | btree | "Which messages cited this chunk" |
| `usage_events` | `usage_events_pkey` | `id` | btree | PK |
| `usage_events` | `usage_events_tenant_time_idx` | `tenant_id, created_at DESC` | btree | Today's usage |
| `audit_events` | `audit_events_pkey` | `id` | btree | PK |
| `audit_events` | `audit_events_tenant_time_idx` | `tenant_id, created_at DESC` | btree | Audit query |
| `api_keys` | `api_keys_pkey` | `id` | btree | PK |
| `api_keys` | `api_keys_hash_uq` | `key_hash` | btree UQ | Auth lookup |

### 6.2 HNSW Tuning

```sql
CREATE INDEX chunks_bge_hnsw
  ON chunks USING hnsw(embedding_bge vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

- `m = 16` — number of connections per node; default. Higher = better recall at higher index size.
- `ef_construction = 64` — search width at build time. Higher = slower build, better index quality.
- Query-time `ef_search` is tunable per query via `SET LOCAL hnsw.ef_search = 100;`. Default 40 is too low; the app sets 100 for retrievals.

### 6.3 Index Builds at Scale

HNSW index creation is expensive on large tables — `O(n × m × log n)`. For >10M rows:

```sql
SET maintenance_work_mem = '4GB';
CREATE INDEX CONCURRENTLY chunks_bge_hnsw
  ON chunks USING hnsw(embedding_bge vector_cosine_ops);
```

`CONCURRENTLY` keeps the table writable during build but takes ~2× longer. This is a documented manual step, not part of an Alembic migration.

---

## 7. Row-Level Security Policies

### 7.1 Enabled Tables

These tables have `ROW LEVEL SECURITY ENABLED` + `FORCE`:

- `users`, `documents`, `chunks`, `conversations`, `messages`, `citations`, `usage_events`, `audit_events`, `api_keys`

NOT enabled on:

- `tenants` — by design; lookup by ID via app layer

### 7.2 Standard Policy Shape

```sql
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_chunks ON chunks
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
```

The same shape is applied to every RLS-enabled table.

### 7.3 What `FORCE ROW LEVEL SECURITY` Buys

Without `FORCE`, the table owner bypasses RLS. Since migrations run as the owner role, this would mean Alembic operations (and any psql session connected as the owner) could see all tenants. `FORCE` closes this gap: even the owner is subject to the policy. The owner role is then explicitly excluded from RLS only by virtue of the policy returning true — never by a bypass flag.

For maintenance tasks that legitimately span tenants (eval seeding, GC), use a separate `atlas_admin` role with `BYPASSRLS` privilege. This role is NEVER used by the API. It is used only by Alembic and CLI tools.

### 7.4 Verification Query

Run this in CI to confirm RLS is enforced everywhere it should be:

```sql
SELECT relname,
       relrowsecurity AS rls_enabled,
       relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relkind = 'r'
  AND relname IN ('users','documents','chunks','conversations',
                  'messages','citations','usage_events','audit_events','api_keys');
```

Both flags must be `true` for every row. If any is `false`, fail the build.

---

## 8. Constraints, Triggers, and Generated Columns

### 8.1 Check Constraints (Inventory)

| Table | Constraint | Purpose |
|---|---|---|
| `tenants` | `slug ~ '^[a-z0-9-]+$'` | URL-safe slugs |
| `tenants` | `plan IN ('free','pro','enterprise')` | Bounded enum |
| `users` | `role IN ('admin','member')` | Bounded enum |
| `documents` | `status IN ('pending','processing','ready','failed')` | State machine |
| `messages` | `role IN ('user','assistant','system')` | Bounded enum |
| `chunks` | `ordinal >= 0` | Sanity |

### 8.2 Triggers

#### `trg_chunks_set_tenant_id`

Defensive trigger: copies `tenant_id` from the parent `documents` row on insert. Protects against a bug where the application forgets to set `chunks.tenant_id`.

```sql
CREATE OR REPLACE FUNCTION chunks_set_tenant_id() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO NEW.tenant_id
    FROM documents WHERE id = NEW.document_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chunks_set_tenant_id
  BEFORE INSERT ON chunks
  FOR EACH ROW EXECUTE FUNCTION chunks_set_tenant_id();
```

#### `trg_tenants_updated_at`

Standard `updated_at` maintenance.

```sql
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
```

Apply the same pattern to `conversations`.

### 8.3 Generated Columns

`chunks.content_tsv`:

```sql
content_tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
```

`STORED` materializes the tsvector. Storage cost ~30% of `content` size; query cost goes to zero (no tokenization on read).

---

## 9. Data Lifecycle

### 9.1 Document State Machine

```
        ┌─────────┐    ingest job   ┌────────────┐    parse+embed   ┌────────┐
        │ pending │ ───────────────►│ processing │ ────────────────►│ ready  │
        └─────────┘                 └─────┬──────┘   success        └────────┘
                                          │
                                          │ parse or embed fails
                                          ▼
                                    ┌──────────┐
                                    │  failed  │ ← can be reindexed
                                    └──────────┘
```

Allowed transitions:

| From | To | Trigger |
|---|---|---|
| `pending` | `processing` | Worker picks up job |
| `processing` | `ready` | Ingestion success |
| `processing` | `failed` | Ingestion error |
| `failed` | `pending` | `POST /v1/documents/{id}/reindex` |
| `ready` | `pending` | `POST /v1/documents/{id}/reindex` (after embedder change) |

Disallowed: anything not listed. The transition guard lives in the worker, not the database.

### 9.2 Cascade Behavior on Tenant Delete

`DELETE FROM tenants WHERE id = '<uuid>'` cascades to:

- `users`, `documents`, `chunks`, `conversations`, `messages`, `citations`, `api_keys` — all DELETE
- `usage_events`, `audit_events` — RESTRICT; must be explicitly purged after a retention window

A tenant deletion is a multi-step admin procedure. See Runbook §7.5.

### 9.3 Retention

| Table | Retention | Purge mechanism |
|---|---|---|
| `tenants` (active) | Forever | — |
| `tenants` (deleted) | Cascaded immediately | DELETE |
| `documents` (status='failed', uploaded > 30d ago) | 30 days | Daily cron |
| `usage_events` (>90 days) | Aggregated → monthly summary | Daily cron |
| `audit_events` (>365 days) | 365 days | Daily cron |
| `api_keys` (revoked > 90d ago) | 90 days | Daily cron |
| LangGraph checkpoints (>24h) | 24 hours | Daily cron |

### 9.4 Soft Deletes — Not Used

Atlas does NOT use soft-delete patterns (no `deleted_at` columns). Reasons:

- RLS already handles "should this user see this row" — `deleted_at IS NULL` adds nothing.
- Soft deletes cause subtle bugs when queries forget the predicate.
- For audit purposes, `audit_events` captures the deletion event.

The one exception is `api_keys.revoked_at` — revocation is a state change, not a delete, because we want to keep the row queryable for "when was this key last used before revoke?"

---

## 10. Common Query Patterns

These are the queries the application actually issues. Each is annotated with which index it uses.

### 10.1 Login Lookup

```sql
SELECT u.*, t.id AS tenant_id, t.slug
FROM users u
JOIN tenants t ON t.id = u.tenant_id
WHERE u.email = $1;
-- Uses: users_tenant_email_uq (but only partially; tenant_id not in WHERE)
-- This query is admin-context (no RLS); JWT validation runs as the admin role.
```

### 10.2 List Documents in a Tenant

```sql
SELECT id, title, status, byte_size, uploaded_at, ingested_at
FROM documents
WHERE status = $1                     -- optional filter
ORDER BY uploaded_at DESC
LIMIT $2;
-- Uses: documents_tenant_status_idx (RLS injects tenant_id predicate)
```

### 10.3 Dense Retrieval

```sql
SELECT id, document_id, content, metadata,
       1 - (embedding_bge <=> $1) AS score
FROM chunks
WHERE embedding_bge IS NOT NULL
ORDER BY embedding_bge <=> $1
LIMIT $2;
-- Uses: chunks_bge_hnsw
-- RLS scopes to tenant_id via current_setting('app.current_tenant')
```

### 10.4 BM25 Retrieval

```sql
SELECT id, document_id, content, metadata,
       ts_rank_cd(content_tsv, plainto_tsquery('english', $1)) AS score
FROM chunks
WHERE content_tsv @@ plainto_tsquery('english', $1)
ORDER BY score DESC
LIMIT $2;
-- Uses: chunks_tsv_idx
```

### 10.5 Today's Tenant Spend

```sql
SELECT
  COALESCE(SUM(cost_usd), 0) AS today_usd,
  COUNT(*) AS today_queries
FROM usage_events
WHERE created_at >= date_trunc('day', NOW());
-- Uses: usage_events_tenant_time_idx
-- RLS scopes to tenant
```

### 10.6 Conversation with Messages and Citations

```sql
WITH msgs AS (
  SELECT m.id, m.role, m.content, m.trace_id, m.created_at
  FROM messages m
  WHERE m.conversation_id = $1
  ORDER BY m.created_at
),
cites AS (
  SELECT c.message_id, c.ordinal,
         k.id AS chunk_id, k.document_id, k.content, k.page_number,
         d.title AS document_title
  FROM citations c
  JOIN chunks k ON k.id = c.chunk_id
  JOIN documents d ON d.id = k.document_id
  WHERE c.message_id IN (SELECT id FROM msgs)
)
SELECT * FROM msgs, cites WHERE cites.message_id = msgs.id;
-- Three index hits: messages_conv_idx, citations_message_idx, chunks PK, documents PK
```

### 10.7 API Key Authentication

```sql
SELECT id, tenant_id
FROM api_keys
WHERE key_hash = $1
  AND revoked_at IS NULL;
-- Uses: api_keys_hash_uq
-- Admin context (RLS bypassed) — we don't know the tenant yet at this point.
```

### 10.8 Find Most-Cited Chunks (Power-User Query)

```sql
SELECT k.id, k.content, d.title, COUNT(c.id) AS cite_count
FROM chunks k
JOIN citations c ON c.chunk_id = k.id
JOIN documents d ON d.id = k.document_id
GROUP BY k.id, k.content, d.title
ORDER BY cite_count DESC
LIMIT 50;
-- Uses: citations_chunk_idx
```

### 10.9 Audit Trail for a User

```sql
SELECT created_at, action, payload
FROM audit_events
WHERE user_id = $1
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
-- Uses: audit_events_tenant_time_idx
```

---

## 11. Schema Evolution Rules

### 11.1 Migrations

- Every schema change is a versioned Alembic migration. No exceptions.
- Migrations MUST run via `alembic upgrade head` in CI against a database with production-shape data (snapshot or anonymized sample).
- Migrations MUST be backward-compatible across one deploy cycle. The two-deploy rule for breaking changes:

  1. **Deploy 1:** add new column nullable; code writes both old and new; reads from old.
  2. Backfill in batches.
  3. **Deploy 2:** code reads from new; old column dropped.

- A committed migration is immutable. Reviewers MUST reject any PR that edits a previously-merged migration. If a migration is wrong, write a new migration that fixes it forward.

### 11.2 Adding a Tenant-Scoped Table

Checklist for every new tenant-scoped table:

- [ ] Column `tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`
- [ ] Index on `tenant_id` (or compound index that leads with it)
- [ ] `ALTER TABLE foo ENABLE ROW LEVEL SECURITY;`
- [ ] `ALTER TABLE foo FORCE ROW LEVEL SECURITY;`
- [ ] Policy referencing `current_setting('app.current_tenant', true)::uuid`
- [ ] RLS verification test added to the integration suite
- [ ] If joined to other tenant tables: trigger to copy `tenant_id` if app fails to set it

### 11.3 Adding Columns

- New columns MUST be nullable OR have a default value.
- Renames are split into add-new → backfill → drop-old over multiple deploys.
- Type changes that require a full table rewrite (e.g., changing an embedding dimension) MUST use a new column, not in-place alter.

### 11.4 Dropping Columns

- Mark deprecated for at least one release before drop.
- The dropping migration MUST be in a different release than the last code that read the column.

### 11.5 Embedding Dimension Changes

Changing an embedding model with a different dimension is a *new column*, not an `ALTER TYPE`. The current schema has `embedding_bge VECTOR(1024)` and `embedding_openai VECTOR(3072)` precisely to allow side-by-side existence. A future BGE v3 with different dimensions would get its own column.

---

## 12. Appendix: Full DDL

The authoritative DDL lives in Alembic migrations under `infra/migrations/versions/`. The consolidated view below is the equivalent of `pg_dump --schema-only` at v1.0 — useful as a reference, but NOT a migration source.

```sql
-- ============================================================
-- Atlas v1.0 schema (reference; actual schema via Alembic)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =================== tenants ===================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','enterprise')),
  embedding_model TEXT NOT NULL DEFAULT 'bge-large-en-v1.5',
  llm_model TEXT NOT NULL DEFAULT 'claude-haiku-4-5',
  reranker TEXT NOT NULL DEFAULT 'bge-reranker-v2-m3',
  chunking_strategy TEXT NOT NULL DEFAULT 'recursive-512',
  daily_budget_usd NUMERIC(10,4) NOT NULL DEFAULT 1.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =================== users ===================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  external_auth_id TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, email)
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_users ON users
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- =================== documents ===================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_uri TEXT NOT NULL,
  mime_type TEXT,
  byte_size BIGINT,
  content_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','ready','failed')),
  failure_reason TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ingested_at TIMESTAMPTZ,
  UNIQUE (tenant_id, content_hash)
);
CREATE INDEX documents_tenant_idx ON documents(tenant_id);
CREATE INDEX documents_tenant_status_idx ON documents(tenant_id, status, uploaded_at DESC);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_documents ON documents
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- =================== chunks ===================
CREATE TABLE chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  ordinal INT NOT NULL CHECK (ordinal >= 0),
  content TEXT NOT NULL,
  content_tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  embedding_bge VECTOR(1024),
  embedding_openai VECTOR(3072),
  token_count INT,
  page_number INT,
  section_heading TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, document_id, ordinal)
);
CREATE INDEX chunks_tsv_idx ON chunks USING GIN(content_tsv);
CREATE INDEX chunks_bge_hnsw ON chunks USING hnsw(embedding_bge vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX chunks_openai_hnsw ON chunks USING hnsw(embedding_openai vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX chunks_tenant_idx ON chunks(tenant_id);
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_chunks ON chunks
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- =================== conversations ===================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX conversations_tenant_user_idx
  ON conversations(tenant_id, user_id, updated_at DESC);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_conversations ON conversations
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- =================== messages ===================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX messages_conv_idx ON messages(conversation_id, created_at);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_messages ON messages
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- =================== citations ===================
CREATE TABLE citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  chunk_id UUID NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  ordinal INT NOT NULL
);
CREATE INDEX citations_message_idx ON citations(message_id);
CREATE INDEX citations_chunk_idx ON citations(chunk_id);
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE citations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_citations ON citations
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- =================== usage_events ===================
CREATE TABLE usage_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID,
  model TEXT NOT NULL,
  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX usage_events_tenant_time_idx
  ON usage_events(tenant_id, created_at DESC);
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_usage_events ON usage_events
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- =================== audit_events ===================
CREATE TABLE audit_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID,
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX audit_events_tenant_time_idx
  ON audit_events(tenant_id, created_at DESC);
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_audit_events ON audit_events
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- =================== api_keys ===================
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT,
  label TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_api_keys ON api_keys
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- =================== triggers ===================
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE FUNCTION chunks_set_tenant_id() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO NEW.tenant_id FROM documents WHERE id = NEW.document_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chunks_set_tenant_id BEFORE INSERT ON chunks
  FOR EACH ROW EXECUTE FUNCTION chunks_set_tenant_id();
```

---

*End of document — Atlas Data Model v1.0*

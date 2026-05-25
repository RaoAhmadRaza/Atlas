## Project Status

**Active module:** Module 4 — Query Orchestrator
**Module 0 (Foundation):** Complete — monorepo scaffold, CI, Docker Compose, pre-commit hooks, secret scanning all green.
**Module 1 (Database & RLS):** Complete — 10-table DDL + pgvector, RLS policies, Alembic baseline migration (`0001_baseline_schema.py`), `with_tenant_session()`, full test suite green.
**Module 2 (Document Ingestion):** Complete — `POST /v1/documents/upload`, arq worker (parse → chunk → embed → COPY insert), SSE progress endpoint, full test suite green.
**Module 3 (Retrieval Layer):** Complete — `DenseRetriever` (pgvector HNSW), `BM25Retriever` (GIN/ts_rank_cd), `HybridRetriever` (RRF k=60), `BGEReranker`/`CohereReranker`/`NoopReranker`, `compress()`, 20 tests, branch `module-3/retrieval-layer` pushed to CI.

Next: `POST /v1/query`, `HybridRetriever` → reranker → compress → LLM generation, streaming response. See [docs/MODULES.md](docs/MODULES.md#module-4--query-orchestrator).

## Branch Rule

**Each module gets its own branch (`module-N/short-name`).** Branch MUST NOT merge to `main` until: full implementation done, all tests pass, CI (lint-python + lint-node + test + build + security) is green on the branch.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

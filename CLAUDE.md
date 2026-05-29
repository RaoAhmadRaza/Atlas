## Project Status

**Active module:** Module 6 — Frontend Wiring
**Module 0 (Foundation):** Complete — monorepo scaffold, CI, Docker Compose, pre-commit hooks, secret scanning all green.
**Module 1 (Database & RLS):** Complete — 10-table DDL + pgvector, RLS policies, Alembic baseline migration (`0001_baseline_schema.py`), `with_tenant_session()`, full test suite green.
**Module 2 (Document Ingestion):** Complete — `POST /v1/documents/upload`, arq worker (parse → chunk → embed → COPY insert), SSE progress endpoint, full test suite green.
**Module 3 (Retrieval Layer):** Complete — `DenseRetriever` (pgvector HNSW), `BM25Retriever` (GIN/ts_rank_cd), `HybridRetriever` (RRF k=60), `BGEReranker`/`CohereReranker`/`NoopReranker`, `compress()`, 20 tests.
**Module 4 (Query Orchestrator):** Complete — 7-node LangGraph DAG (`rewrite→retrieve→fuse→rerank→compress→generate→verify`), `POST /v1/query` SSE endpoint, citation verification (max 2 retries), per-tenant cost tracking + Redis budget guard, conversation history. Branch `module-4/query-orchestrator` pushed to CI.
**Module 5 (Eval Harness):** Complete — `atlas-eval-runner` package (`EvalRunner`, `FakeSeededRetriever`, `FaithfulnessJudge`, `compare_reports`, `write_report`), `POST /v1/evals/runs` + 5 query endpoints, arq `run_eval_job` task, `eval-smoke` + `eval-nightly` CI workflows, 137 tests, coverage ≥80%, branch `module-5/eval-harness` CI green.

**Frontend (`src/` + `index.html`):** Vanilla React SPA (no bundler, Babel standalone). All pages fully designed with mock/hardcoded data — zero real API calls yet. Pages: Chat, Documents, Dashboard, TraceDrawer, UploadModal, Auth, EvalCompare, Settings, Pricing. Backend wiring begins Module 6.

Next: Module 6 — Frontend Wiring. See [docs/MODULES.md](docs/MODULES.md#module-6--frontend-wiring).

## Branch Rule

**Each module gets its own branch (`module-N/short-name`).** Branch MUST NOT merge to `main` until: full implementation done, all tests pass, CI (lint-python + lint-node + test + build + security) is green on the branch.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Project Status

**Active module:** Module 1 — Multi-Tenant Database & RLS
**Module 0 (Foundation):** Complete — monorepo scaffold, CI, Docker Compose, pre-commit hooks, secret scanning all green.

Next: implement 10-table DDL + pgvector, RLS policies, Alembic baseline migration, and `with_tenant_session()`. See [docs/MODULES.md](docs/MODULES.md#module-1--multi-tenant-database--rls).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

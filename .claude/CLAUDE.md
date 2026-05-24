# graphify
- **graphify** (`.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"` before doing anything else.

# Installed Skills (alirezarezvani/claude-skills)

## RAG & AI
- **rag-architect** — RAG pipeline design, chunking optimizer, retrieval evaluator. Trigger: `/rag-architect`
- **agent-designer** — Multi-agent orchestration, tool schemas, LangGraph patterns. Trigger: `/agent-designer`
- **agent-workflow-designer** — Sequential/parallel/router/orchestrator patterns. Trigger: `/agent-workflow-designer`

## Database & Migrations
- **database-schema-designer** — pgvector + RLS + Alembic, migrations, seed data. Trigger: `/database-schema-designer`
- **migration-architect** — Migration planner, rollback generator, compatibility checker. Trigger: `/migration-architect`

## Infrastructure & CI/CD
- **ci-cd-pipeline-builder** — GitHub Actions generator, stack detector. Trigger: `/ci-cd-pipeline-builder`
- **observability-designer** — SLO designer, Prometheus alerts, Grafana dashboard generator. Trigger: `/observability-designer`
- **performance-profiler** — Python/Node profiling, bundle analysis, latency optimization. Trigger: `/performance-profiler`

## API & Testing
- **api-design-reviewer** — REST API linter, breaking change detector. Trigger: `/api-design-reviewer`
- **api-test-suite-builder** — Scan API routes → generate test suites. Trigger: `/api-test-suite-builder`
- **playwright-pro** — E2E test generation, flaky fix, coverage. Trigger: `/playwright-pro`

## MCP & Security
- **mcp-server-builder** — FastMCP server builder, OpenAPI → MCP scaffold. Trigger: `/mcp-server-builder`
- **security-guidance** — PreToolUse hook, 12 anti-patterns caught at tool-call time. Trigger: `/security-guidance`
- **incident-commander** — Incident response playbook, severity classifier, PIR. Trigger: `/incident-commander`

## Release & Memory
- **release-manager** — Changelog generator, semantic version bumper, readiness checker. Trigger: `/release-manager`
- **self-improving-agent** — Auto-memory curation, pattern promotion, skill extraction. Trigger: `/self-improving-agent`

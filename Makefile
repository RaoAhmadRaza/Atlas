.PHONY: up down logs migrate test test-cov lint lint-fix typecheck install secrets-scan clean

COMPOSE = docker compose -f infra/docker-compose.yml

up:
	$(COMPOSE) up --build -d

down:
	$(COMPOSE) down -v

logs:
	$(COMPOSE) logs -f

migrate:
	uv run alembic -c infra/migrations/alembic.ini upgrade head

test:
	uv run pytest

test-cov:
	uv run pytest --cov=packages/atlas-core --cov-report=html

lint:
	uv run ruff check . && uv run ruff format --check .

lint-fix:
	uv run ruff check --fix . && uv run ruff format .

typecheck:
	uv run mypy packages/atlas-core apps/api
	pnpm --filter web typecheck

install:
	uv sync --all-packages
	pnpm install --frozen-lockfile
	pre-commit install

secrets-scan:
	detect-secrets scan --baseline .secrets.baseline

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .mypy_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .ruff_cache -exec rm -rf {} + 2>/dev/null || true
	rm -rf .coverage htmlcov coverage.xml

FROM python:3.12-slim AS builder
RUN pip install uv --no-cache-dir
WORKDIR /build
COPY apps/ingestion-worker/pyproject.toml ./apps/ingestion-worker/
COPY packages/atlas-core/pyproject.toml ./packages/atlas-core/
COPY packages/atlas-schemas/pyproject.toml ./packages/atlas-schemas/
COPY pyproject.toml ./
RUN uv sync --no-dev --package atlas-ingestion-worker

FROM python:3.12-slim
RUN groupadd -r atlas && useradd -r -g atlas -u 1000 atlas
WORKDIR /app
COPY --from=builder /build/.venv /app/.venv
COPY apps/ingestion-worker/ ./
ENV PATH="/app/.venv/bin:$PATH"
USER atlas
CMD ["python", "-m", "arq", "worker.WorkerSettings"]

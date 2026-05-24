FROM python:3.12-slim AS builder
RUN pip install uv --no-cache-dir
WORKDIR /build
COPY apps/api/pyproject.toml ./apps/api/
COPY packages/atlas-core/pyproject.toml ./packages/atlas-core/
COPY packages/atlas-schemas/pyproject.toml ./packages/atlas-schemas/
COPY pyproject.toml ./
RUN uv sync --no-dev --package atlas-api

FROM python:3.12-slim
RUN groupadd -r atlas && useradd -r -g atlas -u 1000 atlas
WORKDIR /app
COPY --from=builder /build/.venv /app/.venv
COPY apps/api/ ./
ENV PATH="/app/.venv/bin:$PATH"
USER atlas
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=5s --retries=3   CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/healthz')"
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

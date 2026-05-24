"""
Docker Compose smoke tests.
Skipped automatically when Docker is not available (CI without Docker daemon).
"""

import shutil
import subprocess
from pathlib import Path

import pytest

DOCKER_AVAILABLE = shutil.which("docker") is not None


@pytest.mark.skipif(not DOCKER_AVAILABLE, reason="Docker not available")
def test_compose_file_is_valid() -> None:
    # docker compose config requires .env; copy .env.example if .env absent
    env_path = Path(".env")
    env_example = Path(".env.example")
    created = False
    if not env_path.exists() and env_example.exists():
        shutil.copy(env_example, env_path)
        created = True
    try:
        result = subprocess.run(
            ["docker", "compose", "-f", "infra/docker-compose.yml", "config", "--quiet"],  # noqa: S603 S607
            capture_output=True,
            timeout=30,
        )
        assert result.returncode == 0, result.stderr.decode()
    finally:
        if created:
            env_path.unlink(missing_ok=True)


@pytest.mark.skipif(not DOCKER_AVAILABLE, reason="Docker not available")
def test_postgres_image_accessible() -> None:
    result = subprocess.run(
        ["docker", "pull", "pgvector/pgvector:pg16", "--quiet"],  # noqa: S603 S607
        capture_output=True,
        timeout=120,
    )
    assert result.returncode == 0, "Could not pull pgvector/pgvector:pg16"

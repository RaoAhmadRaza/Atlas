"""
Docker Compose smoke tests.
Skipped automatically when Docker is not available (CI without Docker daemon).
"""

import shutil
import subprocess

import pytest

DOCKER_AVAILABLE = shutil.which("docker") is not None


@pytest.mark.skipif(not DOCKER_AVAILABLE, reason="Docker not available")
def test_compose_file_is_valid() -> None:
    result = subprocess.run(
        ["docker", "compose", "-f", "infra/docker-compose.yml", "config", "--quiet"],  # noqa: S603 S607
        capture_output=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stderr.decode()


@pytest.mark.skipif(not DOCKER_AVAILABLE, reason="Docker not available")
def test_postgres_image_accessible() -> None:
    result = subprocess.run(
        ["docker", "pull", "pgvector/pgvector:pg16", "--quiet"],  # noqa: S603 S607
        capture_output=True,
        timeout=120,
    )
    assert result.returncode == 0, "Could not pull pgvector/pgvector:pg16"

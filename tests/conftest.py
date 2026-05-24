from pathlib import Path

import pytest


@pytest.fixture(scope="session")
def env_example_text() -> str:
    return (Path(__file__).parent.parent / ".env.example").read_text()

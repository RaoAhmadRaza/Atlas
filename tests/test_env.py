from pathlib import Path

REQUIRED_VARS = [
    "DATABASE_URL",
    "REDIS_URL",
    "OBJECT_STORE_ENDPOINT",
    "OBJECT_STORE_BUCKET",
    "OBJECT_STORE_ACCESS_KEY",
    "OBJECT_STORE_SECRET_KEY",
    "ANTHROPIC_API_KEY",
    "JWT_SECRET",
    "ALLOWED_ORIGINS",
    "ENVIRONMENT",
    "LOG_LEVEL",
]


def test_all_required_vars_documented(env_example_text: str) -> None:
    for var in REQUIRED_VARS:
        assert var in env_example_text, f"Missing required env var in .env.example: {var}"


def test_no_real_secrets_in_env_example(env_example_text: str) -> None:
    # Real Anthropic / OpenAI key prefixes must never appear
    assert "sk-ant-api" not in env_example_text
    assert "sk-proj-" not in env_example_text


def test_env_example_exists() -> None:
    assert Path(".env.example").exists(), ".env.example must be committed"


def test_env_not_committed() -> None:
    assert not Path(".env").exists(), ".env must not exist in the repo root"

"""Smoke tests for atlas-core package (Module 0 — scaffold only)."""

import sys
from pathlib import Path

# atlas-core is a workspace package; add it to path for direct import
sys.path.insert(0, str(Path(__file__).parent.parent / "packages" / "atlas-core"))

from atlas_core.version import get_version  # noqa: E402


def test_get_version_returns_string() -> None:
    result = get_version()
    assert isinstance(result, str)
    assert len(result) > 0


def test_get_version_matches_semver() -> None:
    result = get_version()
    parts = result.split(".")
    assert len(parts) == 3, f"Expected semver X.Y.Z, got {result}"
    assert all(part.isdigit() for part in parts)

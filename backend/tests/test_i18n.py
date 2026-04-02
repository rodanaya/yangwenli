"""
i18n completeness tests.

Verifies that EN and ES translation files:
1. Have the same set of namespace files (filenames).
2. Share the same top-level keys within each namespace file.
3. Share the same recursive key set within each namespace file (deep comparison).

This catches missing translations before they reach production.
"""
import json
import os
from pathlib import Path
import pytest


# ---------------------------------------------------------------------------
# Locate locale directories relative to this test file
# ---------------------------------------------------------------------------

_BACKEND_DIR = Path(__file__).parent.parent          # backend/
_PROJECT_DIR = _BACKEND_DIR.parent                   # yangwenli/
_LOCALES_DIR = _PROJECT_DIR / "frontend" / "src" / "i18n" / "locales"

EN_DIR = _LOCALES_DIR / "en"
ES_DIR = _LOCALES_DIR / "es"


def _load_json(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _collect_keys(obj, prefix: str = "") -> set:
    """
    Recursively collect all dot-separated key paths from a nested dict.

    Example: {"a": {"b": 1, "c": 2}} -> {"a.b", "a.c"}
    """
    keys = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            full_key = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict):
                keys |= _collect_keys(v, full_key)
            else:
                keys.add(full_key)
    return keys


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def en_files() -> dict:
    """Map filename -> parsed JSON for all EN locale files."""
    return {
        p.name: _load_json(p)
        for p in sorted(EN_DIR.glob("*.json"))
    }


@pytest.fixture(scope="module")
def es_files() -> dict:
    """Map filename -> parsed JSON for all ES locale files."""
    return {
        p.name: _load_json(p)
        for p in sorted(ES_DIR.glob("*.json"))
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestLocaleFileParity:
    """Ensure EN and ES directories have the same set of namespace files."""

    def test_locales_directories_exist(self):
        assert EN_DIR.is_dir(), f"EN locales directory not found: {EN_DIR}"
        assert ES_DIR.is_dir(), f"ES locales directory not found: {ES_DIR}"

    def test_same_number_of_files(self, en_files, es_files):
        assert len(en_files) > 0, "No EN locale files found"
        assert len(en_files) == len(es_files), (
            f"File count mismatch: EN={len(en_files)}, ES={len(es_files)}"
        )

    def test_same_filenames(self, en_files, es_files):
        en_names = set(en_files)
        es_names = set(es_files)
        only_en = en_names - es_names
        only_es = es_names - en_names
        assert not only_en, f"Files in EN but not ES: {sorted(only_en)}"
        assert not only_es, f"Files in ES but not EN: {sorted(only_es)}"


class TestTopLevelKeyParity:
    """Ensure each namespace file has the same top-level keys in EN and ES."""

    @pytest.mark.parametrize("filename", [
        "common.json", "nav.json", "contracts.json", "dashboard.json",
        "vendors.json", "aria.json", "investigation.json",
    ])
    def test_top_level_keys_match(self, filename, en_files, es_files):
        if filename not in en_files:
            pytest.skip(f"{filename} not present in EN locales")
        if filename not in es_files:
            pytest.skip(f"{filename} not present in ES locales")

        en_keys = set(en_files[filename].keys())
        es_keys = set(es_files[filename].keys())

        missing_in_es = en_keys - es_keys
        missing_in_en = es_keys - en_keys

        assert not missing_in_es, (
            f"{filename}: top-level keys in EN but not ES: {sorted(missing_in_es)}"
        )
        assert not missing_in_en, (
            f"{filename}: top-level keys in ES but not EN: {sorted(missing_in_en)}"
        )


class TestDeepKeyParity:
    """Ensure no deep key is missing from either language for any namespace."""

    def _check_file(self, filename: str, en_files: dict, es_files: dict) -> tuple[set, set]:
        """Return (missing_in_es, missing_in_en) sets of key paths."""
        en_data = en_files.get(filename, {})
        es_data = es_files.get(filename, {})
        en_keys = _collect_keys(en_data)
        es_keys = _collect_keys(es_data)
        return en_keys - es_keys, es_keys - en_keys

    def test_all_files_have_matching_deep_keys(self, en_files, es_files):
        """
        Aggregate deep-key check across all shared namespace files.
        Reports all discrepancies in one assertion failure for easy review.
        """
        shared = set(en_files) & set(es_files)
        failures = []

        for filename in sorted(shared):
            missing_es, missing_en = self._check_file(filename, en_files, es_files)
            if missing_es:
                failures.append(
                    f"\n  {filename}: keys in EN but missing in ES: "
                    + ", ".join(sorted(missing_es)[:10])
                    + (" ..." if len(missing_es) > 10 else "")
                )
            if missing_en:
                failures.append(
                    f"\n  {filename}: keys in ES but missing in EN: "
                    + ", ".join(sorted(missing_en)[:10])
                    + (" ..." if len(missing_en) > 10 else "")
                )

        assert not failures, "Translation key mismatches found:" + "".join(failures)

    def test_common_json_has_no_missing_keys(self, en_files, es_files):
        """Focused check on common.json — the most critical namespace."""
        missing_es, missing_en = self._check_file("common.json", en_files, es_files)
        assert not missing_es, f"common.json: keys missing in ES: {sorted(missing_es)}"
        assert not missing_en, f"common.json: keys missing in EN: {sorted(missing_en)}"

    def test_nav_json_has_no_missing_keys(self, en_files, es_files):
        """Focused check on nav.json — navigation items visible on every page."""
        if "nav.json" not in en_files or "nav.json" not in es_files:
            pytest.skip("nav.json not present")
        missing_es, missing_en = self._check_file("nav.json", en_files, es_files)
        assert not missing_es, f"nav.json: keys missing in ES: {sorted(missing_es)}"
        assert not missing_en, f"nav.json: keys missing in EN: {sorted(missing_en)}"

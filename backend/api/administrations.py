"""Canonical Mexican presidential administration (sexenio) periods.

Single source of truth. Before this module, three call sites disagreed on
year boundaries: routers/categories.py's ``/sexenio`` endpoint (Fox
2001-06 ...), routers/analysis.py's ``_ADMIN_ERAS`` (fox 2002-2005 ...),
and frontend/src/lib/administrations.ts (overlapping yearStart/yearEnd
bounds resolved first-match).

Decision (2026-09-16): at year granularity the transition year belongs to
the OUTGOING president, because Mexican federal terms start 1 December —
11 of the transition year's 12 months are still the outgoing
administration. Year ranges below are inclusive and non-overlapping.
"""
from typing import NamedTuple, Optional


class Administration(NamedTuple):
    key: str
    short_es: str
    short_en: str
    long: str
    year_min: int
    year_max: int


ADMINISTRATIONS: list[Administration] = [
    Administration("fox", "Fox", "Fox", "Vicente Fox", 2000, 2006),
    Administration("calderon", "Calderón", "Calderon", "Felipe Calderón", 2007, 2012),
    Administration("pena_nieto", "Peña Nieto", "Pena Nieto", "Enrique Peña Nieto", 2013, 2018),
    Administration("amlo", "AMLO", "AMLO", "Andrés Manuel López Obrador", 2019, 2024),
    Administration("sheinbaum", "Sheinbaum", "Sheinbaum", "Claudia Sheinbaum", 2025, 2030),
]

ADMINISTRATION_KEYS: frozenset[str] = frozenset(a.key for a in ADMINISTRATIONS)
ADMINISTRATIONS_BY_KEY: dict[str, Administration] = {a.key: a for a in ADMINISTRATIONS}


def get_administration_for_year(year: int) -> Optional[Administration]:
    """Resolve a calendar year to its Administration (outgoing-president rule)."""
    for a in ADMINISTRATIONS:
        if a.year_min <= year <= a.year_max:
            return a
    return None

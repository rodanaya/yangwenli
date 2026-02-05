"""
Temporal events for Mexican procurement analysis.

Key events affecting procurement patterns including elections,
budget cycles, audits, crises, and policy milestones.
"""

from dataclasses import dataclass
from typing import Optional, List

@dataclass
class TemporalEventData:
    """A significant event affecting procurement."""
    id: str
    date: str  # YYYY-MM format
    year: int
    month: Optional[int]
    type: str  # election, budget, audit, crisis, milestone
    title: str
    description: str
    impact: str = "medium"  # high, medium, low
    source: Optional[str] = None


TEMPORAL_EVENTS: List[TemporalEventData] = [
    # Elections
    TemporalEventData(
        id="e1", date="2024-06", year=2024, month=6, type="election",
        title="Elección Presidencial 2024",
        description="Claudia Sheinbaum electa presidenta",
        impact="high", source="INE"
    ),
    TemporalEventData(
        id="e2", date="2021-06", year=2021, month=6, type="election",
        title="Elecciones Intermedias",
        description="Elecciones legislativas federales",
        impact="high", source="INE"
    ),
    TemporalEventData(
        id="e3", date="2018-07", year=2018, month=7, type="election",
        title="Elección Presidencial 2018",
        description="AMLO electo presidente",
        impact="high", source="INE"
    ),
    TemporalEventData(
        id="e4", date="2012-07", year=2012, month=7, type="election",
        title="Elección Presidencial 2012",
        description="Peña Nieto electo presidente",
        impact="high", source="INE"
    ),
    TemporalEventData(
        id="e5", date="2006-07", year=2006, month=7, type="election",
        title="Elección Presidencial 2006",
        description="Calderón electo presidente",
        impact="high", source="INE"
    ),

    # Administration changes
    TemporalEventData(
        id="m1", date="2024-10", year=2024, month=10, type="milestone",
        title="Inicio Administración Sheinbaum",
        description="Nueva administración federal",
        impact="high"
    ),
    TemporalEventData(
        id="m2", date="2018-12", year=2018, month=12, type="milestone",
        title="Inicio Administración AMLO",
        description="Cambio de administración federal",
        impact="high"
    ),
    TemporalEventData(
        id="m3", date="2012-12", year=2012, month=12, type="milestone",
        title="Inicio Administración Peña Nieto",
        description="Cambio de administración federal",
        impact="high"
    ),

    # Budget cycles
    TemporalEventData(
        id="b1", date="2024-01", year=2024, month=1, type="budget",
        title="PEF 2024",
        description="Presupuesto de Egresos de la Federación 2024 entra en vigor",
        impact="medium"
    ),
    TemporalEventData(
        id="b2", date="2023-01", year=2023, month=1, type="budget",
        title="PEF 2023",
        description="Presupuesto de Egresos de la Federación 2023 entra en vigor",
        impact="medium"
    ),

    # Crises and emergencies
    TemporalEventData(
        id="c1", date="2020-03", year=2020, month=3, type="crisis",
        title="Emergencia COVID-19",
        description="Declaración de emergencia sanitaria - adquisiciones de emergencia autorizadas",
        impact="high", source="DOF"
    ),
    TemporalEventData(
        id="c2", date="2017-09", year=2017, month=9, type="crisis",
        title="Terremoto 7.1",
        description="Sismo en Ciudad de México - reconstrucción de emergencia",
        impact="high"
    ),

    # Audits
    TemporalEventData(
        id="a1", date="2024-02", year=2024, month=2, type="audit",
        title="Informe ASF Cuenta Pública 2022",
        description="Auditoría Superior de la Federación publica hallazgos",
        impact="medium", source="ASF"
    ),
    TemporalEventData(
        id="a2", date="2023-02", year=2023, month=2, type="audit",
        title="Informe ASF Cuenta Pública 2021",
        description="Auditoría Superior de la Federación publica hallazgos",
        impact="medium", source="ASF"
    ),
    TemporalEventData(
        id="a3", date="2022-02", year=2022, month=2, type="audit",
        title="Informe ASF Cuenta Pública 2020",
        description="Hallazgos sobre gasto COVID",
        impact="high", source="ASF"
    ),

    # Policy changes
    TemporalEventData(
        id="p1", date="2019-11", year=2019, month=11, type="milestone",
        title="Ley de Austeridad Republicana",
        description="Nueva política de compras públicas",
        impact="medium", source="DOF"
    ),
]

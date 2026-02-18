"""
Service layer for RUBLI API.

Domain services encapsulate business logic, query construction,
and data mapping. Routers become thin: parse request → call service → return response.
"""
from .query_builder import QueryBuilder
from .pagination import paginate_query, PaginatedResult
from .vendor_service import vendor_service
from .contract_service import contract_service
from .institution_service import institution_service
from .analysis_service import analysis_service
from .report_service import report_service
from .network_service import network_service

__all__ = [
    "QueryBuilder",
    "paginate_query",
    "PaginatedResult",
    "vendor_service",
    "contract_service",
    "institution_service",
    "analysis_service",
    "report_service",
    "network_service",
]

# API routers
from .industries import router as industries_router
from .vendors import router as vendors_router
from .stats import router as stats_router
from .network import router as network_router
from .analysis import router as analysis_router
from .watchlist import router as watchlist_router
from .watchlist_folders import router as watchlist_folders_router
from .reports import router as reports_router
from .investigation import router as investigation_router

__all__ = [
    "industries_router",
    "vendors_router",
    "stats_router",
    "network_router",
    "analysis_router",
    "watchlist_router",
    "watchlist_folders_router",
    "reports_router",
    "investigation_router",
]

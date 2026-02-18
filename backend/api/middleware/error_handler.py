"""
Global error handlers for the RUBLI API.

Translates exceptions into consistent JSON error responses.
Never exposes internal details to clients.
"""
import sqlite3

import structlog
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = structlog.get_logger("rubli.api.errors")


class DomainError(Exception):
    """Base class for domain-level errors."""
    status_code: int = 400
    error_code: str = "DOMAIN_ERROR"

    def __init__(self, message: str, details: dict | None = None):
        self.message = message
        self.details = details or {}
        super().__init__(message)


class NotFoundError(DomainError):
    """Resource not found."""
    status_code = 404
    error_code = "NOT_FOUND"


class InvalidFilterError(DomainError):
    """Invalid filter parameter."""
    status_code = 422
    error_code = "INVALID_FILTER"


class AmountValidationError(DomainError):
    """Contract amount exceeds threshold."""
    status_code = 422
    error_code = "INVALID_AMOUNT"


def register_error_handlers(app: FastAPI) -> None:
    """Register global exception handlers on the FastAPI app."""

    @app.exception_handler(DomainError)
    async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                    "details": exc.details if exc.details else None,
                }
            },
        )

    @app.exception_handler(sqlite3.OperationalError)
    async def db_operational_error(request: Request, exc: sqlite3.OperationalError) -> JSONResponse:
        logger.error("database_error", error=str(exc), path=request.url.path)
        return JSONResponse(
            status_code=503,
            content={
                "error": {
                    "code": "DB_UNAVAILABLE",
                    "message": "Database temporarily unavailable. Please retry.",
                }
            },
        )

    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
        logger.warning("validation_error", error=str(exc), path=request.url.path)
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "INVALID_INPUT",
                    "message": str(exc),
                }
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error(
            "unhandled_error",
            error_type=type(exc).__name__,
            error=str(exc),
            path=request.url.path,
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An unexpected error occurred.",
                }
            },
        )

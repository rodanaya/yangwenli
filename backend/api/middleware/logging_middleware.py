"""
Request logging middleware with structured JSON output.

Logs every request with method, path, status, duration.
Warns on slow queries (>2000ms).
Adds X-Request-ID header for tracing.
"""
import time
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = structlog.get_logger("rubli.api")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all API requests with timing and tracing."""

    SLOW_THRESHOLD_MS = 2000

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())[:8]
        start_time = time.perf_counter()

        # Bind request context for all log messages in this request
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 1)
            logger.error(
                "request_failed",
                duration_ms=duration_ms,
                status=500,
            )
            raise

        duration_ms = round((time.perf_counter() - start_time) * 1000, 1)

        # Add tracing header
        response.headers["X-Request-ID"] = request_id

        # Log level based on duration and status
        log_data = {
            "duration_ms": duration_ms,
            "status": response.status_code,
        }

        # Add query params for non-health endpoints (redact PII)
        if request.url.path not in ("/health", "/", "/docs", "/openapi.json"):
            query_params = dict(request.query_params)
            if query_params:
                SENSITIVE_PARAMS = {"vendor_rfc", "rfc", "tax_id", "rfc_proveedor"}
                log_data["query_params"] = {
                    k: ("[REDACTED]" if k.lower() in SENSITIVE_PARAMS else v)
                    for k, v in query_params.items()
                }

        if response.status_code >= 500:
            logger.error("request_completed", **log_data)
        elif duration_ms > self.SLOW_THRESHOLD_MS:
            logger.warning("slow_request", **log_data)
        elif response.status_code >= 400:
            logger.warning("request_completed", **log_data)
        else:
            logger.info("request_completed", **log_data)

        return response

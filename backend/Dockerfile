# RUBLI Backend — multi-stage build
# Stage 1: builder — installs gcc/libffi-dev needed by some packages
FROM python:3.11-slim AS builder

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

# gcc + libffi needed to compile some wheels (e.g. cffi, cryptography)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-api.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements-api.txt


# Stage 2: runtime — no build toolchain in the final image
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# curl only — health check needs it; drop gcc/libffi from final layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Create non-root user
RUN addgroup --system app && adduser --system --ingroup app app

# Copy application code (owned by app user)
COPY --chown=app:app . .

# Database directory — SQLite WAL/SHM lock files need write access
RUN mkdir -p /data && chown app:app /data && chown app:app /app

USER app

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD python -c "import httpx; httpx.get('http://localhost:8001/health', timeout=5)" || exit 1

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "4"]

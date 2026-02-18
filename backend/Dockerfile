# Yang Wen-li Backend - FastAPI with SQLite
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching (slim API-only deps)
COPY requirements-api.txt .

# Install Python dependencies (API runtime only — no ML/ETL packages)
RUN pip install --no-cache-dir -r requirements-api.txt

# Create non-root user for security
RUN addgroup --system app && adduser --system --ingroup app app

# Copy application code
COPY --chown=app:app . .

# Create data directory for SQLite database
RUN mkdir -p /data && chown app:app /data

# Switch to non-root user
USER app

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD python -c "import httpx; httpx.get('http://localhost:8001/health', timeout=5)" || exit 1

# Run the application
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8001"]

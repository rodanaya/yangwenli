"""
Thread-safe caching utilities for the RUBLI API.

Replaces ad-hoc _cache = {} patterns with bounded, thread-safe TTLCache.
All caches are size-bounded (maxsize) and time-bounded (ttl seconds).
"""
import threading
from cachetools import TTLCache


class AppCache:
    """Application-wide cache registry. Thread-safe with size and TTL bounds."""

    def __init__(self):
        self._lock = threading.Lock()
        self._caches: dict[str, TTLCache] = {}

    def get_cache(self, name: str, maxsize: int = 128, ttl: int = 600) -> TTLCache:
        """Get or create a named TTLCache. Thread-safe."""
        with self._lock:
            if name not in self._caches:
                self._caches[name] = TTLCache(maxsize=maxsize, ttl=ttl)
            return self._caches[name]

    def get(self, cache_name: str, key: str):
        """Get a value from a named cache. Returns None if not found/expired."""
        cache = self._caches.get(cache_name)
        if cache is None:
            return None
        try:
            return cache[key]
        except KeyError:
            return None

    def set(self, cache_name: str, key: str, value, maxsize: int = 128, ttl: int = 600):
        """Set a value in a named cache. Creates cache if needed."""
        cache = self.get_cache(cache_name, maxsize=maxsize, ttl=ttl)
        cache[key] = value

    def invalidate(self, cache_name: str, key: str | None = None):
        """Invalidate a specific key or entire cache."""
        cache = self._caches.get(cache_name)
        if cache is None:
            return
        if key is None:
            cache.clear()
        else:
            cache.pop(key, None)

    def stats(self) -> dict:
        """Return cache statistics for monitoring."""
        result = {}
        for name, cache in self._caches.items():
            result[name] = {
                "size": len(cache),
                "maxsize": cache.maxsize,
                "ttl": cache.ttl,
            }
        return result


# Global cache instance — import this in routers
app_cache = AppCache()


class SimpleCache:
    """Thread-safe in-memory cache with TTL support for expensive queries."""

    def __init__(self):
        self._cache: dict[str, dict] = {}
        self._lock = threading.Lock()

    def get(self, key: str):
        """Get cached value if not expired."""
        from datetime import datetime
        with self._lock:
            if key in self._cache:
                entry = self._cache[key]
                if datetime.now() < entry["expires_at"]:
                    return entry["value"]
                del self._cache[key]
            return None

    def set(self, key: str, value, ttl_seconds: int = 3600) -> None:
        """Set cached value with TTL."""
        from datetime import datetime, timedelta
        with self._lock:
            self._cache[key] = {
                "value": value,
                "expires_at": datetime.now() + timedelta(seconds=ttl_seconds),
            }

    def invalidate(self, pattern: str = None) -> None:
        """Invalidate cache entries matching pattern (or all if None)."""
        with self._lock:
            if pattern is None:
                self._cache.clear()
            else:
                for k in [k for k in self._cache if pattern in k]:
                    del self._cache[k]

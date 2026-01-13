"""Common Pydantic models for pagination and responses."""
from pydantic import BaseModel, Field
from typing import TypeVar, Generic, List
from datetime import datetime

T = TypeVar("T")


class PaginationMeta(BaseModel):
    """Pagination metadata for list responses."""

    page: int = Field(..., description="Current page number (1-indexed)")
    per_page: int = Field(..., description="Items per page")
    total: int = Field(..., description="Total number of items")
    total_pages: int = Field(..., description="Total number of pages")

    @classmethod
    def create(cls, page: int, per_page: int, total: int) -> "PaginationMeta":
        """Create pagination metadata from parameters."""
        total_pages = (total + per_page - 1) // per_page if per_page > 0 else 0
        return cls(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=total_pages
        )


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper."""

    data: List[T]
    pagination: PaginationMeta


class TimestampedResponse(BaseModel):
    """Base class for responses with timestamps."""

    generated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When this response was generated"
    )

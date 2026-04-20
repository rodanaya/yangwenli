"""User authentication router for RUBLI API.

Endpoints:
  POST /auth/register  — create account, return JWT
  POST /auth/login     — verify credentials, return JWT
  GET  /auth/me        — return current user info (requires JWT)
  POST /auth/logout    — client-side only, returns {ok: true}
"""
import os
import sqlite3
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from passlib.context import CryptContext
from jose import jwt

from ..dependencies import get_db
from ..middleware.auth_jwt import JWT_SECRET, JWT_ALGORITHM, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_EXPIRE_DAYS = 30


# ── Pydantic models ──────────────────────────────────────────────────────────

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str = Field(..., min_length=1, max_length=200)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    created_at: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Helpers ──────────────────────────────────────────────────────────────────

def _hash_password(plain: str) -> str:
    return _pwd_context.hash(plain)


def _verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)


def _make_token(user_id: int, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _user_to_out(row: sqlite3.Row) -> UserOut:
    return UserOut(
        id=row["id"],
        email=row["email"],
        name=row["name"],
        created_at=row["created_at"] or "",
    )


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse, status_code=201)
def register(body: RegisterIn):
    """Create a new user account and return a JWT."""
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM users WHERE email = ?", (body.email,)
        ).fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists",
            )
        password_hash = _hash_password(body.password)
        cur = conn.execute(
            "INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)",
            (body.email, password_hash, body.name),
        )
        conn.commit()
        row = conn.execute(
            "SELECT id, email, name, created_at FROM users WHERE id = ?",
            (cur.lastrowid,),
        ).fetchone()

    token = _make_token(row["id"], row["email"])
    return AuthResponse(access_token=token, user=_user_to_out(row))


@router.post("/login", response_model=AuthResponse)
def login(body: LoginIn):
    """Authenticate and return a JWT."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, email, name, password_hash, created_at FROM users WHERE email = ? AND is_active = 1",
            (body.email,),
        ).fetchone()

    if not row or not _verify_password(body.password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = _make_token(row["id"], row["email"])
    return AuthResponse(access_token=token, user=_user_to_out(row))


@router.get("/me", response_model=UserOut)
def me(current_user: dict = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    user_id = int(current_user["sub"])
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, email, name, created_at FROM users WHERE id = ? AND is_active = 1",
            (user_id,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _user_to_out(row)


@router.post("/logout")
def logout():
    """Signal logout. Clients should discard the token locally."""
    return {"ok": True}

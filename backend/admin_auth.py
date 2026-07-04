"""Simple admin authentication for the study dashboard."""

import hashlib
import os
import secrets
from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

ADMIN_PASSWORD = os.environ.get("HCO_ADMIN_PASSWORD", "").strip()
ADMIN_TOKEN_SECRET = os.environ.get(
    "HCO_ADMIN_TOKEN",
    hashlib.sha256(f"hco-admin:{ADMIN_PASSWORD}".encode()).hexdigest() if ADMIN_PASSWORD else "",
)


def admin_configured() -> bool:
    return bool(ADMIN_PASSWORD)


def verify_password(password: str) -> bool:
    if not ADMIN_PASSWORD:
        return False
    return secrets.compare_digest(password.strip(), ADMIN_PASSWORD)


_bearer = HTTPBearer(auto_error=False)


def issue_token() -> str:
    if not ADMIN_TOKEN_SECRET:
        raise HTTPException(status_code=503, detail="Admin access is not configured")
    return ADMIN_TOKEN_SECRET


def require_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> None:
    if not ADMIN_TOKEN_SECRET:
        raise HTTPException(status_code=503, detail="Admin access is not configured")
    if credentials is None or credentials.credentials != ADMIN_TOKEN_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

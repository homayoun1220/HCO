"""Admin dashboard API routes."""

import time

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

import db
from admin_analytics import build_analytics_report, build_speed_trial_report
from admin_auth import admin_configured, issue_token, require_admin, verify_password

router = APIRouter(prefix="/api/admin", tags=["admin"])

TOTAL_TRIALS = 20
ACTIVE_WINDOW_SECONDS = 900  # 15 minutes


class AdminLoginRequest(BaseModel):
    password: str


@router.post("/login")
async def admin_login(body: AdminLoginRequest):
    if not admin_configured():
        raise HTTPException(status_code=503, detail="Admin access is not configured")
    if not verify_password(body.password):
        raise HTTPException(status_code=401, detail="Invalid password")
    return {"token": issue_token(), "expires_in": None}


@router.get("/stats")
async def admin_stats(_: None = Depends(require_admin)):
    return await db.get_admin_stats(active_window_seconds=ACTIVE_WINDOW_SECONDS)


@router.get("/sessions")
async def admin_sessions(_: None = Depends(require_admin)):
    return {"sessions": await db.get_admin_sessions(total_trials=TOTAL_TRIALS)}


@router.get("/export")
async def admin_export(
    clean: bool = Query(False, description="Only completed sessions with exactly 20 trials"),
    _: None = Depends(require_admin),
):
    csv_data = await db.export_trials_csv(clean_only=clean)
    filename = "trials_clean.csv" if clean else "trials_export.csv"
    return PlainTextResponse(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/analytics")
async def admin_analytics(_: None = Depends(require_admin)):
    return await build_analytics_report()


@router.get("/speed-trials")
async def admin_speed_trials(_: None = Depends(require_admin)):
    return await build_speed_trial_report()


@router.get("/health")
async def admin_health(_: None = Depends(require_admin)):
    return {"status": "ok", "timestamp": time.time(), "service": "hco-backend"}

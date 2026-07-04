"""FastAPI backend for HCO human study."""

import os
import random
import secrets
import time
import uuid
from contextlib import asynccontextmanager
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import crypto
import db
from admin_routes import router as admin_router
from challenges import attention, biometric, perceptual, reasoning

FAMILIES = ["perceptual", "reasoning", "attention", "biometric"]
TRIALS_PER_FAMILY = 5
TOTAL_TRIALS = len(FAMILIES) * TRIALS_PER_FAMILY
COMPLETION_CODE = os.environ.get("HCO_COMPLETION_CODE", "HCO-STUDY-COMPLETE")

GENERATORS = {
    "perceptual": (perceptual.generate_challenge, perceptual.verify_response),
    "reasoning": (reasoning.generate_challenge, reasoning.verify_response),
    "attention": (attention.generate_challenge, attention.verify_response),
    "biometric": (biometric.generate_challenge, biometric.verify_response),
}

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    os.environ.get("FRONTEND_URL", ""),
]
CORS_ORIGINS = [o for o in CORS_ORIGINS if o]


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init_db()
    yield


app = FastAPI(title="HCO Study API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_router)


class SessionStartRequest(BaseModel):
    prolific_pid: str = ""
    study_id: str = ""


class ChallengeIssueRequest(BaseModel):
    session_id: str
    family: str
    trial_index: int


class ChallengeSubmitRequest(BaseModel):
    session_id: str
    challenge_id: str
    response: Dict[str, Any]


class SessionCompleteRequest(BaseModel):
    session_id: str


@app.get("/api/health")
async def health():
    return {"status": "ok", "timestamp": time.time()}


@app.post("/api/session/start")
async def session_start(body: SessionStartRequest):
    session_id = str(uuid.uuid4())
    participant_id = secrets.token_hex(16)
    block_order = FAMILIES.copy()
    random.shuffle(block_order)

    await db.create_session(
        session_id=session_id,
        participant_id=participant_id,
        prolific_pid=body.prolific_pid,
        study_id=body.study_id,
        block_order=block_order,
    )

    return {
        "session_id": session_id,
        "block_order": block_order,
        "participant_id": participant_id,
    }


@app.post("/api/challenge/issue")
async def challenge_issue(body: ChallengeIssueRequest):
    session = await db.get_session(body.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.get("completed_at"):
        raise HTTPException(status_code=409, detail="Study already completed")

    submitted_trials = await db.count_submitted_trials(body.session_id)
    if submitted_trials >= TOTAL_TRIALS:
        raise HTTPException(status_code=409, detail="Study already completed")

    if body.family not in GENERATORS:
        raise HTTPException(status_code=400, detail=f"Unknown family: {body.family}")

    gen_fn, _ = GENERATORS[body.family]
    public_data, private_data = gen_fn()

    window_id = f"{body.session_id}:{body.family}:{body.trial_index}"
    nonce = crypto.generate_nonce(window_id)
    challenge_id = crypto.compute_binding_tag(
        session["participant_id"], window_id, body.trial_index, nonce
    )

    t_issue = time.time()
    delta_resp = public_data.get("delta_resp", 10.0)

    full_private = {**public_data, **private_data}

    await db.issue_challenge(
        participant_id=session["participant_id"],
        session_id=body.session_id,
        family=body.family,
        trial_index=body.trial_index,
        challenge_id=challenge_id,
        t_issue=t_issue,
        delta_resp=delta_resp,
        challenge_data=full_private,
        nonce=nonce,
    )

    return {
        "challenge_id": challenge_id,
        "challenge_data": public_data,
        "delta_resp": delta_resp,
        "t_issue": t_issue,
    }


@app.post("/api/challenge/submit")
async def challenge_submit(body: ChallengeSubmitRequest):
    trial = await db.get_trial_by_challenge_id(body.challenge_id)
    if trial is None:
        raise HTTPException(status_code=404, detail="Challenge not found")

    if trial["status"] == "submitted":
        raise HTTPException(status_code=409, detail="Challenge already submitted")

    if trial["session_id"] != body.session_id:
        raise HTTPException(status_code=403, detail="Session mismatch")

    t_recv = time.time()
    t_issue = trial["t_issue"]
    latency = t_recv - t_issue
    delta_resp = trial["delta_resp"]

    _, verify_fn = GENERATORS[trial["family"]]
    challenge_data = trial["challenge_data"]
    correct = verify_fn(challenge_data, body.response)

    latency_fail = latency > delta_resp
    correctness_fail = not correct and not latency_fail
    passed = correct and not latency_fail

    await db.submit_trial(
        challenge_id=body.challenge_id,
        t_recv=t_recv,
        latency=latency,
        correct=correct,
        passed=passed,
        latency_fail=latency_fail,
        correctness_fail=correctness_fail,
        response_raw=body.response,
    )

    return {
        "correct": correct,
        "passed": passed,
        "latency": latency,
        "latency_fail": latency_fail,
        "correctness_fail": correctness_fail,
    }


@app.post("/api/session/complete")
async def session_complete(body: SessionCompleteRequest):
    session = await db.get_session(body.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    await db.complete_session(body.session_id)
    score = await db.get_session_score(body.session_id)

    return {
        "completion_code": COMPLETION_CODE,
        "score": score,
    }

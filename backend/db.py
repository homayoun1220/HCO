"""SQLite database layer using aiosqlite."""

import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import aiosqlite

DB_PATH = os.environ.get("HCO_DB_PATH", os.path.join(os.path.dirname(__file__), "hco_study.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    participant_id TEXT NOT NULL,
    prolific_pid TEXT,
    study_id TEXT,
    block_order TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT
);

CREATE TABLE IF NOT EXISTS trials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    family TEXT NOT NULL,
    trial_index INTEGER NOT NULL,
    challenge_id TEXT NOT NULL UNIQUE,
    t_issue REAL,
    t_recv REAL,
    latency REAL,
    correct BOOLEAN,
    passed BOOLEAN,
    latency_fail BOOLEAN,
    correctness_fail BOOLEAN,
    delta_resp REAL,
    response_raw TEXT,
    status TEXT DEFAULT 'issued',
    challenge_data TEXT,
    nonce TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_trials_session ON trials(session_id);
CREATE INDEX IF NOT EXISTS idx_trials_participant ON trials(participant_id);
"""


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(SCHEMA)
        await db.commit()


async def create_session(
    session_id: str,
    participant_id: str,
    prolific_pid: str,
    study_id: str,
    block_order: List[str],
) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO sessions (id, participant_id, prolific_pid, study_id, block_order, started_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                session_id,
                participant_id,
                prolific_pid,
                study_id,
                json.dumps(block_order),
                utc_now(),
            ),
        )
        await db.commit()


async def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)) as cursor:
            row = await cursor.fetchone()
            if row is None:
                return None
            result = dict(row)
            result["block_order"] = json.loads(result["block_order"])
            return result


async def complete_session(session_id: str) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE sessions SET completed_at = ? WHERE id = ?",
            (utc_now(), session_id),
        )
        await db.commit()


async def issue_challenge(
    participant_id: str,
    session_id: str,
    family: str,
    trial_index: int,
    challenge_id: str,
    t_issue: float,
    delta_resp: float,
    challenge_data: Dict[str, Any],
    nonce: str,
) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO trials (
                participant_id, session_id, family, trial_index, challenge_id,
                t_issue, delta_resp, challenge_data, nonce, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'issued', ?)
            """,
            (
                participant_id,
                session_id,
                family,
                trial_index,
                challenge_id,
                t_issue,
                delta_resp,
                json.dumps(challenge_data),
                nonce,
                utc_now(),
            ),
        )
        await db.commit()


async def get_trial_by_challenge_id(challenge_id: str) -> Optional[Dict[str, Any]]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM trials WHERE challenge_id = ?", (challenge_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if row is None:
                return None
            result = dict(row)
            if result.get("challenge_data"):
                result["challenge_data"] = json.loads(result["challenge_data"])
            if result.get("response_raw"):
                result["response_raw"] = json.loads(result["response_raw"])
            return result


async def submit_trial(
    challenge_id: str,
    t_recv: float,
    latency: float,
    correct: bool,
    passed: bool,
    latency_fail: bool,
    correctness_fail: bool,
    response_raw: Dict[str, Any],
) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            UPDATE trials SET
                t_recv = ?, latency = ?, correct = ?, passed = ?,
                latency_fail = ?, correctness_fail = ?,
                response_raw = ?, status = 'submitted'
            WHERE challenge_id = ?
            """,
            (
                t_recv,
                latency,
                correct,
                passed,
                latency_fail,
                correctness_fail,
                json.dumps(response_raw),
                challenge_id,
            ),
        )
        await db.commit()


async def count_submitted_trials(session_id: str) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT COUNT(*) FROM trials WHERE session_id = ? AND status = 'submitted'",
            (session_id,),
        ) as cursor:
            row = await cursor.fetchone()
            return row[0] or 0


async def get_session_score(session_id: str) -> Dict[str, int]:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            """
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) as passed
            FROM trials WHERE session_id = ? AND status = 'submitted'
            """,
            (session_id,),
        ) as cursor:
            row = await cursor.fetchone()
            return {"total": row[0] or 0, "passed": row[1] or 0}


async def export_trials_csv() -> str:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """
            SELECT id, participant_id, session_id, family, trial_index,
                   challenge_id, t_issue, t_recv, latency, correct, passed,
                   latency_fail, correctness_fail, delta_resp, response_raw,
                   status, created_at
            FROM trials ORDER BY id
            """
        ) as cursor:
            rows = await cursor.fetchall()

    if not rows:
        return "id,participant_id,session_id,family,trial_index,challenge_id,t_issue,t_recv,latency,correct,passed,latency_fail,correctness_fail,delta_resp,response_raw,status,created_at\n"

    headers = rows[0].keys()
    lines = [",".join(headers)]
    for row in rows:
        values = []
        for h in headers:
            val = row[h]
            if val is None:
                values.append("")
            elif isinstance(val, str) and ("," in val or '"' in val):
                values.append(f'"{val.replace(chr(34), chr(34)+chr(34))}"')
            else:
                values.append(str(val))
        lines.append(",".join(values))
    return "\n".join(lines) + "\n"

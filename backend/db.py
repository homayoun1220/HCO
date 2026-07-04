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


async def export_trials_csv(clean_only: bool = False) -> str:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        query = """
            SELECT t.id, t.participant_id, t.session_id, t.family, t.trial_index,
                   t.challenge_id, t.t_issue, t.t_recv, t.latency, t.correct, t.passed,
                   t.latency_fail, t.correctness_fail, t.delta_resp, t.response_raw,
                   t.status, t.created_at
            FROM trials t
        """
        if clean_only:
            query += """
            WHERE t.status = 'submitted'
              AND t.session_id IN (
                SELECT s.id FROM sessions s
                WHERE s.completed_at IS NOT NULL
                  AND (SELECT COUNT(*) FROM trials tt
                       WHERE tt.session_id = s.id AND tt.status = 'submitted') = 20
              )
            ORDER BY t.id
            """
        else:
            query += " ORDER BY t.id"

        async with db.execute(query) as cursor:
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


async def get_admin_stats(active_window_seconds: int = 900) -> Dict[str, Any]:
    import time

    now = time.time()
    active_since = now - active_window_seconds

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        async with db.execute("SELECT COUNT(*) FROM sessions") as cursor:
            sessions_total = (await cursor.fetchone())[0]

        async with db.execute(
            "SELECT COUNT(*) FROM sessions WHERE completed_at IS NOT NULL"
        ) as cursor:
            participants_completed = (await cursor.fetchone())[0]

        async with db.execute(
            """
            SELECT COUNT(*) FROM sessions s
            WHERE s.completed_at IS NOT NULL
              AND (SELECT COUNT(*) FROM trials t
                   WHERE t.session_id = s.id AND t.status = 'submitted') = 20
            """
        ) as cursor:
            participants_clean = (await cursor.fetchone())[0]

        async with db.execute(
            """
            SELECT COUNT(DISTINCT participant_id) FROM trials WHERE status = 'submitted'
            """
        ) as cursor:
            participants_with_trials = (await cursor.fetchone())[0]

        async with db.execute(
            """
            SELECT COUNT(DISTINCT t.session_id) FROM trials t
            JOIN sessions s ON s.id = t.session_id
            WHERE t.status = 'submitted'
              AND t.t_recv >= ?
              AND s.completed_at IS NULL
            """,
            (active_since,),
        ) as cursor:
            participants_active_now = (await cursor.fetchone())[0]

        async with db.execute(
            """
            SELECT COUNT(*) FROM sessions
            WHERE completed_at IS NULL
              AND id IN (SELECT DISTINCT session_id FROM trials WHERE status = 'submitted')
            """
        ) as cursor:
            sessions_in_progress = (await cursor.fetchone())[0]

        async with db.execute(
            "SELECT COUNT(*), SUM(passed) FROM trials WHERE status = 'submitted'"
        ) as cursor:
            row = await cursor.fetchone()
            trials_submitted = row[0] or 0
            trials_passed = row[1] or 0

        by_family = []
        async with db.execute(
            """
            SELECT family,
                   COUNT(*) AS n,
                   SUM(passed) AS passed,
                   AVG(latency) AS mean_latency,
                   AVG(latency_fail) AS latency_fail_rate,
                   AVG(correctness_fail) AS correctness_fail_rate
            FROM trials WHERE status = 'submitted'
            GROUP BY family ORDER BY family
            """
        ) as cursor:
            for row in await cursor.fetchall():
                n = row["n"] or 0
                passed = row["passed"] or 0
                by_family.append(
                    {
                        "family": row["family"],
                        "n": n,
                        "pass_rate": round(passed / n, 3) if n else 0.0,
                        "mean_latency": round(row["mean_latency"] or 0.0, 2),
                        "latency_fail_rate": round(row["latency_fail_rate"] or 0.0, 3),
                        "correctness_fail_rate": round(row["correctness_fail_rate"] or 0.0, 3),
                    }
                )

    return {
        "generated_at": now,
        "participants_with_trials": participants_with_trials,
        "participants_completed": participants_completed,
        "participants_clean": participants_clean,
        "participants_active_now": participants_active_now,
        "sessions_total": sessions_total,
        "sessions_in_progress": sessions_in_progress,
        "trials_submitted": trials_submitted,
        "trials_passed": trials_passed,
        "overall_pass_rate": round(trials_passed / trials_submitted, 3) if trials_submitted else 0.0,
        "active_window_minutes": active_window_seconds // 60,
        "by_family": by_family,
    }


async def get_admin_sessions(total_trials: int = 20) -> List[Dict[str, Any]]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """
            SELECT s.id, s.participant_id, s.prolific_pid, s.started_at, s.completed_at,
                   (SELECT COUNT(*) FROM trials t
                    WHERE t.session_id = s.id AND t.status = 'submitted') AS trial_count,
                   (SELECT SUM(passed) FROM trials t
                    WHERE t.session_id = s.id AND t.status = 'submitted') AS passed_count,
                   (SELECT MAX(t_recv) FROM trials t
                    WHERE t.session_id = s.id AND t.status = 'submitted') AS last_activity
            FROM sessions s
            ORDER BY s.started_at DESC
            """
        ) as cursor:
            rows = await cursor.fetchall()

    sessions = []
    for row in rows:
        trial_count = row["trial_count"] or 0
        completed = row["completed_at"] is not None
        if completed and trial_count == total_trials:
            status = "clean"
        elif completed:
            status = "completed_incomplete"
        elif trial_count > 0:
            status = "in_progress"
        else:
            status = "started"

        sessions.append(
            {
                "session_id": row["id"],
                "participant_id": row["participant_id"],
                "prolific_pid": row["prolific_pid"] or "",
                "started_at": row["started_at"],
                "completed_at": row["completed_at"],
                "trial_count": trial_count,
                "passed_count": row["passed_count"] or 0,
                "last_activity": row["last_activity"],
                "status": status,
            }
        )
    return sessions

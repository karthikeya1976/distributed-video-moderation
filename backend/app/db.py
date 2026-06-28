import json
from datetime import datetime, timezone
from typing import Any, Optional

import psycopg2
import psycopg2.extras

from app import config

_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS videos (
    id             TEXT PRIMARY KEY,
    filename       TEXT NOT NULL,
    file_path      TEXT,
    status         TEXT NOT NULL DEFAULT 'pending',
    overall_status TEXT,
    pillar_results JSONB,
    reasons        JSONB,
    size_bytes     INTEGER,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""


def _connect():
    conn = psycopg2.connect(config.POSTGRES_URL)
    conn.autocommit = True
    return conn


def _ensure_schema() -> None:
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(_CREATE_TABLE)


_ensure_schema()


def create_job(job_id: str, filename: str, file_path: Optional[str] = None) -> None:
    now = datetime.now(timezone.utc)
    sql = """
        INSERT INTO videos (id, filename, file_path, status, created_at, updated_at)
        VALUES (%s, %s, %s, 'pending', %s, %s)
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (job_id, filename, file_path, now, now))


def update_job(job_id: str, fields: dict[str, Any]) -> None:
    fields = dict(fields)
    fields["updated_at"] = datetime.now(timezone.utc)

    # Serialize list/dict values to JSON strings for JSONB columns
    jsonb_cols = {"pillar_results", "reasons"}
    set_parts = []
    values = []
    for col, val in fields.items():
        set_parts.append(f"{col} = %s")
        if col in jsonb_cols and val is not None:
            values.append(json.dumps(val))
        else:
            values.append(val)
    values.append(job_id)

    sql = f"UPDATE videos SET {', '.join(set_parts)} WHERE id = %s"
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, values)


def get_job(job_id: str) -> Optional[dict[str, Any]]:
    sql = "SELECT * FROM videos WHERE id = %s"
    with _connect() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, (job_id,))
            row = cur.fetchone()
    if row is None:
        return None
    d = dict(row)
    # Remap 'id' → '_id' so existing main.py callers (j["job_id"] = j.pop("_id")) work unchanged
    d["_id"] = d.pop("id")
    return d


def list_jobs(limit: int = 50) -> list[dict[str, Any]]:
    sql = "SELECT * FROM videos ORDER BY created_at DESC LIMIT %s"
    with _connect() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, (limit,))
            rows = cur.fetchall()
    result = []
    for row in rows:
        d = dict(row)
        d["_id"] = d.pop("id")
        result.append(d)
    return result

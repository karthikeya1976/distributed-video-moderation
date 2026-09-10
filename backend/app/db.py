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
    user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

_CREATE_USERS_TABLE = """
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    account_type  TEXT NOT NULL DEFAULT 'viewer',
    department    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
            cur.execute(_CREATE_USERS_TABLE)
            # Migrations for columns added after initial schema
            cur.execute("ALTER TABLE videos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL")
            cur.execute("ALTER TABLE videos ADD COLUMN IF NOT EXISTS file_hash TEXT")



def create_job(job_id: str, filename: str, file_path: Optional[str] = None, user_id: Optional[str] = None) -> None:
    now = datetime.now(timezone.utc)
    sql = """
        INSERT INTO videos (id, filename, file_path, status, user_id, created_at, updated_at)
        VALUES (%s, %s, %s, 'pending', %s, %s, %s)
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (job_id, filename, file_path, user_id, now, now))


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


def get_feed(limit: int = 50) -> list[dict[str, Any]]:
    """Return approved and flagged videos — the public viewer feed (blocked content is excluded)."""
    sql = "SELECT * FROM videos WHERE overall_status IN ('approved', 'flagged') ORDER BY created_at DESC LIMIT %s"
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


def create_user(name: str, email: str, password_hash: str) -> dict:
    sql = """
        INSERT INTO users (name, email, password_hash)
        VALUES (%s, %s, %s)
        RETURNING id, name, email, account_type, department, created_at
    """
    with _connect() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, (name, email, password_hash))
            return dict(cur.fetchone())


def get_user_by_id(user_id: str) -> Optional[dict]:
    sql = "SELECT * FROM users WHERE id = %s"
    with _connect() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, (user_id,))
            row = cur.fetchone()
    return dict(row) if row else None


def get_user_by_email(email: str) -> Optional[dict]:
    sql = "SELECT * FROM users WHERE email = %s"
    with _connect() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, (email,))
            row = cur.fetchone()
    return dict(row) if row else None


def upgrade_to_creator(user_id: str, department: str) -> dict:
    sql = """
        UPDATE users
        SET account_type = 'creator', department = %s
        WHERE id = %s
        RETURNING id, name, email, account_type, department
    """
    with _connect() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, (department, user_id))
            return dict(cur.fetchone())


def find_duplicate_hash(file_hash: str, exclude_job_id: str) -> bool:
    """Return True if another completed video with the same SHA-256 hash exists."""
    sql = """
        SELECT 1 FROM videos
        WHERE file_hash = %s AND id != %s AND status = 'done'
        LIMIT 1
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (file_hash, exclude_job_id))
            return cur.fetchone() is not None

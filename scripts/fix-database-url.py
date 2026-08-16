#!/usr/bin/env python3
"""Normalize Supabase DATABASE_URL for Prisma on Vercel (transaction pooler)."""
from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

ROOT = Path(__file__).resolve().parents[1]


def normalize_pool_url(raw: str) -> tuple[str, str]:
    url = raw.strip().strip('"').strip("'")
    parsed = urlparse(url)
    host = parsed.hostname or ""
    port = parsed.port or (5432 if "pooler" not in host else 6543)

    # Session pooler (5432) exhausts connections on serverless — use transaction pooler.
    if "pooler.supabase.com" in host and port == 5432:
        netloc = parsed.netloc.replace(":5432", ":6543")
        parsed = parsed._replace(netloc=netloc)

    query = parse_qs(parsed.query, keep_blank_values=True)
    query["pgbouncer"] = ["true"]
    query["connection_limit"] = ["1"]
    if "sslmode" not in query:
        query["sslmode"] = ["require"]

    pooled = urlunparse(parsed._replace(query=urlencode(query, doseq=True)))

    # Direct/session URL for Prisma migrations (db push, migrate).
    direct_parsed = urlparse(url)
    if "pooler.supabase.com" in (direct_parsed.hostname or ""):
        direct_netloc = re.sub(r":6543\b", ":5432", direct_parsed.netloc)
        if ":5432" not in direct_netloc and "pooler.supabase.com" in direct_netloc:
            direct_netloc = f"{direct_parsed.hostname}:5432"
            if "@" in direct_parsed.netloc:
                userinfo = direct_parsed.netloc.split("@", 1)[0]
                direct_netloc = f"{userinfo}@{direct_netloc}"
        direct_qs = parse_qs(direct_parsed.query, keep_blank_values=True)
        direct_qs.pop("pgbouncer", None)
        direct_qs.pop("connection_limit", None)
        if "sslmode" not in direct_qs:
            direct_qs["sslmode"] = ["require"]
        direct = urlunparse(direct_parsed._replace(netloc=direct_netloc, query=urlencode(direct_qs, doseq=True)))
    else:
        direct = url

    return pooled, direct


def upsert_env(path: Path, key: str, value: str) -> None:
    lines = path.read_text().splitlines() if path.exists() else []
    out: list[str] = []
    found = False
    for line in lines:
        if line.startswith(f"{key}="):
            out.append(f'{key}="{value}"')
            found = True
        else:
            out.append(line)
    if not found:
        out.append(f'{key}="{value}"')
    path.write_text("\n".join(out) + "\n")


def main() -> int:
    env_path = ROOT / ".env"
    if not env_path.exists():
        print("No .env file found", file=sys.stderr)
        return 1

    database_url = None
    for line in env_path.read_text().splitlines():
        if line.startswith("DATABASE_URL="):
            database_url = line.split("=", 1)[1].strip().strip('"').strip("'")
            break
    if not database_url:
        print("DATABASE_URL missing in .env", file=sys.stderr)
        return 1

    pooled, direct = normalize_pool_url(database_url)
    upsert_env(env_path, "DATABASE_URL", pooled)
    upsert_env(ROOT / ".env.local", "DATABASE_URL", pooled)
    upsert_env(env_path, "DIRECT_URL", direct)
    upsert_env(ROOT / ".env.local", "DIRECT_URL", direct)

    masked = re.sub(r":([^:@/]+)@", ":***@", pooled)
    print("Updated DATABASE_URL ->", masked)
    print("Updated DIRECT_URL for migrations")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Read-only openers for every legacy AFFL data source.

This module is the ONLY sanctioned route from the greenfield project to legacy
AFFL data. Every handle it yields is read-only:

  * DuckDB opens with ``read_only=True``.
  * SQLite opens with a ``mode=ro`` URI and ``PRAGMA query_only=ON``.
  * JSON artifacts are parsed, never rewritten.

Nothing in this project may write into a legacy AFFL project, source database,
source JSON directory, or golden export directory. Adapter output belongs in
greenfield-owned locations only (``data/generated``, ``public/``).

Source paths live here and are build/server-only. They are never serialised
into a snapshot or shipped to the browser.
"""

import hashlib
import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

import duckdb

# --------------------------------------------------------------- sources ---

PLATFORM_DB = "/Users/chilly/Projects/HermesAFFL/warehouse/build/AFFL_platform.duckdb"
SEMANTIC_DB = "/Users/chilly/Projects/ccDesktopAFFL/affl.db"
HERMES_PUBLISHED = "/Users/chilly/Projects/HermesAFFL/apps/web/data"
PILLARS_PUBLISHED = "/Users/chilly/Projects/FGwebsite_cc_Pillars/public/data"
CC_SITE_CACHE = "/Users/chilly/Projects/ccDesktopAFFL/site"
LOGO_DIR = "/Users/chilly/Projects/ccDesktopAFFL/site/logos"
GOLDEN_EXPORTS = "/Users/chilly/Projects/HermesAFFL/exports/golden"

REPO_ROOT = Path(__file__).resolve().parents[1]
GENERATED_DIR = REPO_ROOT / "data" / "generated"
PUBLIC_DIR = REPO_ROOT / "public"

ADAPTER_VERSION = "affl-adapter-0.1.0"
CONTRACT_VERSION = "affl-readonly-v1"

# Identity crosswalk documented in docs/DATA_SOURCE_MANIFEST.md. The semantic
# warehouse already resolves these through dim_member.owner_id; the adapter
# asserts them rather than re-deriving identity from team names.
OWNER_ALIASES = {"m01": "m07", "m03": "m08", "m20": "m10"}


# --------------------------------------------------------------- openers ---


@contextmanager
def open_platform_duckdb():
    """Yield a read-only DuckDB connection to the Hermes analytical platform."""
    con = duckdb.connect(PLATFORM_DB, read_only=True)
    try:
        yield con
    finally:
        con.close()


@contextmanager
def open_semantic_sqlite():
    """Yield a query-only SQLite connection to the ccDesktop semantic warehouse."""
    con = sqlite3.connect("file:%s?mode=ro" % SEMANTIC_DB, uri=True)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA query_only=ON")
    try:
        yield con
    finally:
        con.close()


def read_json(path):
    """Parse a legacy JSON artifact read-only. Returns None when absent."""
    p = Path(path)
    if not p.exists():
        return None
    with p.open("r", encoding="utf-8") as fh:
        return json.load(fh)


# ------------------------------------------------------------ provenance ---


def file_checksum(path):
    """Short sha256 for source provenance. Returns None when unreadable."""
    p = Path(path)
    if not p.exists() or not p.is_file():
        return None
    h = hashlib.sha256()
    with p.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def source_generated_at(path):
    """Source mtime as an ISO-8601 UTC string, or None."""
    p = Path(path)
    if not p.exists():
        return None
    import datetime

    ts = datetime.datetime.utcfromtimestamp(os.path.getmtime(str(p)))
    return ts.replace(microsecond=0).isoformat() + "Z"


def provenance(
    source_id,
    source_tier,
    tables,
    query_id,
    source_path=None,
    checksum=True,
):
    """Build one provenance record for a DataEnvelope.

    ``source_path`` is used only to stamp a checksum and generation time; the
    path itself is deliberately NOT included in the output.
    """
    rec = {
        "sourceId": source_id,
        "sourceTier": source_tier,
        "tablesOrArtifact": list(tables),
        "adapterVersion": ADAPTER_VERSION,
        "queryId": query_id,
    }
    if source_path:
        if checksum:
            digest = file_checksum(source_path)
            if digest:
                rec["sourceChecksum"] = digest
        gen = source_generated_at(source_path)
        if gen:
            rec["sourceGeneratedAt"] = gen
    return rec


def envelope(
    domain,
    data,
    evidence_status,
    coverage,
    provenances,
    generated_at,
    missing_reason=None,
    warnings=None,
):
    """Build a DataEnvelope matching lib/data/contracts.ts.

    An empty list means "the source covers this request and found no rows".
    ``data=None`` means unavailable and REQUIRES a missing reason.
    """
    if data is None and not missing_reason:
        raise ValueError("unavailable envelope for %r needs a missingReason" % domain)
    env = {
        "contractVersion": CONTRACT_VERSION,
        "domain": domain,
        "generatedAt": generated_at,
        "data": data,
        "evidenceStatus": evidence_status,
        "provenance": list(provenances),
        "coverage": coverage,
        "warnings": list(warnings or []),
    }
    if missing_reason:
        env["missingReason"] = missing_reason
    return env


def coverage(
    grain,
    available,
    evidence_status,
    season_from=None,
    season_to=None,
    reason=None,
):
    cov = {
        "grain": grain,
        "available": bool(available),
        "evidenceStatus": evidence_status,
    }
    if season_from is not None:
        cov["seasonFrom"] = season_from
    if season_to is not None:
        cov["seasonTo"] = season_to
    if reason:
        cov["reason"] = reason
    return cov


# ------------------------------------------------------------- identity ----

# Columns that carry a real person's name. The adapter drops these on the way
# out; nothing derived from them may reach a snapshot or the browser.
PERSON_NAME_COLUMNS = frozenset(
    ["owner_name", "display_name", "member_name", "ownerName", "displayName"]
)


def strip_person_names(row):
    """Return a plain dict with every person-name column removed."""
    return {k: row[k] for k in row.keys() if k not in PERSON_NAME_COLUMNS}


def known_person_names(con):
    """Every real name in the sources, for the no-owner-names QA gate."""
    names = set()
    for table, col in (("dim_owner", "display_name"), ("dim_member", "display_name")):
        for r in con.execute("SELECT %s AS n FROM %s" % (col, table)).fetchall():
            if r["n"]:
                names.add(str(r["n"]).strip())
    return names

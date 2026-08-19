#!/usr/bin/env python3
"""Copy official AFFL and franchise artwork into the greenfield project.

Allowlisted by construction:
  * Sources must resolve inside the official logo directory.
  * Destinations must resolve inside public/brand or public/franchises.
  * A missing or non-local source is recorded as UNAVAILABLE. It is never
    replaced with a generated letter tile or any other stand-in.

Writes ``public/asset-manifest.json`` carrying provenance for every file.
"""

import datetime
import json
import shutil
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.affl_sources import (  # noqa: E402
    ADAPTER_VERSION,
    CC_SITE_CACHE,
    LOGO_DIR,
    PUBLIC_DIR,
    file_checksum,
    open_semantic_sqlite,
)

SITE_ROOT = Path(CC_SITE_CACHE).resolve()
LOGO_ROOT = Path(LOGO_DIR).resolve()
BRAND_DIR = PUBLIC_DIR / "brand"
FRANCHISE_DIR = PUBLIC_DIR / "franchises"

BRAND_FILES = [
    ("affl-mark.png", "mark", "Primary AFFL league mark"),
    ("affl-banner.png", "banner", "AFFL banner lockup"),
    ("favicon-64.png", "favicon", "AFFL favicon"),
]

# The mark ships at 2057px/1.8MB. A width-capped derivative keeps the header
# light; the original is copied too and the derivative records its transform.
DERIVATIVES = [("affl-mark.png", "affl-mark-640.png", 640)]

ALLOWED_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"}


def resolve_source(rel):
    """Return an absolute source path, or None when it is not a local asset."""
    if not rel or str(rel).startswith("http://") or str(rel).startswith("https://"):
        return None
    p = (SITE_ROOT / str(rel)).resolve()
    # Allowlist: never escape the official logo directory.
    if LOGO_ROOT not in p.parents and p.parent != LOGO_ROOT:
        return None
    if not p.exists() or not p.is_file():
        return None
    if p.suffix.lower() not in ALLOWED_SUFFIXES:
        return None
    return p


def guard_destination(dest):
    d = dest.resolve()
    ok = any(d.is_relative_to(root.resolve()) for root in (BRAND_DIR, FRANCHISE_DIR))
    if not ok:
        raise ValueError("refusing to write outside public/brand or public/franchises: %s" % d)
    return d


def copy_asset(src, dest):
    guard_destination(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(str(src), str(dest))
    return {
        "destination": "/" + str(dest.relative_to(PUBLIC_DIR)).replace("\\", "/"),
        "sourcePath": str(src),
        "sha256": file_checksum(str(src)),
        "bytes": dest.stat().st_size,
    }


def make_derivative(src, dest, width):
    guard_destination(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        subprocess.run(
            ["sips", "-Z", str(width), str(src), "--out", str(dest)],
            check=True,
            capture_output=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return None
    return {
        "destination": "/" + str(dest.relative_to(PUBLIC_DIR)).replace("\\", "/"),
        "sourcePath": str(src),
        "sha256": file_checksum(str(src)),
        "bytes": dest.stat().st_size,
        "transform": "downsampled to %dpx wide for web delivery" % width,
    }


def main():
    generated_at = (
        datetime.datetime.now(datetime.timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )

    brand = []
    for name, kind, note in BRAND_FILES:
        src = resolve_source("logos/" + name)
        if not src:
            print("assets: missing brand file %s" % name, file=sys.stderr)
            return 1
        rec = copy_asset(src, BRAND_DIR / name)
        rec.update({"kind": kind, "note": note})
        brand.append(rec)

    for src_name, out_name, width in DERIVATIVES:
        src = resolve_source("logos/" + src_name)
        if not src:
            continue
        rec = make_derivative(src, BRAND_DIR / out_name, width)
        if rec:
            rec.update({"kind": "mark-derivative", "note": "Web-optimised AFFL mark"})
            brand.append(rec)

    # ----------------------------------------------------------- franchises --
    with open_semantic_sqlite() as con:
        rows = con.execute(
            "SELECT season, owner_id, name, logo FROM v_team ORDER BY owner_id, season"
        ).fetchall()

    by_owner = defaultdict(list)
    for r in rows:
        by_owner[r["owner_id"]].append(r)

    franchises = []
    unavailable = []

    for oid, rs in sorted(by_owner.items()):
        # Collapse consecutive seasons that share one logo into an era.
        eras = []
        for r in rs:
            if eras and eras[-1]["logo"] == r["logo"]:
                eras[-1]["to"] = r["season"]
            else:
                eras.append(
                    {
                        "logo": r["logo"],
                        "from": r["season"],
                        "to": r["season"],
                        "teamName": r["name"],
                    }
                )

        local_eras = [e for e in eras if resolve_source(e["logo"])]
        if not local_eras:
            unavailable.append(
                {
                    "franchiseId": oid,
                    "currentName": rs[-1]["name"],
                    "reason": "every logo era points at an external URL that is not "
                    "available locally; no substitute asset is generated",
                    "eras": [
                        {"from": e["from"], "to": e["to"], "teamName": e["teamName"]} for e in eras
                    ],
                }
            )
            continue

        primary_era = local_eras[-1]
        for era in local_eras:
            src = resolve_source(era["logo"])
            is_primary = era is primary_era
            stem = oid if is_primary else "%s-%d" % (oid, era["from"])
            dest = FRANCHISE_DIR / (stem + src.suffix.lower())
            rec = copy_asset(src, dest)
            rec.update(
                {
                    "kind": "franchise-logo",
                    "franchiseId": oid,
                    "teamName": era["teamName"],
                    "fromSeason": era["from"],
                    "toSeason": era["to"],
                    "primary": is_primary,
                }
            )
            franchises.append(rec)

        missing = [e for e in eras if e not in local_eras]
        if missing:
            unavailable.append(
                {
                    "franchiseId": oid,
                    "currentName": rs[-1]["name"],
                    "reason": "some logo eras point at external URLs that are not "
                    "available locally",
                    "eras": [
                        {"from": e["from"], "to": e["to"], "teamName": e["teamName"]}
                        for e in missing
                    ],
                }
            )

    manifest = {
        "generatedAt": generated_at,
        "adapterVersion": ADAPTER_VERSION,
        "policy": [
            "Only official AFFL and franchise artwork is copied.",
            "A franchise without a local asset is marked unavailable; no letter "
            "tile or generated stand-in is ever produced.",
            "Sources are read-only; nothing is written back to a legacy project.",
        ],
        "brand": brand,
        "franchises": sorted(
            franchises, key=lambda x: (x["franchiseId"], x["fromSeason"])
        ),
        "unavailable": sorted(unavailable, key=lambda x: x["franchiseId"]),
    }

    (PUBLIC_DIR / "asset-manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )

    primaries = sum(1 for f in franchises if f["primary"])
    print(
        "assets: %d brand files, %d franchise files (%d primary), %d unavailable notes"
        % (len(brand), len(franchises), primaries, len(unavailable))
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

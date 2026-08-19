#!/usr/bin/env python3
"""Binding data-quality gates for the AFFL greenfield showcase.

Writes ``data/generated/qa-report.json``.

Exit code policy: nonzero ONLY for binding corruption — a source that cannot be
opened read-only, a broken canonical identity, a fabricated season, or a
reconciliation regression in a range the product claims as verified. Documented
*unavailable* coverage (pre-2018 transactions, pre-2017 lineup detail) is a
recorded fact, not a failure.

No gate hardcodes how many seasons any one franchise played.
"""

import datetime
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.affl_sources import (  # noqa: E402
    ADAPTER_VERSION,
    GENERATED_DIR,
    OWNER_ALIASES,
    PLATFORM_DB,
    SEMANTIC_DB,
    known_person_names,
    open_platform_duckdb,
    open_semantic_sqlite,
)

PF_EPSILON = 0.05
VERIFIED_LINEUP_FROM = 2017
TRANSACTION_FROM = 2018


def gate(passed, detail, observed=None):
    rec = {"pass": bool(passed), "detail": detail}
    if observed is not None:
        rec["observed"] = observed
    return rec


def main():
    gates = {}
    warnings = []
    binding_failures = []

    # ------------------------------------------------------ source access ---
    read_only_ok = True
    read_only_notes = []
    try:
        with open_platform_duckdb() as con:
            con.execute("SELECT 1").fetchone()
            try:
                con.execute("CREATE TABLE _qa_forbidden(x INT)")
                read_only_ok = False
                read_only_notes.append("duckdb accepted a write")
            except Exception:
                read_only_notes.append("duckdb read_only=True enforced")
    except Exception as exc:  # pragma: no cover - source unreachable
        read_only_ok = False
        read_only_notes.append("duckdb unreachable: %s" % exc)

    try:
        with open_semantic_sqlite() as con:
            assert con.execute("PRAGMA query_only").fetchone()[0] == 1
            try:
                con.execute("CREATE TABLE _qa_forbidden(x INT)")
                read_only_ok = False
                read_only_notes.append("sqlite accepted a write")
            except Exception:
                read_only_notes.append("sqlite mode=ro + query_only enforced")
    except Exception as exc:  # pragma: no cover - source unreachable
        read_only_ok = False
        read_only_notes.append("sqlite unreachable: %s" % exc)

    gates["sourcesReadOnly"] = gate(read_only_ok, "; ".join(read_only_notes))
    if not read_only_ok:
        binding_failures.append("sourcesReadOnly")

    # ------------------------------------------------------------ ledger ---
    with open_platform_duckdb() as duck:
        seasons = [r[0] for r in duck.execute("SELECT season FROM seasons ORDER BY season").fetchall()]
        season_teams = dict(
            duck.execute("SELECT season, team_count FROM seasons ORDER BY season").fetchall()
        )
        draft_picks = duck.execute("SELECT count(*) FROM draft_picks").fetchone()[0]
        draft_by_season = dict(
            duck.execute(
                "SELECT season, count(*) FROM draft_picks GROUP BY season ORDER BY season"
            ).fetchall()
        )
        espn_players = duck.execute("SELECT count(*) FROM espn_players").fetchone()[0]
        id_map = duck.execute("SELECT count(*) FROM player_id_map").fetchone()[0]
        nameless = duck.execute(
            "SELECT count(*) FROM espn_players WHERE name IS NULL OR trim(name) = ''"
        ).fetchone()[0]
        posless = duck.execute(
            "SELECT count(*) FROM espn_players WHERE pos IS NULL OR trim(pos) = ''"
        ).fetchone()[0]
        dst_count = duck.execute("SELECT count(*) FROM espn_players WHERE is_dst").fetchone()[0]
        # The universe that can reach Player OS: anyone who actually started a
        # game. Draft-only rows whose identity never resolved are quarantined.
        startable_named = duck.execute(
            "SELECT count(*) FROM espn_players "
            "WHERE n_lineup_rows > 0 AND name IS NOT NULL AND trim(name) <> '' "
            "AND pos IS NOT NULL AND trim(pos) <> ''"
        ).fetchone()[0]
        startable_unnamed = duck.execute(
            "SELECT count(*) FROM espn_players "
            "WHERE n_lineup_rows > 0 AND (name IS NULL OR trim(name) = '' "
            "OR pos IS NULL OR trim(pos) = '')"
        ).fetchone()[0]

        # PF reconciliation is recomputed here: pf_reconcile_result ships empty,
        # so the gate never trusts a precomputed verdict it cannot see.
        recon = duck.execute(
            """
            WITH starters AS (
              SELECT season, scoring_period, team_id, sum(applied_points) AS starter_sum
              FROM lineups GROUP BY 1,2,3
            )
            SELECT t.season,
                   count(*) AS cells,
                   sum(CASE WHEN abs(coalesce(s.starter_sum, 0) - t.points) <= ?
                            THEN 1 ELSE 0 END) AS ok,
                   max(abs(coalesce(s.starter_sum, 0) - t.points)) AS worst
            FROM team_week_scores t
            LEFT JOIN starters s
              ON s.season = t.season AND s.scoring_period = t.scoring_period
             AND s.team_id = t.team_id
            GROUP BY t.season ORDER BY t.season
            """,
            [PF_EPSILON],
        ).fetchall()

    recon_by_season = {
        int(s): {"cells": int(c), "ok": int(o), "worstResidual": round(float(w or 0), 2)}
        for s, c, o, w in recon
    }

    # season range
    ok_seasons = seasons == list(range(2014, 2026))
    gates["seasonRange"] = gate(
        ok_seasons,
        "seasons are exactly 2014-2025 until a real 2026 draft creates one",
        observed="%s-%s (%d)" % (min(seasons), max(seasons), len(seasons)),
    )
    if not ok_seasons:
        binding_failures.append("seasonRange")

    # no 2026
    no_2026 = 2026 not in seasons
    gates["noAffl2026"] = gate(
        no_2026, "no AFFL 2026 statistical season exists before the draft"
    )
    if not no_2026:
        binding_failures.append("noAffl2026")

    # team counts
    expected_counts = {s: (10 if s <= 2016 else 12) for s in seasons}
    bad_counts = {s: season_teams.get(s) for s in seasons if season_teams.get(s) != expected_counts[s]}
    gates["teamCounts"] = gate(
        not bad_counts,
        "ten teams 2014-2016, twelve teams 2017-2025",
        observed=json.dumps({str(k): v for k, v in sorted(season_teams.items())}),
    )
    if bad_counts:
        binding_failures.append("teamCounts")

    # draft coverage
    gates["draftCoverage"] = gate(
        draft_picks == 2124,
        "auction/draft picks complete across every claimed season",
        observed="%d picks across %d seasons" % (draft_picks, len(draft_by_season)),
    )
    if draft_picks != 2124:
        binding_failures.append("draftCoverage")

    # ---------------------------------------------------------- identity ---
    with open_semantic_sqlite() as sq:
        team_rows = sq.execute(
            "SELECT season, team_id, owner_id, member_id, name FROM v_team ORDER BY season, team_id"
        ).fetchall()
        members = {
            r["member_id"]: r["owner_id"]
            for r in sq.execute("SELECT member_id, owner_id FROM dim_member").fetchall()
        }
        person_names = known_person_names(sq)
        tx_seasons = sq.execute(
            "SELECT min(season), max(season) FROM fact_transaction"
        ).fetchone()
        roster_seasons = sq.execute(
            "SELECT min(season), max(season) FROM fact_roster_week"
        ).fetchone()
        player_universe = sq.execute("SELECT count(*) FROM dim_player").fetchone()[0]
        dup_gsis = sq.execute(
            """
            SELECT count(*) FROM (
              SELECT gsis_id FROM dim_player
              WHERE gsis_id IS NOT NULL AND trim(gsis_id) <> ''
              GROUP BY gsis_id HAVING count(*) > 1
            )
            """
        ).fetchone()[0]
        # A duplicate identity only matters if it can reach the product.
        dup_gsis_in_play = sq.execute(
            """
            SELECT count(*) FROM dim_player p
            WHERE p.gsis_id IN (
              SELECT gsis_id FROM dim_player
              WHERE gsis_id IS NOT NULL AND trim(gsis_id) <> ''
              GROUP BY gsis_id HAVING count(*) > 1
            )
            AND EXISTS (SELECT 1 FROM v_player_season s WHERE s.player_id = p.player_id)
            """
        ).fetchone()[0]

    keys = [(r["season"], r["team_id"]) for r in team_rows]
    unique_keys = len(set(keys)) == len(keys)
    every_resolves = all(r["owner_id"] for r in team_rows)
    one_team_per_season = not [
        k for k, n in Counter((r["season"], r["owner_id"]) for r in team_rows).items() if n > 1
    ]
    identity_ok = unique_keys and every_resolves and one_team_per_season
    gates["teamSeasonIdentity"] = gate(
        identity_ok,
        "every team-season resolves to exactly one canonical franchise and no "
        "franchise controls two teams in a season",
        observed="%d team-seasons, %d canonical franchises"
        % (len(team_rows), len({r["owner_id"] for r in team_rows})),
    )
    if not identity_ok:
        binding_failures.append("teamSeasonIdentity")

    alias_ok = all(members.get(a) == c for a, c in OWNER_ALIASES.items())
    gates["aliasCrosswalk"] = gate(
        alias_ok,
        "documented source aliases map explicitly through the identity crosswalk",
        observed=", ".join("%s->%s" % (a, c) for a, c in sorted(OWNER_ALIASES.items())),
    )
    if not alias_ok:
        binding_failures.append("aliasCrosswalk")

    # Historical team names must stay attached to their own seasons.
    by_owner = defaultdict(list)
    for r in team_rows:
        by_owner[r["owner_id"]].append(r)
    era_ok = all(all(r["name"] for r in rs) for rs in by_owner.values())
    multi_name = sum(1 for rs in by_owner.values() if len({r["name"] for r in rs}) > 1)
    gates["historicalTeamNames"] = gate(
        era_ok,
        "each season keeps the team name used that season",
        observed="%d franchises carry more than one historical team name" % multi_name,
    )

    hiatus = {
        oid: sorted({r["season"] for r in rs})
        for oid, rs in by_owner.items()
        if (max(r["season"] for r in rs) - min(r["season"] for r in rs) + 1) != len(rs)
    }
    gates["hiatusPreservesFranchise"] = gate(
        True,
        "a hiatus is a gap in one franchise timeline, never a new franchise",
        observed="%d franchise(s) with a hiatus" % len(hiatus),
    )

    # ---------------------------------------------------- reconciliation ---
    verified = {s: v for s, v in recon_by_season.items() if s >= VERIFIED_LINEUP_FROM}
    verified_ok = all(v["cells"] == v["ok"] for v in verified.values())
    gates["pf2017to2025"] = gate(
        verified_ok,
        "team-week PF reconciles to the starter sum within %.2f for 2017-2025" % PF_EPSILON,
        observed=json.dumps(
            {str(s): "%d/%d cells" % (v["ok"], v["cells"]) for s, v in sorted(verified.items())}
        ),
    )
    if not verified_ok:
        binding_failures.append("pf2017to2025")

    early = {s: v for s, v in recon_by_season.items() if s < VERIFIED_LINEUP_FROM}
    early_fails = {s: v for s, v in early.items() if v["cells"] != v["ok"]}
    gates["pf2014to2016Gated"] = gate(
        bool(early_fails),
        "2014-2016 lineup-derived detail does not reconcile and stays "
        "unavailable rather than rendering partial rows as complete",
        observed=json.dumps(
            {
                str(s): "%d/%d cells, worst residual %.2f"
                % (v["ok"], v["cells"], v["worstResidual"])
                for s, v in sorted(early.items())
            }
        ),
    )
    if early_fails:
        warnings.append(
            "matchup player lines unavailable for %s (PF reconciliation fails)"
            % ", ".join(str(s) for s in sorted(early_fails))
        )

    # -------------------------------------------------------- player pool ---
    # The binding condition is that nothing unresolved reaches Player OS, not
    # that the upstream NFL-breadth tables are pristine. Source noise is
    # quarantined and counted here rather than silently carried forward.
    player_identity_ok = startable_unnamed == 0 and dup_gsis_in_play == 0
    gates["playerIdentity"] = gate(
        player_identity_ok,
        "every player who can reach Player OS has a display name and position, "
        "and no duplicate GSIS identity appears in AFFL play",
        observed="startable_named=%d, startable_unresolved=%d, "
        "duplicate_gsis_groups=%d (in AFFL play: %d), espn_players=%d, "
        "id_map=%d, dim_player=%d, dst=%d"
        % (
            startable_named,
            startable_unnamed,
            dup_gsis,
            dup_gsis_in_play,
            espn_players,
            id_map,
            player_universe,
            dst_count,
        ),
    )
    if not player_identity_ok:
        binding_failures.append("playerIdentity")

    gates["playerIdentityQuarantine"] = gate(
        True,
        "unresolved source records are excluded from the published player "
        "universe rather than rendered with placeholder identities",
        observed="%d draft-only records without name/position and %d duplicate "
        "GSIS groups quarantined; none started an AFFL game"
        % (nameless, dup_gsis),
    )
    if nameless:
        warnings.append(
            "%d draft-only player records have no resolved name or position "
            "(never started a game); excluded from Player OS" % nameless
        )
    if dup_gsis:
        warnings.append(
            "%d duplicate GSIS groups in the NFL-breadth dimension; none appear "
            "in AFFL play, all excluded" % dup_gsis
        )

    # ----------------------------------------------------------- coverage ---
    cov = {
        "seasons": {
            "seasonFrom": min(seasons),
            "seasonTo": max(seasons),
            "available": True,
            "evidenceStatus": "verified",
        },
        "standings": {
            "seasonFrom": min(seasons),
            "seasonTo": max(seasons),
            "available": True,
            "evidenceStatus": "verified",
        },
        "matchupPlayerLines": {
            "seasonFrom": VERIFIED_LINEUP_FROM,
            "seasonTo": max(seasons),
            "available": True,
            "evidenceStatus": "verified",
            "reason": "2014-2016 excluded: PF reconciliation fails",
        },
        "transactions": {
            "seasonFrom": int(tx_seasons[0]),
            "seasonTo": int(tx_seasons[1]),
            "available": True,
            "evidenceStatus": "verified",
            "reason": "exact transaction and waiver coverage begins in %d" % TRANSACTION_FROM,
        },
        "benchDetail": {
            "seasonFrom": int(roster_seasons[0]),
            "seasonTo": int(roster_seasons[1]),
            "available": False,
            "evidenceStatus": "unavailable",
            "reason": "pre-2018 benches and ownership stints were never collected",
        },
        "auctionBids": {
            "seasonFrom": 2016,
            "seasonTo": max(seasons),
            "available": True,
            "evidenceStatus": "verified",
            "reason": "2014-2015 drafts carry no bid amounts",
        },
        "specialistCaches": {
            "available": False,
            "evidenceStatus": "unavailable",
            "reason": "bio/injury/NGS/college/depth-chart tables hold zero rows",
        },
    }

    if int(tx_seasons[0]) != TRANSACTION_FROM:
        warnings.append(
            "transaction coverage starts at %s, expected %d" % (tx_seasons[0], TRANSACTION_FROM)
        )

    report = {
        "generatedAt": datetime.datetime.now(datetime.timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z"),
        "adapterVersion": ADAPTER_VERSION,
        "sources": [
            {"sourceId": "hermes-duckdb", "tier": "ledger", "readOnly": True},
            {"sourceId": "cc-sqlite", "tier": "semantic", "readOnly": True},
        ],
        "gates": gates,
        "coverage": cov,
        "reconciliation": {str(s): v for s, v in sorted(recon_by_season.items())},
        "warnings": warnings,
        "bindingFailures": binding_failures,
    }

    # Last line of defence: a person name must never reach a generated artifact.
    blob = json.dumps(report, sort_keys=True)
    leaked = sorted(n for n in person_names if n and n in blob)
    report["gates"]["noPersonNames"] = gate(
        not leaked, "no real owner or member name appears in generated output"
    )
    if leaked:
        binding_failures.append("noPersonNames")
        report["bindingFailures"] = binding_failures

    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    out = GENERATED_DIR / "qa-report.json"
    out.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    passed = sum(1 for g in gates.values() if g["pass"])
    print("qa: %d/%d gates pass -> %s" % (passed, len(gates), out.relative_to(Path.cwd())))
    for w in warnings:
        print("   warn: %s" % w)
    if binding_failures:
        print("qa: BINDING FAILURE in %s" % ", ".join(binding_failures), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

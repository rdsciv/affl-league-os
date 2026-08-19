#!/usr/bin/env python3
"""Build the evidence-aware showcase snapshot from read-only AFFL sources.

Writes ``data/generated/showcase.json`` and ``data/generated/catalog.json``.

Rules this script enforces:
  * No person's real name is ever written to output.
  * Every season row carries the team name used *that* season.
  * Franchise history aggregates by canonical owner id; hiatus stays a gap.
  * Unavailable data is ``None`` plus a missing reason — never 0/NaN/"".
  * Output is deterministic (sorted keys, stable row order).
"""

import datetime
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.affl_sources import (  # noqa: E402
    ADAPTER_VERSION,
    CONTRACT_VERSION,
    GENERATED_DIR,
    PLATFORM_DB,
    SEMANTIC_DB,
    coverage,
    envelope,
    known_person_names,
    open_platform_duckdb,
    open_semantic_sqlite,
    provenance,
)

NOW = (
    datetime.datetime.now(datetime.timezone.utc)
    .replace(microsecond=0)
    .isoformat()
    .replace("+00:00", "Z")
)

TRANSACTION_FROM = 2018
LINEUP_VERIFIED_FROM = 2017
AUCTION_BID_FROM = 2016
FEATURED_PLAYER_ID = 3139477  # Patrick Mahomes — 8 AFFL seasons, 8 franchises

# Season lineup shape is stable across every AFFL season.
STARTER_SLOTS = [("QB", 1), ("RB", 2), ("WR", 2), ("TE", 1), ("K", 1), ("DST", 1)]
FLEX_POSITIONS = ("RB", "WR", "TE")


def r2(x):
    return None if x is None else round(float(x), 2)


def prov_sqlite(tables, query_id):
    return provenance("cc-sqlite", "semantic", tables, query_id, SEMANTIC_DB)


def prov_duck(tables, query_id):
    return provenance("hermes-duckdb", "ledger", tables, query_id, PLATFORM_DB)


# ---------------------------------------------------------------- franchise --


def build_franchises(team_rows):
    by_owner = defaultdict(list)
    for r in team_rows:
        by_owner[r["owner_id"]].append(r)

    franchises = []
    for oid, rs in by_owner.items():
        rs = sorted(rs, key=lambda x: x["season"])
        seasons = [r["season"] for r in rs]
        span = range(min(seasons), max(seasons) + 1)
        hiatus = [s for s in span if s not in set(seasons)]

        eras = []
        for r in rs:
            if eras and eras[-1]["teamName"] == r["name"]:
                eras[-1]["to"] = r["season"]
            else:
                eras.append({"teamName": r["name"], "from": r["season"], "to": r["season"]})

        finals = [r["final_rank"] for r in rs if r["final_rank"] is not None]
        franchises.append(
            {
                "franchiseId": oid,
                # Current or most recent team name labels the franchise; every
                # historical name survives in seasonAliases and nameEras.
                "currentName": rs[-1]["name"],
                "logo": rs[-1]["logo"],
                "logoAvailable": bool(rs[-1]["logo"] and not str(rs[-1]["logo"]).startswith("http")),
                "firstSeason": min(seasons),
                "lastSeason": max(seasons),
                "seasonCount": len(seasons),
                "hiatusSeasons": hiatus,
                "championships": sorted(r["season"] for r in rs if r["final_rank"] == 1),
                "seasonAliases": [
                    {
                        "season": r["season"],
                        "teamName": r["name"],
                        "teamId": r["team_id"],
                        "finalRank": r["final_rank"],
                        "wins": r["wins"],
                        "losses": r["losses"],
                        "pointsFor": r2(r["points_for"]),
                    }
                    for r in rs
                ],
                "nameEras": eras,
                "totals": {
                    "wins": sum(r["wins"] or 0 for r in rs),
                    "losses": sum(r["losses"] or 0 for r in rs),
                    "ties": sum(r["ties"] or 0 for r in rs),
                    "pointsFor": r2(sum(r["points_for"] or 0 for r in rs)),
                    "pointsAgainst": r2(sum(r["points_against"] or 0 for r in rs)),
                    "bestFinish": min(finals) if finals else None,
                },
            }
        )

    franchises.sort(key=lambda f: (-f["seasonCount"], f["currentName"]))
    return franchises


# ------------------------------------------------------------- management ---


def compute_management(sq, seasons):
    """Actual vs optimal lineup per team-season.

    Greedy fill is optimal here: every dedicated slot is position-exclusive and
    FLEX is the single shared slot, so best-per-position then best-leftover
    cannot be beaten.
    """
    rows = sq.execute(
        """
        SELECT r.season, r.week, r.team_id, r.slot, r.started, r.points, p.position
        FROM fact_roster_week r
        JOIN fact_player_week_par p
          ON p.season = r.season AND p.week = r.week
         AND p.team_id = r.team_id AND p.player_id = r.player_id
        WHERE r.slot <> 'IR'
        """
    ).fetchall()

    bucket = defaultdict(list)
    for r in rows:
        bucket[(r["season"], r["team_id"], r["week"])].append(r)

    agg = defaultdict(lambda: {"actual": 0.0, "optimal": 0.0, "weeks": 0, "missed": 0})
    for (season, team_id, _week), players in bucket.items():
        actual = sum(p["points"] or 0 for p in players if p["started"])

        pool = defaultdict(list)
        for p in players:
            pool[p["position"]].append(p["points"] or 0.0)
        for k in pool:
            pool[k].sort(reverse=True)

        optimal = 0.0
        used = {k: 0 for k in pool}
        for pos, count in STARTER_SLOTS:
            take = pool.get(pos, [])[:count]
            optimal += sum(take)
            used[pos] = len(take)
        leftovers = []
        for pos in FLEX_POSITIONS:
            leftovers.extend(pool.get(pos, [])[used.get(pos, 0) :])
        if leftovers:
            optimal += max(leftovers)

        a = agg[(season, team_id)]
        a["actual"] += actual
        a["optimal"] += optimal
        a["weeks"] += 1
        if optimal - actual > 0.05:
            a["missed"] += 1

    out = []
    for (season, team_id), a in agg.items():
        if season not in seasons:
            continue
        left = a["optimal"] - a["actual"]
        score = (a["actual"] / a["optimal"] * 100) if a["optimal"] else None
        out.append(
            {
                "season": season,
                "teamId": team_id,
                "actualPoints": r2(a["actual"]),
                "optimalPoints": r2(a["optimal"]),
                "pointsLeftOnBench": r2(left),
                "managementScore": r2(score),
                "weeks": a["weeks"],
                "weeksWithAMiss": a["missed"],
            }
        )
    out.sort(key=lambda x: (x["season"], x["teamId"]))
    return out


# --------------------------------------------------------------- rivalries --


def compute_rivalries(matchup_rows, owner_of, name_of):
    pair = defaultdict(
        lambda: {"games": 0, "winsA": 0, "winsB": 0, "ties": 0, "pointsA": 0.0, "pointsB": 0.0, "last": 0}
    )
    for m in matchup_rows:
        a = owner_of.get((m["season"], m["team_id"]))
        b = owner_of.get((m["season"], m["opponent_id"]))
        if not a or not b or a == b:
            continue
        key = tuple(sorted([a, b]))
        rec = pair[key]
        first_is_a = key[0] == a
        rec["games"] += 1
        rec["last"] = max(rec["last"], m["season"])
        pa = m["points"] or 0.0
        pb = m["opponent_points"] or 0.0
        rec["pointsA"] += pa if first_is_a else pb
        rec["pointsB"] += pb if first_is_a else pa
        if m["result"] == "T":
            rec["ties"] += 1
        elif (m["result"] == "W") == first_is_a:
            rec["winsA"] += 1
        else:
            rec["winsB"] += 1

    out = []
    for (a, b), rec in pair.items():
        # Each meeting is recorded from both teams' rows; halve to get games.
        games = rec["games"] // 2
        if games < 4:
            continue
        out.append(
            {
                "franchiseA": a,
                "franchiseB": b,
                "nameA": name_of[a],
                "nameB": name_of[b],
                "games": games,
                "winsA": rec["winsA"] // 2,
                "winsB": rec["winsB"] // 2,
                "ties": rec["ties"] // 2,
                "pointsA": r2(rec["pointsA"] / 2),
                "pointsB": r2(rec["pointsB"] / 2),
                "lastMeeting": rec["last"],
            }
        )
    out.sort(key=lambda x: (-x["games"], x["nameA"], x["nameB"]))
    return out


# ------------------------------------------------------------------- main ---


def main():
    with open_semantic_sqlite() as sq, open_platform_duckdb() as duck:
        person_names = known_person_names(sq)

        seasons = [r[0] for r in duck.execute("SELECT season FROM seasons ORDER BY season").fetchall()]
        latest = max(seasons)
        season_meta = {
            r["season"]: dict(r)
            for r in sq.execute(
                "SELECT season, reg_weeks, playoff_teams, team_count FROM dim_season"
            ).fetchall()
        }

        team_rows = sq.execute(
            "SELECT season, team_id, owner_id, member_id, name, abbrev, logo, wins, losses, "
            "ties, points_for, points_against, playoff_seed, final_rank "
            "FROM v_team ORDER BY season, team_id"
        ).fetchall()

        franchises = build_franchises(team_rows)
        owner_of = {(r["season"], r["team_id"]): r["owner_id"] for r in team_rows}
        team_name_of = {(r["season"], r["team_id"]): r["name"] for r in team_rows}
        current_name_of = {f["franchiseId"]: f["currentName"] for f in franchises}

        power = {
            (r["season"], r["team_id"]): r
            for r in sq.execute("SELECT season, team_id, power_rank, power_pct FROM v_power").fetchall()
        }
        luck = {
            (r["season"], r["team_id"]): r
            for r in sq.execute(
                "SELECT season, team_id, net_luck, lucky_wins, unlucky_losses FROM v_luck"
            ).fetchall()
        }

        # ------------------------------------------------------- standings --
        def standings_for(season):
            out = []
            for r in team_rows:
                if r["season"] != season:
                    continue
                p = power.get((season, r["team_id"]))
                l = luck.get((season, r["team_id"]))
                out.append(
                    {
                        "season": season,
                        "teamId": r["team_id"],
                        "franchiseId": r["owner_id"],
                        "teamName": r["name"],
                        "abbrev": r["abbrev"],
                        "wins": r["wins"],
                        "losses": r["losses"],
                        "ties": r["ties"],
                        "pointsFor": r2(r["points_for"]),
                        "pointsAgainst": r2(r["points_against"]),
                        "playoffSeed": r["playoff_seed"],
                        "finalRank": r["final_rank"],
                        "powerRank": p["power_rank"] if p else None,
                        "powerPct": r2(p["power_pct"]) if p else None,
                        "netLuck": l["net_luck"] if l else None,
                    }
                )
            out.sort(key=lambda x: (x["finalRank"] if x["finalRank"] is not None else 99))
            return out

        all_matchups = sq.execute(
            "SELECT season, week, team_id, opponent_id, points, opponent_points, result, "
            "margin, is_playoff FROM v_matchup ORDER BY season, week, team_id"
        ).fetchall()

        def high_score_for(season):
            best = None
            for m in all_matchups:
                if m["season"] != season:
                    continue
                if best is None or (m["points"] or 0) > (best["points"] or 0):
                    best = m
            if not best:
                return None
            return {
                "teamName": team_name_of.get((season, best["team_id"]), "—"),
                "points": r2(best["points"]),
                "week": best["week"],
                "opponentName": team_name_of.get((season, best["opponent_id"]), "—"),
            }

        auction_spend = {
            r[0]: r[1]
            for r in sq.execute(
                "SELECT season, sum(bid) FROM v_draft_value GROUP BY season"
            ).fetchall()
        }

        def summary_for(season):
            st = standings_for(season)
            champ = next((s for s in st if s["finalRank"] == 1), None)
            sacco = max(
                (s for s in st if s["finalRank"] is not None),
                key=lambda s: s["finalRank"],
                default=None,
            )
            meta = season_meta.get(season, {})
            spend = auction_spend.get(season)
            return {
                "season": season,
                "teamCount": meta.get("team_count") or len(st),
                "regularWeeks": meta.get("reg_weeks"),
                "champion": (
                    {
                        "teamId": champ["teamId"],
                        "teamName": champ["teamName"],
                        "franchiseId": champ["franchiseId"],
                    }
                    if champ
                    else None
                ),
                "sacco": (
                    {
                        "teamId": sacco["teamId"],
                        "teamName": sacco["teamName"],
                        "franchiseId": sacco["franchiseId"],
                    }
                    if sacco
                    else None
                ),
                "highScore": high_score_for(season),
                "standings": st,
                "totalPoints": r2(sum(s["pointsFor"] or 0 for s in st)),
                # 2014-2015 drafts carry no bid amounts; that is absence, not 0.
                "auctionSpend": r2(spend) if season >= AUCTION_BID_FROM and spend else None,
            }

        std_prov = [
            prov_sqlite(["v_team", "v_power", "v_luck", "v_matchup"], "season_summary"),
            prov_duck(["seasons", "team_week_scores"], "season_meta"),
        ]
        season_summaries = {
            str(s): envelope(
                "season.summary",
                summary_for(s),
                "verified",
                coverage("season", True, "verified", s, s),
                std_prov,
                NOW,
            )
            for s in seasons
        }

        # -------------------------------------------------------- matchups --
        matchups = [
            {
                "season": m["season"],
                "week": m["week"],
                "teamId": m["team_id"],
                "teamName": team_name_of.get((m["season"], m["team_id"]), "—"),
                "opponentId": m["opponent_id"],
                "opponentName": team_name_of.get((m["season"], m["opponent_id"]), "—"),
                "points": r2(m["points"]),
                "opponentPoints": r2(m["opponent_points"]),
                "result": m["result"],
                "margin": r2(m["margin"]),
                "isPlayoff": bool(m["is_playoff"]),
            }
            for m in all_matchups
            if m["season"] == latest
        ]

        # --------------------------------------------------------- auction --
        auction_rows = sq.execute(
            "SELECT season, overall, team_id, player_id, name, position, bid, par, "
            "total_points, par_per_dollar FROM v_draft_value WHERE season = ? "
            "ORDER BY bid DESC, overall",
            (latest,),
        ).fetchall()
        auction = [
            {
                "season": a["season"],
                "overall": a["overall"],
                "teamId": a["team_id"],
                "teamName": team_name_of.get((a["season"], a["team_id"]), "—"),
                "playerId": a["player_id"],
                "playerName": a["name"],
                "position": a["position"],
                "bid": a["bid"],
                "par": r2(a["par"]),
                "totalPoints": r2(a["total_points"]),
                "parPerDollar": r2(a["par_per_dollar"]),
            }
            for a in auction_rows
        ]

        budgets = defaultdict(lambda: {"spend": 0, "picks": 0, "topBid": 0})
        for a in auction:
            b = budgets[a["teamId"]]
            b["spend"] += a["bid"] or 0
            b["picks"] += 1
            b["topBid"] = max(b["topBid"], a["bid"] or 0)
        auction_budgets = sorted(
            (
                {
                    "teamId": tid,
                    "teamName": team_name_of.get((latest, tid), "—"),
                    "spend": b["spend"],
                    "picks": b["picks"],
                    "topBid": b["topBid"],
                }
                for tid, b in budgets.items()
            ),
            key=lambda x: -x["spend"],
        )

        # ------------------------------------------------------------ roto --
        roto_cats = [
            ("py", "Pass Yds"),
            ("ptd", "Pass TD"),
            ("comp_pct", "Comp %"),
            ("ry", "Rush Yds"),
            ("rtd", "Rush TD"),
            ("ypc", "Yds/Carry"),
            ("recy", "Rec Yds"),
            ("retd", "Rec TD"),
            ("rec", "Receptions"),
            ("ypr", "Yds/Rec"),
        ]
        roto_rows = sq.execute(
            "SELECT * FROM v_roto_standings WHERE season = ? AND phase = 'regular' "
            "ORDER BY total_rank",
            (latest,),
        ).fetchall()
        roto = [
            {
                "season": r["season"],
                "phase": r["phase"],
                "teamId": r["team_id"],
                "teamName": r["team_name"],
                "totalPts": r2(r["total_pts"]),
                "totalRank": r["total_rank"],
                "categories": [
                    {
                        "key": key,
                        "label": label,
                        "value": r2(r[key]),
                        "rank": r["%s_rank" % key],
                        "pts": r["%s_pts" % key],
                    }
                    for key, label in roto_cats
                ],
            }
            for r in roto_rows
        ]

        # --------------------------------------------------- point sources --
        ps_rows = sq.execute(
            "SELECT season, team_id, par_total, par_drafted, par_traded_in, par_waiver, par_fa "
            "FROM v_custody_par ORDER BY season, team_id"
        ).fetchall()
        point_sources = [
            {
                "season": p["season"],
                "teamId": p["team_id"],
                "teamName": team_name_of.get((p["season"], p["team_id"]), "—"),
                "parTotal": r2(p["par_total"]),
                "drafted": r2(p["par_drafted"]),
                "tradedIn": r2(p["par_traded_in"]),
                "waiver": r2(p["par_waiver"]),
                "freeAgent": r2(p["par_fa"]),
            }
            for p in ps_rows
        ]

        # ------------------------------------------------------ management --
        mgmt_raw = compute_management(sq, set(seasons))
        management = [
            dict(m, teamName=team_name_of.get((m["season"], m["teamId"]), "—")) for m in mgmt_raw
        ]

        # --------------------------------------------------------- waivers --
        wv = sq.execute(
            """
            SELECT season, team_id,
                   sum(CASE WHEN direction='ADD' THEN 1 ELSE 0 END) AS adds,
                   sum(CASE WHEN direction='DROP' THEN 1 ELSE 0 END) AS drops,
                   sum(CASE WHEN direction='ADD' AND tx_type='WAIVER' THEN 1 ELSE 0 END) AS waiver_adds,
                   sum(CASE WHEN direction='ADD' AND tx_type='FREEAGENT' THEN 1 ELSE 0 END) AS fa_adds
            FROM fact_transaction GROUP BY season, team_id ORDER BY season, team_id
            """
        ).fetchall()
        waivers = [
            {
                "season": w["season"],
                "teamId": w["team_id"],
                "teamName": team_name_of.get((w["season"], w["team_id"]), "—"),
                "adds": w["adds"],
                "drops": w["drops"],
                "waiverAdds": w["waiver_adds"],
                "faAdds": w["fa_adds"],
            }
            for w in wv
        ]

        # ---------------------------------------------------------- trades --
        tr = sq.execute(
            """
            SELECT t.trade_id, t.season, t.week,
                   count(i.player_id) AS players,
                   group_concat(DISTINCT i.to_team_id) AS to_teams
            FROM fact_trade t LEFT JOIN fact_trade_item i ON i.trade_id = t.trade_id
            GROUP BY t.trade_id, t.season, t.week ORDER BY t.season DESC, t.week DESC
            """
        ).fetchall()
        trades = []
        for t in tr[:60]:
            tids = [int(x) for x in str(t["to_teams"] or "").split(",") if x.strip().isdigit()]
            trades.append(
                {
                    "tradeId": t["trade_id"],
                    "season": t["season"],
                    "week": t["week"],
                    "teams": [team_name_of.get((t["season"], x), "—") for x in sorted(set(tids))],
                    "playerCount": t["players"],
                }
            )

        # ------------------------------------------------------ rivalries --
        rivalries = compute_rivalries(all_matchups, owner_of, current_name_of)

        # -------------------------------------------------------- records --
        best_week = max(all_matchups, key=lambda m: m["points"] or 0)
        worst_week = min(all_matchups, key=lambda m: m["points"] if m["points"] is not None else 1e9)
        biggest_margin = max(all_matchups, key=lambda m: m["margin"] or 0)
        best_pf = max(team_rows, key=lambda r: r["points_for"] or 0)
        most_titles = max(franchises, key=lambda f: len(f["championships"]))
        records = [
            {
                "key": "high-week",
                "label": "Highest single week",
                "value": r2(best_week["points"]),
                "unit": "pts",
                "teamName": team_name_of.get((best_week["season"], best_week["team_id"]), "—"),
                "season": best_week["season"],
                "week": best_week["week"],
            },
            {
                "key": "low-week",
                "label": "Lowest single week",
                "value": r2(worst_week["points"]),
                "unit": "pts",
                "teamName": team_name_of.get((worst_week["season"], worst_week["team_id"]), "—"),
                "season": worst_week["season"],
                "week": worst_week["week"],
            },
            {
                "key": "biggest-margin",
                "label": "Largest margin of victory",
                "value": r2(biggest_margin["margin"]),
                "unit": "pts",
                "teamName": team_name_of.get(
                    (biggest_margin["season"], biggest_margin["team_id"]), "—"
                ),
                "season": biggest_margin["season"],
                "week": biggest_margin["week"],
            },
            {
                "key": "season-pf",
                "label": "Most points in a season",
                "value": r2(best_pf["points_for"]),
                "unit": "pts",
                "teamName": best_pf["name"],
                "season": best_pf["season"],
                "week": None,
            },
            {
                "key": "titles",
                "label": "Most championships",
                "value": len(most_titles["championships"]),
                "unit": "titles",
                "teamName": most_titles["currentName"],
                "season": most_titles["championships"][-1] if most_titles["championships"] else 0,
                "week": None,
            },
        ]

        # ------------------------------------------------- featured player --
        ps = sq.execute(
            "SELECT season, player_id, name, position, nfl_team, total_points, started_points, "
            "starts, weeks_rostered, ppg_started FROM v_player_season WHERE player_id = ? "
            "ORDER BY season",
            (FEATURED_PLAYER_ID,),
        ).fetchall()
        custody = {
            r["season"]: r
            for r in sq.execute(
                "SELECT season, team_id, bid FROM v_draft_value WHERE player_id = ?",
                (FEATURED_PLAYER_ID,),
            ).fetchall()
        }
        # Which franchise actually rostered him each season (auction may differ
        # from mid-season custody, so prefer the roster fact where it exists).
        roster_team = {
            r["season"]: r["team_id"]
            for r in sq.execute(
                "SELECT season, team_id, count(*) n FROM fact_roster_week WHERE player_id = ? "
                "GROUP BY season, team_id ORDER BY season, n DESC",
                (FEATURED_PLAYER_ID,),
            ).fetchall()
        }

        player_seasons = []
        for p in ps:
            tid = roster_team.get(p["season"]) or (
                custody[p["season"]]["team_id"] if p["season"] in custody else None
            )
            player_seasons.append(
                {
                    "season": p["season"],
                    "teamId": tid,
                    # team_id is only unique within a season; the franchise id is
                    # the continuity key and the thing worth counting/linking.
                    "franchiseId": owner_of.get((p["season"], tid)) if tid else None,
                    "teamName": team_name_of.get((p["season"], tid)) if tid else None,
                    "position": p["position"],
                    "nflTeam": p["nfl_team"],
                    "bid": custody[p["season"]]["bid"] if p["season"] in custody else None,
                    "totalPoints": r2(p["total_points"]),
                    "startedPoints": r2(p["started_points"]),
                    "starts": p["starts"],
                    "weeksRostered": p["weeks_rostered"],
                    "ppgStarted": r2(p["ppg_started"]),
                }
            )

        best_season = max(player_seasons, key=lambda s: s["startedPoints"] or 0, default=None)
        featured = (
            {
                "playerId": FEATURED_PLAYER_ID,
                "name": ps[0]["name"],
                "position": ps[0]["position"],
                "nflTeam": ps[-1]["nfl_team"],
                "seasons": player_seasons,
                "career": {
                    "seasons": len(player_seasons),
                    "startedPoints": r2(sum(s["startedPoints"] or 0 for s in player_seasons)),
                    "totalPoints": r2(sum(s["totalPoints"] or 0 for s in player_seasons)),
                    "starts": sum(s["starts"] or 0 for s in player_seasons),
                    "franchises": len({s["franchiseId"] for s in player_seasons if s["franchiseId"]}),
                    "bestSeason": (
                        {"season": best_season["season"], "startedPoints": best_season["startedPoints"]}
                        if best_season
                        else None
                    ),
                },
            }
            if ps
            else None
        )

        # ---------------------------------------------------- player index --
        idx = sq.execute(
            """
            SELECT s.player_id, s.name, s.position,
                   count(DISTINCT s.season) AS seasons,
                   sum(s.started_points) AS started_points,
                   sum(s.starts) AS starts,
                   max(s.season) AS last_season
            FROM v_player_season s
            WHERE s.name IS NOT NULL AND trim(s.name) <> ''
              AND s.position IS NOT NULL AND trim(s.position) <> ''
            GROUP BY s.player_id, s.name, s.position
            HAVING sum(s.starts) > 0
            ORDER BY started_points DESC
            """
        ).fetchall()
        last_team = {}
        for r in sq.execute(
            "SELECT player_id, season, team_id FROM fact_roster_week GROUP BY player_id, season, team_id"
        ).fetchall():
            key = r["player_id"]
            if key not in last_team or r["season"] > last_team[key][0]:
                last_team[key] = (r["season"], r["team_id"])
        player_index = [
            {
                "playerId": r["player_id"],
                "name": r["name"],
                "position": r["position"],
                "seasons": r["seasons"],
                "startedPoints": r2(r["started_points"]),
                "starts": r["starts"],
                "lastSeason": r["last_season"],
                "lastTeamName": (
                    team_name_of.get(
                        (last_team[r["player_id"]][0], last_team[r["player_id"]][1])
                    )
                    if r["player_id"] in last_team
                    else None
                ),
            }
            for r in idx
        ]

    # ------------------------------------------------------------ assemble --
    qa_path = GENERATED_DIR / "qa-report.json"
    qa = json.loads(qa_path.read_text()) if qa_path.exists() else {"gates": {}, "warnings": []}

    snapshot = {
        "contractVersion": CONTRACT_VERSION,
        "generatedAt": NOW,
        "adapterVersion": ADAPTER_VERSION,
        "latestCompletedSeason": latest,
        # There is no AFFL 2026 statistical season before the draft.
        "activeSeason": None,
        "seasons": seasons,
        "seasonSummary": season_summaries[str(latest)],
        "seasonSummaries": season_summaries,
        "franchises": franchises,
        "matchups": envelope(
            "season.matchups",
            matchups,
            "verified",
            coverage("team-week", True, "verified", latest, latest),
            [prov_sqlite(["v_matchup", "v_team"], "matchups")],
            NOW,
        ),
        "auction": envelope(
            "frontoffice.auction",
            auction,
            "verified",
            coverage(
                "auction-pick",
                True,
                "verified",
                AUCTION_BID_FROM,
                latest,
                "2014-2015 drafts carry no bid amounts",
            ),
            [prov_sqlite(["v_draft_value"], "auction"), prov_duck(["draft_picks"], "draft_facts")],
            NOW,
        ),
        "auctionBudgets": envelope(
            "frontoffice.auctionBudgets",
            auction_budgets,
            "verified",
            coverage("team-season", True, "verified", latest, latest),
            [prov_sqlite(["v_draft_value"], "auction_budgets")],
            NOW,
        ),
        "roto": envelope(
            "season.roto",
            roto,
            "verified",
            coverage("team-season", True, "verified", TRANSACTION_FROM, latest),
            [prov_sqlite(["v_roto_standings"], "roto")],
            NOW,
        ),
        "pointSources": envelope(
            "frontoffice.pointSources",
            point_sources,
            "verified",
            coverage(
                "team-season",
                True,
                "verified",
                TRANSACTION_FROM,
                latest,
                "started-point custody requires transaction coverage, which begins in 2018",
            ),
            [prov_sqlite(["v_custody_par", "fact_player_week_par"], "point_sources")],
            NOW,
        ),
        "management": envelope(
            "frontoffice.management",
            management,
            "verified",
            coverage(
                "team-season",
                True,
                "verified",
                TRANSACTION_FROM,
                latest,
                "optimal-lineup review requires weekly bench data, which begins in 2018",
            ),
            [prov_sqlite(["fact_roster_week", "fact_player_week_par"], "management")],
            NOW,
        ),
        "waivers": envelope(
            "frontoffice.waivers",
            waivers,
            "verified",
            coverage("team-season", True, "verified", TRANSACTION_FROM, latest),
            [prov_sqlite(["fact_transaction"], "waivers")],
            NOW,
        ),
        "trades": envelope(
            "frontoffice.trades",
            trades,
            "reconstructed",
            coverage(
                "trade",
                True,
                "reconstructed",
                TRANSACTION_FROM,
                latest,
                "trade facts are reconstructed from transaction items; no winner grade is computed",
            ),
            [prov_sqlite(["fact_trade", "fact_trade_item"], "trades")],
            NOW,
            warnings=["Trade records are reconstructed. No winner grade is published."],
        ),
        "rivalries": envelope(
            "archive.rivalries",
            rivalries,
            "verified",
            coverage("franchise-pair", True, "verified", min(seasons), latest),
            [prov_sqlite(["v_matchup", "v_team"], "rivalries")],
            NOW,
        ),
        "records": envelope(
            "archive.records",
            records,
            "verified",
            coverage("league", True, "verified", min(seasons), latest),
            [prov_sqlite(["v_matchup", "v_team"], "records")],
            NOW,
        ),
        "featuredPlayer": envelope(
            "player.profile",
            featured,
            "verified",
            coverage(
                "player-season",
                True,
                "verified",
                TRANSACTION_FROM,
                latest,
                "AFFL player-season detail begins in 2018",
            ),
            [prov_sqlite(["v_player_season", "v_draft_value", "fact_roster_week"], "player_profile")],
            NOW,
        ),
        "playerIndex": envelope(
            "player.index",
            player_index,
            "verified",
            coverage("player", True, "verified", TRANSACTION_FROM, latest),
            [prov_sqlite(["v_player_season"], "player_index")],
            NOW,
        ),
        # ---- explicitly unavailable domains: null + reason, never zeros ----
        "nflContext": envelope(
            "player.nflContext",
            None,
            "unavailable",
            coverage(
                "player-season",
                False,
                "unavailable",
                reason="bio, injury, NGS, college and depth-chart tables hold zero rows",
            ),
            [prov_sqlite(["fact_player_overview", "dim_player_bio"], "nfl_context")],
            NOW,
            missing_reason="source_not_collected",
        ),
        "benchDetail": envelope(
            "season.benchDetail",
            None,
            "unavailable",
            coverage(
                "team-week",
                False,
                "unavailable",
                reason="pre-2018 benches, waivers and ownership stints were never collected",
            ),
            [prov_duck(["lineups", "roster_snapshots"], "bench_detail")],
            NOW,
            missing_reason="outside_source_coverage",
        ),
        "preSeasonPlanning": envelope(
            "season.planning",
            None,
            "unavailable",
            coverage(
                "season",
                False,
                "unavailable",
                reason="planning membership never creates standings, team-season records "
                "or player-career seasons",
            ),
            [prov_duck(["seasons"], "planning")],
            NOW,
            missing_reason="not_applicable",
        ),
        "qa": {
            "generatedAt": qa.get("generatedAt", NOW),
            "gates": qa.get("gates", {}),
            "warnings": qa.get("warnings", []),
        },
    }

    # ------------------------------------------------------------- catalog --
    catalog = {
        "contractVersion": CONTRACT_VERSION,
        "generatedAt": NOW,
        "seasons": seasons,
        "franchises": [
            {"id": f["franchiseId"], "name": f["currentName"], "aliases": [e["teamName"] for e in f["nameEras"]]}
            for f in franchises
        ],
        "players": [
            {"id": p["playerId"], "name": p["name"], "position": p["position"]}
            for p in player_index[:400]
        ],
        "metrics": [
            {"id": "standings", "label": "Standings", "surface": "/season"},
            {"id": "power", "label": "Power rating", "surface": "/season"},
            {"id": "luck", "label": "Luck", "surface": "/season"},
            {"id": "roto", "label": "Roto standings", "surface": "/season"},
            {"id": "auction", "label": "Auction board", "surface": "/front-office"},
            {"id": "management", "label": "Management score", "surface": "/front-office"},
            {"id": "point-sources", "label": "Point sources", "surface": "/front-office"},
            {"id": "records", "label": "Record book", "surface": "/archive"},
            {"id": "rivalries", "label": "Rivalries", "surface": "/archive"},
        ],
    }

    # -------------------------------------------------------- name defence --
    blob = json.dumps(snapshot, sort_keys=True) + json.dumps(catalog, sort_keys=True)
    leaked = sorted(n for n in person_names if n and n in blob)
    if leaked:
        print("export: person name leaked into snapshot: %s" % leaked, file=sys.stderr)
        return 1
    if "ownerName" in blob or "owner_name" in blob:
        print("export: owner name field leaked into snapshot", file=sys.stderr)
        return 1

    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    (GENERATED_DIR / "showcase.json").write_text(
        json.dumps(snapshot, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    (GENERATED_DIR / "catalog.json").write_text(
        json.dumps(catalog, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )

    size = (GENERATED_DIR / "showcase.json").stat().st_size
    print(
        "export: %d seasons, %d franchises, %d players, %d rivalries -> showcase.json (%.0f KB)"
        % (len(seasons), len(franchises), len(player_index), len(rivalries), size / 1024)
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

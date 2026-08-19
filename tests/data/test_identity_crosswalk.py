import unittest
from collections import Counter, defaultdict

from _bootstrap import ROOT  # noqa: F401  (path bootstrap)
from scripts.affl_sources import OWNER_ALIASES, open_semantic_sqlite


class IdentityTests(unittest.TestCase):
    def test_every_team_season_has_one_canonical_franchise(self):
        with open_semantic_sqlite() as con:
            rows = con.execute(
                "SELECT season, team_id, owner_id, name FROM v_team ORDER BY season, team_id"
            ).fetchall()
        self.assertEqual(len(rows), 138)
        self.assertEqual(len({(r["season"], r["team_id"]) for r in rows}), 138)
        self.assertTrue(all(r["owner_id"] and r["name"] for r in rows))

    def test_no_canonical_franchise_controls_two_teams_in_one_season(self):
        with open_semantic_sqlite() as con:
            rows = con.execute("SELECT season, owner_id FROM v_team").fetchall()
        dupes = [k for k, n in Counter((r["season"], r["owner_id"]) for r in rows).items() if n > 1]
        self.assertEqual(dupes, [], "a franchise may hold at most one team per season")

    def test_user_facing_source_is_team_name_not_person_name(self):
        with open_semantic_sqlite() as con:
            rows = con.execute("SELECT name, owner_name FROM v_team").fetchall()
        self.assertTrue(all(r["name"] != r["owner_name"] for r in rows))

    def test_documented_aliases_resolve_to_their_canonical_owner(self):
        """m01->m07, m03->m08, m20->m10 come from the source manifest."""
        with open_semantic_sqlite() as con:
            members = {
                r["member_id"]: r["owner_id"]
                for r in con.execute("SELECT member_id, owner_id FROM dim_member").fetchall()
            }
        for alias, canonical in OWNER_ALIASES.items():
            self.assertIn(alias, members)
            self.assertEqual(
                members[alias],
                canonical,
                "%s must resolve to %s" % (alias, canonical),
            )

    def test_franchise_history_aggregates_aliases_without_hardcoded_counts(self):
        """A franchise keeps every season's own team name across renames.

        Deliberately asserts *relationships*, never an exact season count for
        any one franchise — that is a documented build-gate prohibition.
        """
        with open_semantic_sqlite() as con:
            rows = con.execute(
                "SELECT season, owner_id, member_id, name FROM v_team ORDER BY owner_id, season"
            ).fetchall()

        by_owner = defaultdict(list)
        for r in rows:
            by_owner[r["owner_id"]].append(r)

        # Every source-backed team-season lands in exactly one franchise.
        self.assertEqual(sum(len(v) for v in by_owner.values()), len(rows))

        # At least one franchise must actually exercise the rename path,
        # otherwise the continuity rule is untested by the data.
        renamed = [
            oid
            for oid, rs in by_owner.items()
            if len({r["name"] for r in rs}) > 1
        ]
        self.assertTrue(renamed, "expected at least one multi-name franchise")

        # An aliased member id must fold into its canonical franchise history.
        for alias, canonical in OWNER_ALIASES.items():
            alias_rows = [r for r in rows if r["member_id"] == alias]
            if not alias_rows:
                continue
            self.assertTrue(
                all(r["owner_id"] == canonical for r in alias_rows),
                "%s seasons must aggregate under %s" % (alias, canonical),
            )

    def test_hiatus_is_a_gap_not_a_new_franchise(self):
        with open_semantic_sqlite() as con:
            rows = con.execute("SELECT season, owner_id FROM v_team ORDER BY owner_id, season").fetchall()
        by_owner = defaultdict(list)
        for r in rows:
            by_owner[r["owner_id"]].append(r["season"])

        gapped = {
            oid: seasons
            for oid, seasons in by_owner.items()
            if seasons and (max(seasons) - min(seasons) + 1) != len(seasons)
        }
        # The league genuinely contains a hiatus; it must remain one franchise.
        self.assertTrue(gapped, "expected at least one franchise with a hiatus")
        for oid, seasons in gapped.items():
            self.assertEqual(len(seasons), len(set(seasons)), "%s duplicated a season" % oid)


if __name__ == "__main__":
    unittest.main()

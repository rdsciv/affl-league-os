import json
import subprocess
import unittest

from _bootstrap import ROOT


class ShowcaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        subprocess.run(
            ["/usr/bin/python3", "scripts/export_affl_showcase.py"], cwd=str(ROOT), check=True
        )
        cls.raw = (ROOT / "data/generated/showcase.json").read_text()
        cls.data = json.loads(cls.raw)

    def test_snapshot_uses_team_names_and_data_envelopes(self):
        data = self.data
        self.assertEqual(data["contractVersion"], "affl-readonly-v1")
        self.assertEqual(data["latestCompletedSeason"], 2025)
        self.assertNotIn("ownerName", self.raw)
        self.assertGreater(len(data["franchises"]), 10)
        self.assertTrue(all("seasonAliases" in f for f in data["franchises"]))

    def test_no_real_person_name_reaches_the_snapshot(self):
        from scripts.affl_sources import known_person_names, open_semantic_sqlite

        with open_semantic_sqlite() as con:
            names = known_person_names(con)
        leaked = sorted(n for n in names if n and n in self.raw)
        self.assertEqual(leaked, [], "person names leaked into the showcase snapshot")

    def test_there_is_no_affl_2026_statistical_season(self):
        self.assertIsNone(self.data["activeSeason"])
        self.assertNotIn(2026, self.data["seasons"])
        for f in self.data["franchises"]:
            self.assertTrue(all(a["season"] <= 2025 for a in f["seasonAliases"]))

    def test_each_season_alias_keeps_the_name_used_that_season(self):
        """A renamed franchise must not backfill its current name into history."""
        renamed = [f for f in self.data["franchises"] if len(f["nameEras"]) > 1]
        self.assertTrue(renamed, "expected a franchise that changed team name")
        for f in renamed:
            names = {a["teamName"] for a in f["seasonAliases"]}
            self.assertGreater(len(names), 1)
            # Every era boundary is reflected in the per-season rows.
            for era in f["nameEras"]:
                for a in f["seasonAliases"]:
                    if era["from"] <= a["season"] <= era["to"]:
                        self.assertEqual(a["teamName"], era["teamName"])

    def test_hiatus_is_a_gap_not_a_fabricated_season(self):
        gapped = [f for f in self.data["franchises"] if f["hiatusSeasons"]]
        self.assertTrue(gapped, "expected a franchise with a hiatus")
        for f in gapped:
            played = {a["season"] for a in f["seasonAliases"]}
            for h in f["hiatusSeasons"]:
                self.assertNotIn(h, played, "a hiatus season must not appear as a played season")

    def test_unavailable_domains_are_null_with_a_reason(self):
        for key in ("nflContext", "benchDetail", "preSeasonPlanning"):
            env = self.data[key]
            self.assertIsNone(env["data"], "%s must be null, never zero-filled" % key)
            self.assertEqual(env["evidenceStatus"], "unavailable")
            self.assertTrue(env["missingReason"])
            self.assertTrue(env["coverage"]["reason"])

    def test_available_domains_carry_provenance_and_coverage(self):
        for key in (
            "matchups",
            "auction",
            "roto",
            "pointSources",
            "management",
            "waivers",
            "trades",
            "rivalries",
            "records",
            "featuredPlayer",
            "playerIndex",
        ):
            env = self.data[key]
            self.assertEqual(env["contractVersion"], "affl-readonly-v1")
            self.assertIsNotNone(env["data"], "%s should carry data" % key)
            self.assertTrue(env["provenance"], "%s needs provenance" % key)
            for p in env["provenance"]:
                self.assertTrue(p["adapterVersion"])
                self.assertTrue(p["queryId"])
                self.assertTrue(p["tablesOrArtifact"])
            self.assertIn(env["evidenceStatus"], ("verified", "reconstructed"))

    def test_reconstructed_trades_are_labelled_and_ungraded(self):
        env = self.data["trades"]
        self.assertEqual(env["evidenceStatus"], "reconstructed")
        self.assertTrue(env["warnings"])
        self.assertNotIn("winnerGrade", self.raw)
        self.assertNotIn("tradeWinner", self.raw)

    def test_seasons_without_auction_bids_report_null_not_zero(self):
        """2014-2015 drafts carry no bid amounts. Absence is not 0."""
        self.assertIsNone(self.data["seasonSummaries"]["2014"]["data"]["auctionSpend"])
        self.assertIsNone(self.data["seasonSummaries"]["2015"]["data"]["auctionSpend"])
        self.assertIsNotNone(self.data["seasonSummaries"]["2016"]["data"]["auctionSpend"])

    def test_player_career_counts_franchises_not_season_scoped_team_ids(self):
        """team_id repeats across seasons for different franchises."""
        fp = self.data["featuredPlayer"]["data"]
        distinct = {s["franchiseId"] for s in fp["seasons"] if s["franchiseId"]}
        self.assertEqual(fp["career"]["franchises"], len(distinct))

    def test_catalog_is_generated_for_the_command_bar(self):
        catalog = json.loads((ROOT / "data/generated/catalog.json").read_text())
        self.assertEqual(catalog["contractVersion"], "affl-readonly-v1")
        self.assertTrue(catalog["franchises"])
        self.assertTrue(catalog["players"])
        self.assertTrue(catalog["metrics"])

    def test_output_is_deterministic(self):
        subprocess.run(
            ["/usr/bin/python3", "scripts/export_affl_showcase.py"], cwd=str(ROOT), check=True
        )
        again = json.loads((ROOT / "data/generated/showcase.json").read_text())
        # generatedAt legitimately moves; everything else must be byte-stable.
        a, b = dict(self.data), dict(again)
        for d in (a, b):
            d.pop("generatedAt", None)
        self.assertEqual(
            json.dumps(a["franchises"], sort_keys=True),
            json.dumps(b["franchises"], sort_keys=True),
        )
        self.assertEqual(
            json.dumps(a["records"]["data"], sort_keys=True),
            json.dumps(b["records"]["data"], sort_keys=True),
        )


if __name__ == "__main__":
    unittest.main()

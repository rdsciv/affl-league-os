import json
import subprocess
import unittest

from _bootstrap import ROOT


class QaGateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        subprocess.run(
            ["/usr/bin/python3", "scripts/qa_affl_data.py"], cwd=str(ROOT), check=True
        )
        cls.report = json.loads((ROOT / "data/generated/qa-report.json").read_text())

    def test_qa_report_has_binding_gates_without_hardcoded_franchise_counts(self):
        gates = self.report["gates"]
        self.assertTrue(gates["teamSeasonIdentity"]["pass"])
        self.assertTrue(gates["noAffl2026"]["pass"])
        self.assertTrue(gates["pf2017to2025"]["pass"])
        self.assertNotIn("expectedKafkaSeasons", json.dumps(self.report))

    def test_season_and_team_count_gates(self):
        gates = self.report["gates"]
        self.assertTrue(gates["seasonRange"]["pass"])
        self.assertTrue(gates["teamCounts"]["pass"])
        self.assertTrue(gates["sourcesReadOnly"]["pass"])
        self.assertTrue(gates["aliasCrosswalk"]["pass"])
        self.assertTrue(gates["draftCoverage"]["pass"])

    def test_pre_2017_lineup_detail_stays_gated(self):
        """2014-2016 must remain unavailable, not silently rendered."""
        gate = self.report["gates"]["pf2014to2016Gated"]
        self.assertTrue(gate["pass"])
        self.assertIn("unavailable", gate["detail"].lower())

    def test_coverage_declares_transaction_start(self):
        cov = self.report["coverage"]
        self.assertEqual(cov["transactions"]["seasonFrom"], 2018)
        self.assertFalse(cov["benchDetail"]["available"])

    def test_no_person_name_appears_in_the_report(self):
        """Real names are read from the source, never carried in the report."""
        from scripts.affl_sources import known_person_names, open_semantic_sqlite

        with open_semantic_sqlite() as con:
            names = known_person_names(con)
        self.assertTrue(names, "expected the source to hold person names")

        blob = json.dumps(self.report)
        leaked = sorted(n for n in names if n and n in blob)
        self.assertEqual(leaked, [], "person names leaked into the QA report")


if __name__ == "__main__":
    unittest.main()

import json
import subprocess
import unittest

from _bootstrap import ROOT


class AssetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        subprocess.run(
            ["/usr/bin/python3", "scripts/copy_official_assets.py"], cwd=str(ROOT), check=True
        )
        cls.manifest = json.loads((ROOT / "public/asset-manifest.json").read_text())

    def test_every_current_franchise_uses_a_real_asset(self):
        manifest = self.manifest
        self.assertTrue(manifest["brand"])
        self.assertGreaterEqual(len(manifest["franchises"]), 12)
        self.assertTrue(all(item["sha256"] and item["sourcePath"] for item in manifest["franchises"]))

    def test_every_manifest_file_actually_exists_on_disk(self):
        for item in self.manifest["brand"] + self.manifest["franchises"]:
            path = ROOT / "public" / item["destination"].lstrip("/")
            self.assertTrue(path.exists(), "missing copied asset %s" % item["destination"])
            self.assertGreater(path.stat().st_size, 0)

    def test_assets_land_only_in_brand_or_franchises(self):
        for item in self.manifest["brand"] + self.manifest["franchises"]:
            self.assertTrue(
                item["destination"].startswith("/brand/")
                or item["destination"].startswith("/franchises/"),
                "asset escaped its allowed directory: %s" % item["destination"],
            )

    def test_sources_come_from_the_official_logo_directory(self):
        from scripts.affl_sources import LOGO_DIR

        for item in self.manifest["brand"] + self.manifest["franchises"]:
            self.assertTrue(
                item["sourcePath"].startswith(LOGO_DIR),
                "asset came from outside the official source: %s" % item["sourcePath"],
            )

    def test_a_franchise_without_local_art_is_marked_unavailable_not_faked(self):
        """No letter tile, no generated stand-in, ever."""
        with_assets = {f["franchiseId"] for f in self.manifest["franchises"]}
        noted = {u["franchiseId"] for u in self.manifest["unavailable"]}

        from scripts.affl_sources import open_semantic_sqlite

        with open_semantic_sqlite() as con:
            all_franchises = {
                r["owner_id"] for r in con.execute("SELECT DISTINCT owner_id FROM v_team").fetchall()
            }

        for fid in all_franchises - with_assets:
            self.assertIn(fid, noted, "%s has no asset and no unavailable note" % fid)
        for u in self.manifest["unavailable"]:
            self.assertTrue(u["reason"])
            self.assertTrue(u["eras"])

    def test_each_franchise_with_art_has_exactly_one_primary(self):
        by_franchise = {}
        for f in self.manifest["franchises"]:
            by_franchise.setdefault(f["franchiseId"], []).append(f)
        for fid, items in by_franchise.items():
            primaries = [i for i in items if i["primary"]]
            self.assertEqual(len(primaries), 1, "%s needs exactly one primary asset" % fid)

    def test_historical_eras_keep_their_own_season_range(self):
        for f in self.manifest["franchises"]:
            self.assertLessEqual(f["fromSeason"], f["toSeason"])
            self.assertTrue(f["teamName"])


if __name__ == "__main__":
    unittest.main()

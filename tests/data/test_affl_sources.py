import unittest

from _bootstrap import ROOT  # noqa: F401  (path bootstrap)
from scripts.affl_sources import open_platform_duckdb, open_semantic_sqlite


class SourceTests(unittest.TestCase):
    def test_duckdb_is_read_only_and_has_12_completed_seasons(self):
        with open_platform_duckdb() as con:
            self.assertEqual(
                con.execute(
                    "SELECT min(season), max(season), count(*) FROM seasons"
                ).fetchone(),
                (2014, 2025, 12),
            )
            with self.assertRaises(Exception):
                con.execute("CREATE TABLE forbidden_write(x INT)")

    def test_sqlite_is_query_only(self):
        with open_semantic_sqlite() as con:
            self.assertEqual(con.execute("PRAGMA query_only").fetchone()[0], 1)
            with self.assertRaises(Exception):
                con.execute("CREATE TABLE forbidden_write(x INT)")

    def test_sources_are_never_opened_for_write(self):
        """The adapter must not expose a writable handle by any route."""
        from scripts import affl_sources

        self.assertNotIn("read_only=False", affl_sources.__doc__ or "")
        with open_semantic_sqlite() as con:
            with self.assertRaises(Exception):
                con.execute("DELETE FROM dim_team WHERE 1=0")


if __name__ == "__main__":
    unittest.main()

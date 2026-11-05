"""TeslaFi table parser and fetch cadence in scripts/snapshot-extras.py (layout of beta.teslafi.com, Oct 2026)."""
import datetime as dt
import importlib.util
import os
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
os.chdir(ROOT)
spec = importlib.util.spec_from_file_location("snapshot_extras", ROOT / "scripts" / "snapshot-extras.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def row(version, installs, pct, pending, fsd=""):
    return (
        '<tr> <td> <form id="1" method="post" action="firmware.php"><input type="hidden" name="detail" value="%s"> </form> '
        '<a href="javascript:{}" onclick="document.getElementById(\'1\').submit()">%s</a> %s </td> <td> %s </td> <td>%s%%</td> <td>%s</td> '
        '<td> <div class="review-rating-slim"><div class="stars"><span class="star"><span class="fa fa-star"></span></span></div></div> </td> </tr>'
        % (version, version, '<sup class="sw-fsd">%s</sup>' % fsd if fsd else "", installs, pct, pending)
    )


def page(rows):
    return (
        "<html><body><table id=\"latest_fleet_updates1\"><tbody><tr><td>31</td><td><a>2026.99</a></td></tr></tbody></table>"
        '<table id="contributing_vehicles" class="dt-table-common"><thead><th>Software version</th><th>Current installs</th>'
        "<th>Percent of fleet</th><th>Pending installs</th><th>Reviews</th></thead><tbody>" + "".join(rows) + "</tbody></table></body></html>"
    )


class TeslaFi(unittest.TestCase):
    def test_parses_current_layout(self):
        rows = [row("2026.39.6", "206", "1.7", "31", "14.2.2.6"), row("2026.38.6", "3,038", "24.6", "1,632"),
                row("2026.38.5.12", "90", "0.7", "130", "14.3 Lite & 14.3.13"), row("2026.38.5.11", "4,111", "33.3", "277"),
                row("2026.38.5.1", "300", "2.4", "0")]
        out = mod.parse_teslafi(page(rows), "2026-11-05T21:00:00Z")
        self.assertEqual(out["fetched"], "2026-11-05T21:00:00Z")
        self.assertEqual([v["id"] for v in out["versions"]], ["2026.39.6", "2026.38.6", "2026.38.5.12", "2026.38.5.11", "2026.38.5.1"])
        self.assertEqual(out["versions"][1], {"id": "2026.38.6", "installs": 3038, "percent": 24.6, "pending": 1632})
        self.assertEqual(out["fleet"], 206 + 3038 + 90 + 4111 + 300)

    def test_missing_table_or_too_few_rows_raises(self):
        with self.assertRaises(RuntimeError):
            mod.parse_teslafi("<html>redirect</html>", "x")
        with self.assertRaises(RuntimeError):
            mod.parse_teslafi(page([row("2026.39.6", "1", "1", "0")]), "x")

    def test_only_first_table_with_id_is_read(self):
        # the first table on the page (latest fleet updates) has a different layout and must not be parsed
        rows = [row("2026.%d.1" % n, "10", "1.0", "0") for n in range(30, 36)]
        self.assertEqual(len(mod.parse_teslafi(page(rows), "x")["versions"]), 6)

    def test_fetch_cadence_is_judged_from_the_saved_time(self):
        now = dt.datetime.now(dt.timezone.utc)
        fmt = "%Y-%m-%dT%H:%M:%SZ"
        self.assertTrue(mod.teslafi_due(None))
        self.assertTrue(mod.teslafi_due({"fetched": "not a date"}))
        self.assertFalse(mod.teslafi_due({"fetched": (now - dt.timedelta(minutes=30)).strftime(fmt)}))
        self.assertTrue(mod.teslafi_due({"fetched": (now - dt.timedelta(minutes=mod.TESLAFI_EVERY_MIN + 5)).strftime(fmt)}))


if __name__ == "__main__":
    unittest.main()

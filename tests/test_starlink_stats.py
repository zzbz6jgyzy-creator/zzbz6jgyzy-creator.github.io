"""McDowell's summary table pads single-digit days. The baker must still parse them."""
import importlib.util
import unittest
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("stats", ROOT / "scripts/build-starlink-stats.py")
stats = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stats)

PADDED = "Summary status table Data last updated: 2026 Nov  2 0045:00 <P>"
UNPADDED = "Data last updated: 2026 Oct 29 0144:51"
MARKDOWN = "Data last updated: 2026 Nov 2 0045:00"
HTML = "Data last updated:<br>2026 Nov&nbsp;&nbsp;2 0045:00"


class TimestampTests(unittest.TestCase):
    def test_padded_single_digit_day(self):
        ts = stats.parse_updated(PADDED)
        self.assertEqual(ts, datetime(2026, 11, 2, 0, 45, 0, tzinfo=timezone.utc))
        self.assertIsNotNone(stats.TS_RE.search(PADDED))

    def test_two_digit_day_still_parses(self):
        ts = stats.parse_updated(UNPADDED)
        self.assertEqual(ts, datetime(2026, 10, 29, 1, 44, 51, tzinfo=timezone.utc))

    def test_unpadded_single_digit_and_html_nbsp(self):
        self.assertEqual(stats.parse_updated(MARKDOWN).day, 2)
        self.assertEqual(stats.parse_updated(HTML), datetime(2026, 11, 2, 0, 45, 0, tzinfo=timezone.utc))

    def test_missing_timestamp_exits_without_a_guess(self):
        with self.assertRaises(SystemExit) as ctx:
            stats.parse_updated("Summary status table with no date")
        self.assertEqual(str(ctx.exception), "no timestamp")


if __name__ == "__main__":
    unittest.main()

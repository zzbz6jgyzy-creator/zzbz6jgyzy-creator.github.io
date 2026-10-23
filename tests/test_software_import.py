"""Offline source-import checks; no requests to providers and no live writes."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('software_import', ROOT / 'scripts/snapshot-updates.py')
source = importlib.util.module_from_spec(spec)
spec.loader.exec_module(source)


def row(version, count=5, fleet=100):
    return {'id': version, 'date': '2026-10-23', 'count': count, 'fleet': fleet}


class SoftwareImportTests(unittest.TestCase):
    def test_versions_cross_year_boundaries_without_accepting_non_versions(self):
        with patch.object(source, 'fetch', return_value={'code': 200, 'response': ['2027.2', '2026.44.25.2', 'not-a-version']}), \
             patch.object(source, 'load_version', side_effect=lambda name: row('2027.2' if name == 'latest' else name)) as load, \
             patch.object(source.time, 'sleep'):
            result = source.snapshot()
        self.assertEqual({v['id'] for v in result['versions']}, {'2027.2', '2026.44.25.2'})
        self.assertNotIn('not-a-version', [call.args[0] for call in load.call_args_list])

    def test_empty_or_malformed_listing_is_rejected(self):
        for payload in [{'code': 200, 'response': []}, {'code': 200, 'response': {}}, {'code': 503, 'response': []}]:
            with self.subTest(payload=payload), patch.object(source, 'fetch', return_value=payload):
                with self.assertRaises(RuntimeError):
                    source.snapshot()

    def test_unusable_observed_counts_are_rejected(self):
        for value in [None, row('2027.2', fleet=0), row('2027.2', count=-1), row('2027.2', count=101), row('2027.2', count=0)]:
            with self.subTest(value=value), patch.object(source, 'fetch', return_value={'code': 200, 'response': ['2027.2']}), \
                 patch.object(source, 'load_version', return_value=value), patch.object(source.time, 'sleep'):
                with self.assertRaises(RuntimeError):
                    source.snapshot()

    def test_source_failure_keeps_the_previous_file_and_timestamp(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / 'updates-live.json'
            saved = json.dumps({'updated': '2026-10-23T00:00:00Z', 'versions': ['saved']})
            output.write_text(saved)
            with patch.object(source, 'snapshot', side_effect=RuntimeError('invalid source')), \
                 patch('sys.argv', ['snapshot-updates.py', '--out', str(output)]):
                self.assertEqual(source.main(), 0)
            self.assertEqual(output.read_text(), saved)


if __name__ == '__main__':
    unittest.main()

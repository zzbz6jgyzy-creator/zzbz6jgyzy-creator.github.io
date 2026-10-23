import importlib.util,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('gp',ROOT/'scripts/build-starlink-gp.py');gp=importlib.util.module_from_spec(spec);spec.loader.exec_module(gp)
class SourceTests(unittest.TestCase):
 def test_unknown_is_not_optimized(self):
  self.assertEqual(gp.classify('Unrecognised bus','STARLINK-12345',''),'unknown')
  self.assertEqual(gp.classify('Starlink V2MO','STARLINK-12345',''),'v2opt')
  self.assertEqual(gp.classify('Starlink V2MD','STARLINK-12345',''),'v2dtc')
 def test_starshield_excluded(self):
  self.assertIsNone(gp.classify('','Starshield',''))
 def test_epoch_never_falls_back_to_download_clock(self):
  with self.assertRaises(SystemExit):gp.latest_epoch_iso({}, {})
  self.assertEqual(gp.latest_epoch_iso({1:{'EPOCH':'2026-10-20T12:00:00Z'}},{}),'2026-10-20T12:00:00Z')
 def test_six_digit_identifier_keeps_orbital_elements(self):
  row={'NORAD_CAT_ID':123456,'EPOCH':'2026-10-20T12:00:00Z','INCLINATION':53,'RA_OF_ASC_NODE':125,'ECCENTRICITY':.0002,'ARG_OF_PERICENTER':45,'MEAN_ANOMALY':15,'MEAN_MOTION':15.3}
  a,b=gp.omm_to_tle(row);self.assertEqual(len(a),69);self.assertEqual(len(b),69);self.assertEqual(a[-1],gp._tle_checksum(a[:68]));self.assertAlmostEqual(float(b[52:63]),15.3)
if __name__=='__main__':unittest.main()

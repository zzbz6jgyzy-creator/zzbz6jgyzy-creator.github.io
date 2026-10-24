"""Validate LL2 v2.3 adapter and preservation of the last good cache."""
import datetime,importlib.util,json,pathlib,subprocess,tempfile,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('launches',ROOT/'scripts/fetch-launches.py');M=importlib.util.module_from_spec(spec);spec.loader.exec_module(M)
class Adapter(unittest.TestCase):
 def test_v23_and_old_shape(self):
  data=json.loads((ROOT/'tests/fixtures/ll2-calendar-v23.json').read_text());rows=M.normalize(data,datetime.datetime(2026,10,24,tzinfo=datetime.timezone.utc));self.assertEqual(len(rows),3)
  for row in rows:
   for key in ['id','name','net','url','status','pad','net_precision']:self.assertIn(key,row)
 def test_invalid_retains_previous_file(self):
  with tempfile.TemporaryDirectory()as temp:
   target=pathlib.Path(temp)/'launches.json';target.write_text('last good file');bad=pathlib.Path(temp)/'bad.json';bad.write_text('{"results":[]}');r=subprocess.run(['python3',str(ROOT/'scripts/fetch-launches.py'),'--input',str(bad),'--output',str(target)],capture_output=True);self.assertNotEqual(r.returncode,0);self.assertEqual(target.read_text(),'last good file')
 def test_mixed_provider_rejected(self):
  data=json.loads((ROOT/'tests/fixtures/ll2-calendar-v23.json').read_text());data['results'][0]['launch_service_provider']['name']='Other';self.assertRaises(ValueError,M.normalize,data,datetime.datetime.now(datetime.timezone.utc))
if __name__=='__main__':unittest.main()

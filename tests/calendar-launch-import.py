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
 def test_previous_launches_merge_and_keep_45_days(self):
  now=datetime.datetime(2026,10,27,12,tzinfo=datetime.timezone.utc)
  upcoming=json.loads((ROOT/'tests/fixtures/ll2-calendar-v23.json').read_text())
  previous=json.loads((ROOT/'tests/fixtures/ll2-previous-v23.json').read_text())
  rows=M.merge_rows(M.normalize(upcoming,now),M.normalize(previous,now,allow_empty=True))
  by_id={row['id']:row for row in rows}
  self.assertEqual(by_id['e2886a96-5ce9-4f45-872f-4e25a00be837']['status']['abbrev'],'Success')
  self.assertEqual(by_id['crew-13-fixture']['net'],'2026-10-01T15:10:06Z')
  old=json.loads((ROOT/'tests/fixtures/ll2-previous-v23.json').read_text())
  for item in old['results']:item['net']='2026-08-01T15:10:06Z'
  self.assertEqual(M.normalize(old,now,allow_empty=True),[])
 def test_cli_previous_input_writes_merged_file(self):
  with tempfile.TemporaryDirectory()as temp:
   target=pathlib.Path(temp)/'launches.json'
   r=subprocess.run(['python3',str(ROOT/'scripts/fetch-launches.py'),'--input',str(ROOT/'tests/fixtures/ll2-calendar-v23.json'),'--previous-input',str(ROOT/'tests/fixtures/ll2-previous-v23.json'),'--output',str(target)],capture_output=True)
   self.assertEqual(r.returncode,0,r.stderr)
   data=json.loads(target.read_text());ids={row['id'] for row in data['results']}
   self.assertIn('crew-13-fixture',ids);self.assertEqual(next(row['status']['abbrev'] for row in data['results'] if row['id']=='e2886a96-5ce9-4f45-872f-4e25a00be837'),'Success')
if __name__=='__main__':unittest.main()

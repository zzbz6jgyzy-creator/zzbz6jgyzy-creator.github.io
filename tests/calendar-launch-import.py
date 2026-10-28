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
 def test_fresh_go_net_overrides_cached_go_net_and_preserves_done(self):
  now=datetime.datetime(2026,10,28,12,tzinfo=datetime.timezone.utc)
  go=lambda net,window_end:{"id":"starlink-15-21-fixture","name":"Falcon 9 Block 5 | Starlink Group 15-21","net":net,"window_start":net,"window_end":window_end,"url":"https://ll.thespacedevs.com/2.3.0/launches/starlink-15-21-fixture/","status":{"name":"Go for Launch","abbrev":"Go"},"net_precision":{"name":"Minute","abbrev":"MIN"},"launch_service_provider":{"name":"SpaceX"},"pad":{"name":"Space Launch Complex 4E","location":{"name":"Vandenberg SFB, CA, USA"}}}
  done={"id":"crew-13-fixture","name":"Falcon 9 Block 5 | Crew-13","net":"2026-10-01T15:10:06Z","window_start":"2026-10-01T15:10:06Z","window_end":"2026-10-01T15:20:06Z","url":"https://ll.thespacedevs.com/2.3.0/launches/crew-13-fixture/","status":{"name":"Launch Successful","abbrev":"Success"},"net_precision":{"name":"Second","abbrev":"SEC"},"launch_service_provider":{"name":"SpaceX"},"pad":{"name":"Space Launch Complex 40","location":{"name":"Cape Canaveral SFS, FL, USA"}}}
  cached=M.normalize({"results":[go("2026-11-05T05:14:00Z","2026-11-05T09:14:00Z"),done]},now,allow_empty=True)
  fresh=M.normalize({"results":[go("2026-11-05T02:35:00Z","2026-11-05T06:35:00Z")]},now)
  previous=M.normalize({"results":[done]},now,allow_empty=True)
  by_id={row["id"]:row for row in M.merge_rows(cached,fresh,previous)}
  self.assertEqual(by_id["starlink-15-21-fixture"]["net"],"2026-11-05T02:35:00Z")
  self.assertEqual(by_id["crew-13-fixture"]["status"]["abbrev"],"Success")
  with tempfile.TemporaryDirectory()as temp:
   target=pathlib.Path(temp)/"launches.json"
   target.write_text(json.dumps({"results":[go("2026-11-05T05:14:00Z","2026-11-05T09:14:00Z"),done]}))
   upcoming=pathlib.Path(temp)/"upcoming.json";upcoming.write_text(json.dumps({"results":[go("2026-11-05T02:35:00Z","2026-11-05T06:35:00Z")]}))
   previous_path=pathlib.Path(temp)/"previous.json";previous_path.write_text(json.dumps({"results":[done]}))
   r=subprocess.run(["python3",str(ROOT/"scripts/fetch-launches.py"),"--input",str(upcoming),"--previous-input",str(previous_path),"--output",str(target)],capture_output=True)
   self.assertEqual(r.returncode,0,r.stderr)
   data=json.loads(target.read_text());got={row["id"]:row for row in data["results"]}
   self.assertEqual(got["starlink-15-21-fixture"]["net"],"2026-11-05T02:35:00Z")
   self.assertEqual(got["crew-13-fixture"]["status"]["abbrev"],"Success")
 def test_cli_previous_input_writes_merged_file(self):
  with tempfile.TemporaryDirectory()as temp:
   target=pathlib.Path(temp)/'launches.json'
   r=subprocess.run(['python3',str(ROOT/'scripts/fetch-launches.py'),'--input',str(ROOT/'tests/fixtures/ll2-calendar-v23.json'),'--previous-input',str(ROOT/'tests/fixtures/ll2-previous-v23.json'),'--output',str(target)],capture_output=True)
   self.assertEqual(r.returncode,0,r.stderr)
   data=json.loads(target.read_text());ids={row['id'] for row in data['results']}
   self.assertIn('crew-13-fixture',ids);self.assertEqual(next(row['status']['abbrev'] for row in data['results'] if row['id']=='e2886a96-5ce9-4f45-872f-4e25a00be837'),'Success')
if __name__=='__main__':unittest.main()

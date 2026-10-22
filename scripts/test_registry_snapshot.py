import importlib.util,unittest,tempfile,pathlib,json,urllib.error,io,contextlib
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('registry',pathlib.Path(__file__).with_name('build-robotaxi-tx.py'));registry=importlib.util.module_from_spec(spec);spec.loader.exec_module(registry)
class Response:
 def __init__(self,body):self.body=body
 def __enter__(self):return self
 def __exit__(self,*args):return False
 def read(self):return self.body.encode()
class SnapshotTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.out=pathlib.Path(self.temp.name)/'snapshot.json'
  self.original=json.dumps({'history':[{'date':'2026-01-01','cybercab':1,'modelY':1}],'vins':{},'checked':'2026-01-01T00:00:00Z'})
  self.out.write_text(self.original);self.saved=registry.OUT;registry.OUT=self.out
 def tearDown(self):registry.OUT=self.saved;self.temp.cleanup()
 def test_accepted_response_writes_verified_counts(self):
  html=''.join('<span class="rt-vin">'+prefix+str(i).zfill(17-len(prefix))+'</span>' for prefix in ['5YJAJ','7SAY'] for i in range(60))
  def get(req,timeout):
   self.assertEqual(req.get_header('User-agent'),'SuperchargedDaily/1.0 (+https://superchargeddaily.com)');return Response(html)
  with patch.object(registry.urllib.request,'urlopen',side_effect=get),contextlib.redirect_stdout(io.StringIO()):self.assertEqual(registry.main(),0)
  data=json.loads(self.out.read_text());self.assertEqual(data['history'][-1]['cybercab'],60);self.assertEqual(data['history'][-1]['modelY'],60)
 def test_unexpected_200_is_a_failure_without_overwriting_snapshot(self):
  with patch.object(registry.urllib.request,'urlopen',return_value=Response('<html>verification required</html>')),contextlib.redirect_stderr(io.StringIO()):self.assertEqual(registry.main(),1)
  self.assertEqual(self.out.read_text(),self.original)
 def test_forbidden_response_preserves_last_good_snapshot(self):
  with patch.object(registry.urllib.request,'urlopen',side_effect=urllib.error.HTTPError(registry.URL,403,'Forbidden',{},None)):
   with self.assertRaises(urllib.error.HTTPError):registry.main()
  self.assertEqual(self.out.read_text(),self.original)
if __name__=='__main__':unittest.main()

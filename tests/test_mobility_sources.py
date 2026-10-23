import importlib.util,json,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('checker',Path(__file__).resolve().parents[1]/'scripts/check-mobility-sources.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Sources(unittest.TestCase):
 def body(self,text='decision '):return ('<main>'+text*60+'</main>').encode()
 def test_navigation_noise_is_not_a_decision(self):
  a=b'<nav>yesterday</nav>'+self.body();b=b'<nav>today</nav>'+self.body();self.assertEqual(m.fingerprint(a,'text/html'),m.fingerprint(b,'text/html'))
 def test_change_failure_acknowledgement_and_reversion(self):
  source={'id':'s-0123456789ab','url':'https://example.org/source'};now='2026-10-23T00:00:00Z'
  a=m.check_one(source,{},now,lambda s:(self.body(),'text/html'));self.assertFalse(a['pendingReview'])
  b=m.check_one(source,a,now,lambda s:(self.body('changed '),'text/html'));self.assertTrue(b['pendingReview'])
  def fail(s):raise OSError('source unavailable')
  c=m.check_one(source,b,now,fail);self.assertTrue(c['pendingReview']);self.assertEqual(c['lastSuccessAt'],b['lastSuccessAt']);self.assertEqual(c['state'],'unavailable')
  state={'sources':{source['id']:c}};self.assertRaises(ValueError,m.acknowledge,state,source['id'],'0'*64,now)
  m.acknowledge(state,source['id'],b['observedHash'],now);self.assertFalse(c['pendingReview']);self.assertEqual(c['state'],'unavailable')
 def test_challenge_and_invalid_pdf_are_unavailable(self):
  self.assertRaises(ValueError,m.fingerprint,b'not a pdf','application/pdf');self.assertRaises(ValueError,m.fingerprint,self.body('verify you are human '),'text/html')
if __name__=='__main__':unittest.main()

class RegistryIngest(unittest.TestCase):
 def run_registry(self,declared=100):
  import tempfile,io,contextlib
  from unittest.mock import patch
  spec=importlib.util.spec_from_file_location('registry_ingest',Path(__file__).resolve().parents[1]/'scripts/build-robotaxi-tx.py');registry=importlib.util.module_from_spec(spec);spec.loader.exec_module(registry)
  vins=['5YJAJ'+str(i).zfill(12) for i in range(50)]+['7SAYG'+str(i).zfill(12) for i in range(50)]
  html=('Tesla Robotaxi <h3 class="rt-fleet-title">'+str(declared)+' registered VINs</h3>'+''.join('<span class="rt-vin">'+v+'</span>' for v in vins)).encode()
  with tempfile.TemporaryDirectory() as temp:
   path=Path(temp)/'registry.json';prior={'checked':'2026-10-22T17:00:00Z','history':[{'date':'2026-10-22','cybercab':49,'modelY':50,'other':0,'src':'https://example.org/registry'}],'vins':{}}
   path.write_text(json.dumps(prior));before=path.read_bytes()
   with patch.object(registry,'OUT',path),patch.object(registry.urllib.request,'urlopen',return_value=io.BytesIO(html)),contextlib.redirect_stdout(io.StringIO()):
    if declared!=100:
     self.assertRaises(ValueError,registry.main);self.assertEqual(path.read_bytes(),before);return
    self.assertEqual(registry.main(),0);result=json.loads(path.read_text());self.assertEqual(result['history'][-1]['cybercab'],50);self.assertEqual(result['history'][-1]['modelY'],50);self.assertEqual(len(result['vins']),100);self.assertEqual(len(result['observations']),2)
 def test_complete_unique_vins_and_intraday_observations(self):self.run_registry()
 def test_partial_mirror_cannot_overwrite_saved_registry(self):self.run_registry(101)

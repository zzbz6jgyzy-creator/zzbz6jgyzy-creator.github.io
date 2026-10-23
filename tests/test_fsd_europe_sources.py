import importlib.util,json,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('checker',Path(__file__).resolve().parents[1]/'scripts/check-fsd-europe-sources.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
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

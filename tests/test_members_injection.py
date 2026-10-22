import pathlib,runpy,unittest,re,json
ROOT=pathlib.Path(__file__).resolve().parents[1]
inject=runpy.run_path(str(ROOT/'scripts/inject-members.py'))['inject']
class Injection(unittest.TestCase):
 def test_new_article_and_idempotency(self):
  src='<html><head><title>New story</title></head><body><div class="pn-wrap"></div><main><article class="article"><h1>Story</h1></article></main></body></html>'
  new=inject(src);self.assertEqual(new.count('src="/members.js'),1);self.assertEqual(new.count('href="/members.css'),1);self.assertEqual(inject(new),new);self.assertIn('<h1>Story</h1>',new)
 def test_redirect_untouched(self):
  src='<html><head><meta http-equiv="refresh" content="0;url=/"></head><body></body></html>';self.assertEqual(inject(src),src)
 def test_current_pages(self):
  for path in [ROOT/'index.html',ROOT/'about.html',ROOT/'members.html',ROOT/'community.html',ROOT/'dispatch/tesla-ai-maps-v15.html']:
   with self.subTest(path=path.name):self.assertEqual(inject(path.read_text()),path.read_text())
 def test_captured_site_pages_if_available(self):
  capture=pathlib.Path('/workspace/supercharged-seo');file=capture/'crawl.json'
  if not file.exists():self.skipTest('Optional prior full-site capture unavailable')
  tested=0
  for p in json.loads(file.read_text()):
   if p.get('status')!=200 or not p.get('saved','').endswith('.html'):continue
   src=(capture/'pages'/p['saved']).read_text()
   if '<main' not in src or 'class="pn-wrap"' not in src or '</head>' not in src:continue
   new=inject(src);self.assertEqual(inject(new),new);self.assertEqual(new.count('src="/members.js'),1);tested+=1
  self.assertGreaterEqual(tested,100)
if __name__=='__main__':unittest.main()

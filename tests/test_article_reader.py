import pathlib,re,runpy,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
M=runpy.run_path(str(ROOT/'scripts/build-article-reader.py'))
class Reader(unittest.TestCase):
 def test_current_stories_are_reproducible(self):
  n=0
  for p in (ROOT/'dispatch').glob('*.html'):
   s=p.read_text()
   if 'rs:tools' in s:
    n+=1;self.assertEqual(M['decorate'](s),s,p.name);self.assertEqual(s.count('<!--rs:tools-->'),1);self.assertEqual(s.count('/article-reader.js?'),1)
  self.assertGreaterEqual(n,81)
 def test_reporting_links_and_credits_survive(self):
  src='<html><head></head><body><article class="article"><h1>Title</h1><p class="standfirst">A summary.</p><figure><img src="/photo.jpg" alt="A credited photo"><figcaption>Credit: <a href="https://example.org">Author</a></figcaption></figure><h2 id="evidence">Evidence</h2><p>Quoted reporting. <a href="https://example.net/source">Source</a></p></article></body></html>'
  new=M['decorate'](src);clean=M['ASSETS'].sub('',M['BAR'].sub('',new)).replace(' class="rs-story"','').replace('article rs-article','article')
  self.assertEqual(re.sub(r'\s+',' ',clean).strip(),re.sub(r'\s+',' ',src).strip())
 def test_redirects_remain_unchanged(self):
  s='<html><head><meta http-equiv="refresh" content="0;url=/"></head><body>Moved.</body></html>';self.assertEqual(M['decorate'](s),s)
if __name__=='__main__':unittest.main()

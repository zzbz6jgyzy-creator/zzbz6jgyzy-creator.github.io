"""Exercise generated contents against real anchor collisions and future articles."""
import importlib.util,pathlib,tempfile,unittest,runpy
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('wayfinding',ROOT/'scripts/build-wayfinding.py');build=importlib.util.module_from_spec(spec);spec.loader.exec_module(build)

def page(headings):
 return '<html><head></head><body><div id="section-repeat"></div><article class="article"><h1>Story</h1><p class="meta">By Alex</p>'+headings+'<!-- seo:about --><h2>About the author</h2></article><h2>Related stories</h2></body></html>'

class Wayfinding(unittest.TestCase):
 def test_stylesheet_and_member_injection_keep_a_stable_order(self):
  inject=runpy.run_path(str(ROOT/'scripts/inject-members.py'))['inject']
  src=page(''.join('<h2>Section '+str(i)+'</h2>' for i in range(4))).replace('<body>','<body><div class="pn-wrap"></div><main>').replace('</body>','</main></body>')
  built=build.article(inject(src))
  self.assertEqual(inject(built),built)
  self.assertEqual(build.article(inject(built)),built)
 def test_preserves_existing_anchors_and_escapes_heading_text(self):
  src=page('<h2 id="kept">An <em>existing</em> heading</h2><h2>Repeat</h2><h2>Repeat</h2><h2>Sources &amp; &lt;script&gt;</h2>')
  new=build.article(src)
  self.assertIn('href="#kept">An existing heading',new)
  self.assertIn('id="section-repeat-2"',new);self.assertIn('id="section-repeat-3"',new)
  self.assertIn('Sources &amp; &lt;script&gt;</a>',new)
  contents=new.split('<!--sd:article-wayfinding-->')[1].split('<!--/sd:article-wayfinding-->')[0]
  self.assertNotIn('About the author',contents);self.assertNotIn('Related stories',contents)
  self.assertIn('data-discussion-jump hidden',contents)
  self.assertEqual(build.article(new),new)
 def test_minified_repeated_contents_are_collapsed(self):
  built=build.article(page(''.join('<h2>Section '+str(i)+'</h2>' for i in range(4))))
  block=build.ARTICLE_RX.search(built)[0].strip()
  broken=built.replace(build.ARTICLE_RX.search(built)[0],block*3)
  repaired=build.article(broken)
  self.assertEqual(repaired.count('<!--sd:article-wayfinding-->'),1)
  self.assertEqual(build.article(repaired),repaired)
  self.assertIn('<h1>Story</h1>',repaired)
 def test_short_articles_and_unrelated_pages_stay_unchanged(self):
  src=page('<h2>First</h2><h2>Second</h2><h2>Third</h2>')
  self.assertEqual(build.article(src),src)
  self.assertEqual(build.article('<html><head></head><main><h2>A</h2></main></html>'),'<html><head></head><main><h2>A</h2></main></html>')
 def test_homepage_links_existing_destinations_without_rewriting_stories(self):
  src='<html><head></head><main><header><p class="hv-pitch">Original reporting.</p></header><h2 id="hv-trk-h">Trackers</h2><p>Lead story unchanged.</p></main></html>'
  new=build.homepage(src)
  for path in ['/dispatch.html','#hv-trk-h','/guides/tesla-buying-guide.html']:self.assertIn('href="'+path+'"',new)
  self.assertIn('<p>Lead story unchanged.</p>',new)
  self.assertEqual(build.homepage(new),new)
 def test_future_articles_and_stale_contents_are_regenerated(self):
  previous=build.ROOT
  with tempfile.TemporaryDirectory() as directory:
   try:
    build.ROOT=pathlib.Path(directory);(build.ROOT/'dispatch').mkdir()
    p=build.ROOT/'dispatch/new-story.html';p.write_text(page(''.join('<h2>Section '+str(i)+'</h2>' for i in range(4))))
    self.assertEqual(build.run(),0);self.assertIn('On this page',p.read_text());self.assertEqual(build.run(True),0)
    edited=p.read_text().replace('>Section 2</h2>','>A revised section</h2>')
    p.write_text(edited);self.assertEqual(build.run(True),1);build.run()
    self.assertIn('href="#section-section-2">A revised section',p.read_text())
    shortened=p.read_text().replace('<h2 id="section-section-3">Section 3</h2>','')
    p.write_text(shortened);build.run();self.assertNotIn('sd:article-wayfinding',p.read_text());self.assertNotIn('/wayfinding.css',p.read_text())
   finally:build.ROOT=previous

if __name__=='__main__':unittest.main()

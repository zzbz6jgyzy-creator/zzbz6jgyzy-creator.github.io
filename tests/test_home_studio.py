"""Saved homepage structure, native signup and build ownership guarantees."""
import pathlib,re,unittest,subprocess
from html.parser import HTMLParser
ROOT=pathlib.Path(__file__).resolve().parents[1]
class Document(HTMLParser):
 def __init__(self,source):super().__init__();self.tags=[];self.feed(source)
 def handle_starttag(self,t,a):self.tags.append((t,dict(a)))
class Home(unittest.TestCase):
 def setUp(self):self.source=(ROOT/'index.html').read_text();self.doc=Document(self.source)
 def test_one_heading_and_unique_native_destinations(self):
  self.assertEqual(sum(t=='h1'for t,a in self.doc.tags),1)
  ids=[a['id']for t,a in self.doc.tags if'id'in a];self.assertEqual(len(ids),len(set(ids)))
  for anchor in ['newsletter','newsletter-bottom','newsletter-preview','hv-trk-h','latest-stories']:self.assertIn(anchor,ids)
  for path in ['/roadster.html','/starship.html','/starlink.html','/updates.html','/cybercab.html','/fsd-europe.html','/explainers.html']:self.assertIn('href="'+path+'"',self.source)
 def test_native_signup_without_javascript_and_no_fabricated_social_proof(self):
  forms=[a for t,a in self.doc.tags if t=='form'and'data-newsletter-form'in a];self.assertEqual(len(forms),2)
  for f in forms:self.assertEqual(f['method'],'get');self.assertEqual(f['action'],'https://alexs-newsletter-84b17e.beehiiv.com/')
  inputs=[a for t,a in self.doc.tags if t=='input'and a.get('type')=='email'];self.assertEqual(len(inputs),2)
  for a in inputs:self.assertIn('required',a);self.assertEqual(a['autocomplete'],'email');self.assertEqual(a['inputmode'],'email');self.assertIn(a['id']+'-status',a['aria-describedby'])
  self.assertIn('Free, every Sunday. Unsubscribe anytime.',self.source);self.assertIn('Read a real issue',self.source)
  self.assertNotRegex(self.source,r'Join [\d,]+ (?:readers|subscribers)')
 def test_intro_showcase_signup_follow_native_reading_order(self):
  hero=self.source.split('<header class="hs-hero">',1)[1].split('</header>',1)[0]
  tags=Document(hero).tags
  blocks=[i for i,(t,a) in enumerate(tags) if a.get('class') in ['hs-hero-copy','hs-hero-visual','hs-hero-signup']]
  self.assertEqual([tags[i][1]['class']for i in blocks],['hs-hero-copy','hs-hero-visual','hs-hero-signup'])
  signup=next(a for t,a in tags if a.get('class')=='hs-hero-signup')
  self.assertEqual(signup['id'],'newsletter')
 def test_first_visit_routes_are_native_links(self):
  section=re.search(r'<(section|nav)\b[^>]*class="[^"]*\bhs-wayfinder\b[^"]*"[^>]*>(.*?)</\1>',self.source,re.S)
  self.assertIsNotNone(section,'First-time readers need a labelled route into the site')
  doc=Document(section.group(2));links=[a.get('href')for t,a in doc.tags if t=='a']
  self.assertCountEqual(links,['#latest-stories','#hv-trk-h','/daily.html'])
 def test_images_are_described_and_layout_dimensions_reserved(self):
  main=self.source.split('<main id="main"',1)[1].split('</main>',1)[0];doc=Document(main)
  for t,a in doc.tags:
   if t=='img':
    self.assertIn('alt',a);self.assertGreater(int(a.get('width',0)),0,a.get('src'));self.assertGreater(int(a.get('height',0)),0,a.get('src'))
  self.assertNotIn('<video',main);self.assertNotIn('<iframe',main)
  self.assertIn('CC BY 2.0',main);self.assertIn('Constellation illustration',main)
 def test_refresh_keeps_design_and_all_dynamic_build_markers(self):
  hero=self.source.split('<header class="hs-hero">',1)[1].split('</header>',1)[0]
  subprocess.run(['node','scripts/build-home.js'],cwd=ROOT,check=True,capture_output=True)
  after=(ROOT/'index.html').read_text();self.assertEqual(hero,after.split('<header class="hs-hero">',1)[1].split('</header>',1)[0])
  self.assertEqual(after.count('data-newsletter-form'),2);self.assertIn('class="hs-newsletter"',after)
  for marker in ['lead','supp','event','preload','band','trk','feed','changed','slasof']:self.assertIn('<!--hv:'+marker+'-->',after);self.assertIn('<!--/hv:'+marker+'-->',after)
  self.assertIn('home-studio.css',after)
if __name__=='__main__':unittest.main()

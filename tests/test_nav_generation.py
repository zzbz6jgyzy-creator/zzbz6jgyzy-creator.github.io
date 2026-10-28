"""Generated navigation preserves articles, exposes native links and is repeatable."""
import importlib.util, json, pathlib, re, unittest
from html.parser import HTMLParser
ROOT=pathlib.Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location('shared_nav',ROOT/'scripts/sync-nav.py')
NAV=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(NAV)

class Elements(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.links=[];self.details=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  if tag=='a':self.links.append(a.get('href',''))
  if tag=='details':self.details.append(a)

class NavigationGeneration(unittest.TestCase):
 def build(self):
  return NAV.transform('<html><head><link href="/nav-pill.css?v=old" rel="stylesheet"></head><body><div class="pn-wrap"><nav class="pn" data-start-collapsed data-test="keep" aria-label="Primary"></nav></div><aside></aside><main><h1>Unchanged article</h1><p>Body &amp; sources.</p></main></body></html>')
 def test_preserves_article_and_repeatable_component_boundary(self):
  built=self.build()
  self.assertTrue(built.endswith('<main><h1>Unchanged article</h1><p>Body &amp; sources.</p></main></body></html>'))
  self.assertIn('data-test="keep"',built);self.assertNotIn('data-start-collapsed',built)
  self.assertEqual(NAV.transform(built),built)
  self.assertEqual(built.count('<!--sd:navigation-->'),1)
  self.assertIn('nav-pill.css?v='+NAV.CSS_VERSION,built)
 def test_native_navigation_and_unique_ids(self):
  built=self.build();p=Elements();p.feed(built)
  self.assertEqual(len(p.ids),len(set(p.ids)))
  self.assertEqual(len(p.details),10)
  for href in ['/members.html','/updates.html','/fsd-tracker.html','/fsd-europe.html','/cybercab.html','/roadster.html','/daily.html','/see-the-launch.html','/search.html','/guides/tesla-buying-guide.html']:
   self.assertIn(href,p.links)
  self.assertNotIn('role="menu"',built)
  self.assertNotIn(' inert',built)
  self.assertIn('action="/search.html" method="get"',built)
  self.assertEqual(built.count('data-ns-account'),2)
  self.assertLess(built.index('class="ns-mobile-members"'),built.index('class="ns-mobile-categories"'))
 def test_five_clear_sections_and_one_mobile_disclosure_level(self):
  cfg=json.loads((ROOT/'scripts/nav.json').read_text())
  self.assertEqual([d['label'] for d in cfg['dropdowns']],['News','Tesla','SpaceX','Trackers','Explore'])
  for d in cfg['dropdowns']:
   for g in d['groups']:
    self.assertTrue(g['items']);self.assertTrue(all(isinstance(i,list) and len(i)==4 for i in g['items']))
  self.assertNotIn('pn-nest',self.build())

if __name__=='__main__':unittest.main()


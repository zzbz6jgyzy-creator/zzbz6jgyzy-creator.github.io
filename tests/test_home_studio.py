"""Saved homepage structure, native signup and build ownership guarantees."""
import pathlib,re,unittest,subprocess
from html.parser import HTMLParser
ROOT=pathlib.Path(__file__).resolve().parents[1]
class Document(HTMLParser):
 def __init__(self,source):super().__init__();self.tags=[];self.feed(source)
 def handle_starttag(self,t,a):self.tags.append((t,dict(a)))
class Home(unittest.TestCase):
 def setUp(self):self.source=(ROOT/'index.html').read_text();self.doc=Document(self.source)
 def test_home_feed_matches_the_cards_pins_and_stories_it_is_built_from(self):
  # data/home-latest.json drives the browser repaint of the lead and the headline pairing; pins expire only through it.
  import json
  feed=json.loads((ROOT/'data/home-latest.json').read_text());arts=json.loads((ROOT/'data/articles.json').read_text())['articles']
  strip=lambda h:re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',h)).strip();hrefs=[]
  for m in re.finditer(r'<a class="story-card[^"]*" href="(/dispatch/[^"]+)">([\s\S]*?)</a>',(ROOT/'dispatch.html').read_text()):
   h=re.search(r'<h[23]>([\s\S]*?)</h[23]>',m.group(2))
   if h and strip(h.group(1)) and m.group(1) not in hrefs:hrefs.append(m.group(1))
  self.assertEqual([c['href']for c in feed['cards']],hrefs[:8],'The newest 8 Dispatch cards, in page order')
  for c in feed['cards']:self.assertTrue(c['h'].strip() and c['tag'].strip(),c['href'])
  self.assertEqual([(x['href'],x['pinUntil'])for x in feed['pins']],[(a['url'],a.get('pinUntil')or'')for a in arts if a.get('pinned')],'Every pinned story keeps its expiry')
  self.assertEqual(feed['stories'],[{'url':a['url'],'title':a.get('title')or'','tag':a.get('tag')or'','date':a.get('date')or''}for a in arts],'home-pair.js sees every story')
 def test_one_heading_and_unique_native_destinations(self):
  self.assertEqual(sum(t=='h1'for t,a in self.doc.tags),1)
  ids=[a['id']for t,a in self.doc.tags if'id'in a];self.assertEqual(len(ids),len(set(ids)))
  for anchor in ['newsletter','hv-trk-h','latest-stories']:self.assertIn(anchor,ids)
  for path in ['/roadster.html','/starship.html','/starlink.html','/updates.html','/cybercab.html','/fsd-europe.html','/explainers.html']:self.assertIn('href="'+path+'"',self.source)
 def test_native_signup_without_javascript_and_no_fabricated_social_proof(self):
  forms=[a for t,a in self.doc.tags if t=='form'and'data-newsletter-form'in a];self.assertEqual(len(forms),1,'One main signup: the hero form')
  for f in forms:self.assertEqual(f['method'],'get');self.assertEqual(f['action'],'https://alexs-newsletter-84b17e.beehiiv.com/')
  inputs=[a for t,a in self.doc.tags if t=='input'and a.get('type')=='email'];self.assertEqual(len(inputs),1)
  for a in inputs:self.assertIn('required',a);self.assertEqual(a['autocomplete'],'email');self.assertEqual(a['inputmode'],'email');self.assertIn(a['id']+'-status',a['aria-describedby'])
  self.assertIn('Free, every Sunday. Unsubscribe anytime.',self.source);self.assertIn('Read a real issue',self.source)
  self.assertNotRegex(self.source,r'Join [\d,]+ (?:readers|subscribers)')
 def test_news_first_reading_order(self):
  # Redesign switch (23 Nov 2026): the plain masthead, the lead story, the latest list and the tracker numbers come
  # before the signup, the trackers and tools, and the launch calendar.
  main=self.source.split('<main id="main"',1)[1].split('</main>',1)[0]
  marks=['class="ds-masthead','data-hv-lead','<!--hv:latest-->','class="ds-home-numbers"','id="newsletter"','id="hv-trk-h"','class="hs-calendar"']
  at=[main.find(m) for m in marks]
  self.assertTrue(all(i>=0 for i in at),dict(zip(marks,at)));self.assertEqual(at,sorted(at),dict(zip(marks,at)))
  self.assertEqual(re.findall(r'<h1[^>]*>(.*?)</h1>',self.source,re.S),['Tesla, SpaceX and xAI news'])
  self.assertNotIn('Go beyond',main,'The tagline lives once, in the footer')
 def test_first_screen_routes_are_native_links(self):
  main=self.source.split('<main id="main"',1)[1].split('</main>',1)[0];links=[a.get('href')for t,a in Document(main).tags if t=='a']
  for href in ['/dispatch.html','/calendar.html','/starlink.html','/starship.html','/fsd-tracker.html','/cybercab.html','/grok.html']:self.assertIn(href,links)
  latest=main.split('<!--hv:latest-->',1)[1].split('<!--/hv:latest-->',1)[0]
  self.assertEqual(latest.count('<li'),7,'Seven latest stories after the lead')
  lead=re.search(r'<a class="hv-lead" href="([^"]+)"',main).group(1);self.assertNotIn('href="'+lead+'"',latest,'No story repeats the lead')
 def test_images_are_described_and_layout_dimensions_reserved(self):
  main=self.source.split('<main id="main"',1)[1].split('</main>',1)[0];doc=Document(main)
  for t,a in doc.tags:
   if t=='img':
    self.assertIn('alt',a);self.assertGreater(int(a.get('width',0)),0,a.get('src'));self.assertGreater(int(a.get('height',0)),0,a.get('src'))
  self.assertNotIn('<video',main);self.assertNotIn('<iframe',main)
  self.assertRegex(main,r'<img[^>]*loading="eager"[^>]*fetchpriority="high"[^>]*data-hv-img','The lead image is the first-screen image')
 def test_refresh_keeps_design_and_all_dynamic_build_markers(self):
  # The "Last updated" line is meant to change with the data, so it is compared for shape, not value.
  stamp=re.compile(r'<p class="hv-updated">Last updated <time datetime="[^"]+">[^<]+</time> · <a href="/[^"]+">[^<]+</a></p>')
  mast_of=lambda h:h.split('<!--hv:mast-->',1)[1].split('<!--/hv:mast-->',1)[0]
  mast=mast_of(self.source);self.assertEqual(len(stamp.findall(mast)),1)
  subprocess.run(['node','scripts/build-home.js'],cwd=ROOT,check=True,capture_output=True)
  after=(ROOT/'index.html').read_text();self.assertEqual(len(stamp.findall(mast_of(after))),1)
  self.assertEqual(stamp.sub('',mast),stamp.sub('',mast_of(after)))
  self.assertEqual(after.count('data-newsletter-form'),1);self.assertNotIn('class="hs-newsletter"',after)
  self.assertIn('<!--hv:band--><!--/hv:band-->',after);self.assertRegex(after,r'core\.bundle\.[0-9a-f]+\.js" data-band data-pop data-bar>')
  for marker in ['mast','lead','latest','supp','event','preload','band','trk','feed','changed','slasof']:self.assertIn('<!--hv:'+marker+'-->',after);self.assertIn('<!--/hv:'+marker+'-->',after)
  self.assertIn('home-studio.css',after)
if __name__=='__main__':unittest.main()

import json,pathlib,re,runpy,unittest,xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parents[1]
BUILD=runpy.run_path(str(ROOT/'scripts/build-explainers.py'))
class Explainers(unittest.TestCase):
 def test_generated_files_are_current(self):self.assertEqual(BUILD['run'](True),0)
 def test_lessons_have_unique_ids_sources_and_shareable_metadata(self):
  catalog=BUILD['catalog']();pages=json.loads((ROOT/'data/pages.json').read_text())['pages'];sitemap=(ROOT/'sitemap.xml').read_text()
  for lesson in catalog['lessons']:
   path=BUILD['url'](lesson);s=(ROOT/path.lstrip('/')).read_text();main=s.split('<main',1)[1].split('</main>',1)[0]
   ids=re.findall(r'\bid="([^"]+)"',s);self.assertEqual(len(ids),len(set(ids)),path)
   self.assertEqual(len(re.findall('<h1\\b',main)),1)
   self.assertIn('href="https://superchargeddaily.com'+path+'"',s)
   self.assertIn(path+'</loc>',sitemap);self.assertEqual(sum(p['url']==path for p in pages),1)
   for anchor in re.findall('href="#([^"]+)"',main):self.assertIn(anchor,ids)
   for stage in lesson['stages']:self.assertIn(stage['text'].replace('’','’'),main)
   for payload in re.findall(r'<script type="application/ld\+json">(.*?)</script>',s,re.S):json.loads(payload)
   svg=(ROOT/('assets/explainers/'+lesson['slug']+'.svg')).read_text();ET.fromstring(svg)
   self.assertNotIn('<iframe',main);self.assertNotIn('autoplay',main)
 def test_depth_has_substance_citations_and_scoped_models(self):
  for lesson in BUILD['catalog']()['lessons']:
   self.assertEqual(len(lesson['deepDive']),6);self.assertEqual(len(lesson['facts']),3)
   self.assertGreater(sum(len(p['text'].split()) for ch in lesson['deepDive'] for p in ch['paragraphs']),800)
   self.assertGreaterEqual(len(lesson['sources']),5)
   for chapter in lesson['deepDive']:
    if chapter.get('visual'):ET.fromstring(BUILD['DETAIL'](chapter['visual'],'test-detail'))
  collision=next(l for l in BUILD['catalog']()['lessons'] if l['id']=='evasion')
  self.assertIn('not a Tesla-specific',collision['facts'][0]['note'])
  self.assertIn('not Tesla measurements',BUILD['deep_dive'](collision))
  self.assertIn('39.8',BUILD['DETAIL']('braking','test-braking'))
 def test_comparison_uses_current_tracker_and_retains_static_table(self):
  snapshot=BUILD['tracker']();rows=BUILD['configs'](snapshot);markup=BUILD['comparison'](snapshot)
  self.assertIn(snapshot['updated'],markup)
  for row in rows[:2]:
   self.assertIn(row['version'].get('id') or 'Not reported',markup)
  self.assertIn('data-compare-controls',markup);self.assertIn('<table>',markup)
 def test_server_art_has_initial_state_and_accessible_description(self):
  for lesson in BUILD['catalog']()['lessons']:
   svg=BUILD['ART'](lesson['id'],'test');ET.fromstring(svg)
   self.assertIn('<title',svg);self.assertIn('<desc',svg);self.assertIn('data-show',svg)
if __name__=='__main__':unittest.main()

"""Check that site-wide menu generation preserves page content and is repeatable."""
import pathlib,shutil,subprocess,tempfile,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]

class NavigationGeneration(unittest.TestCase):
 def test_new_pages_keep_content_and_navigation_attributes(self):
  with tempfile.TemporaryDirectory() as directory:
   root=pathlib.Path(directory);(root/'scripts').mkdir()
   for name in ['nav.json','sync-nav.py']:shutil.copyfile(ROOT/'scripts'/name,root/'scripts'/name)
   source='<html><head><link href="/nav-pill.css?v=old" rel="stylesheet"></head><body><div class="pn-wrap"><nav class="pn" data-start-collapsed aria-label="Primary"></nav></div><aside></aside><main><h1>Unchanged article</h1><p>Body &amp; sources.</p></main></body></html>'
   page=root/'new.html';page.write_text(source)
   subprocess.run(['python3',str(root/'scripts/sync-nav.py')],check=True,capture_output=True)
   built=page.read_text()
   self.assertIn('<nav class="pn" data-start-collapsed aria-label="Primary">',built)
   self.assertEqual(source.split('<main>')[1],built.split('<main>')[1])
   self.assertIn('nav-pill.css?v=202610271600',built)
   self.assertEqual(built.count('class="pn-shortcuts"'),1)
   self.assertLess(built.index('class="pn-shortcuts"'),built.index('<h3>Tesla</h3>'))
   subprocess.run(['python3',str(root/'scripts/sync-nav.py'),'--check'],check=True,capture_output=True)
   self.assertEqual(page.read_text(),built)

if __name__=='__main__':unittest.main()

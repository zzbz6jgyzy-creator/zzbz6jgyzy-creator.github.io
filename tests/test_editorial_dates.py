import os
import pathlib
import runpy
import subprocess
import tempfile
import unittest

API = runpy.run_path(str(pathlib.Path(__file__).resolve().parents[1]/'scripts/editorial-dates.py'))
ARTICLE = '<html><head><title>Site</title></head><body><nav>Menu</nav><article class="article"><h1>A story</h1><p class="meta">From Alex</p><p>Verified reporting <a href="https://example.com/source">source</a>.</p><img src="/photo.jpg" alt="A car"></article><footer>Footer</footer></body></html>'
PUBLISHED = '2026-10-07T22:38:21Z'

class Dates(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.root = pathlib.Path(self.temp.name)
        self.git('init','-q'); self.git('config','user.name','Test'); self.git('config','user.email','test@example.com')
        self.path = self.root/'story.html'; API['revision_date'].cache_clear()

    def tearDown(self):
        self.temp.cleanup()

    def git(self,*args,**kwargs):
        return subprocess.run(['git',*args],cwd=self.root,check=True,capture_output=True,**kwargs)

    def commit(self,source,date):
        self.path.write_text(source); self.git('add','story.html')
        self.git('commit','-qm','Revision',env={**os.environ,'GIT_AUTHOR_DATE':date,'GIT_COMMITTER_DATE':date})

    def date(self):
        return API['revision_date'](str(self.root),'story.html',PUBLISHED,self.path.read_text())

    def test_published_and_generated_changes(self):
        self.commit(ARTICLE,PUBLISHED)
        decorated = ARTICLE.replace('Menu','New navigation').replace('<h1>','<h1 id="generated" style="color:red">').replace('</article>','<!--seo:about--><aside>Updated publisher</aside><!--/seo:about--><!--sd:article-wayfinding--><nav>Contents</nav><!--/sd:article-wayfinding--></article>').replace('</head>','<script src="/new.bundle.js"></script></head>')
        self.commit(decorated,'2026-10-22T23:00:00Z')
        self.assertEqual(self.date(),PUBLISHED)

    def test_real_revision_survives_later_template_commit(self):
        self.commit(ARTICLE,PUBLISHED)
        corrected = ARTICLE.replace('Verified reporting','Corrected reporting')
        self.commit(corrected,'2026-10-10T10:00:00+01:00')
        self.commit(corrected.replace('<h1>','<h1 id="contents-anchor">'),'2026-10-22T10:00:00Z')
        self.assertEqual(self.date(),'2026-10-10T10:00:00+01:00')

    def test_citations_media_and_alt_are_editorial(self):
        for before,after in [('https://example.com/source','https://example.com/correction'),('/photo.jpg','/new.jpg'),('A car','A truck'),('A story','A corrected story')]:
            with self.subTest(after=after):
                self.assertNotEqual(API['signature'](ARTICLE),API['signature'](ARTICLE.replace(before,after)))

    def test_generated_blocks_and_responsive_images_do_not_change_signature(self):
        enriched = ARTICLE.replace('<img ', '<picture><source srcset="/small.avif 480w"><img ').replace('alt="A car">','alt="A car" width="640" loading="lazy"></picture>')
        for start,end in API['BLOCKS']:
            enriched = enriched.replace('</article>',f'<!--{start}--><section>Generated changing content</section><!--{end}--></article>')
        self.assertEqual(API['signature'](ARTICLE),API['signature'](enriched))

    def test_unknown_or_uncommitted_history_has_no_invented_date(self):
        self.path.write_text(ARTICLE); self.assertIsNone(self.date())
        self.commit(ARTICLE,PUBLISHED); self.path.write_text(ARTICLE.replace('Verified','New'))
        API['revision_date'].cache_clear(); self.assertIsNone(self.date())
        self.assertIsNone(API['revision_date'](str(self.root),'story.html','invalid',ARTICLE))

    def test_shallow_history_does_not_claim_original_date(self):
        self.commit(ARTICLE,PUBLISHED)
        (self.root/'.git/shallow').write_bytes(self.git('rev-parse','HEAD').stdout)
        self.assertIsNone(self.date())

    def test_seo_and_contents_styles_keep_a_stable_order(self):
        root=pathlib.Path(__file__).resolve().parents[1]
        seo=runpy.run_path(str(root/'scripts/build-seo.py'))
        way=runpy.run_path(str(root/'scripts/build-wayfinding.py'))
        source='<head>\n    <!--sd:members--><script src="/members.js"></script><!--/sd:members-->\n  </head>'
        source=way['stylesheet'](source,True)
        result=seo['head_block'](source,'\n    <!-- seo:ld --><script type="application/ld+json">{}</script><!-- /seo:ld -->')
        self.assertEqual(way['stylesheet'](result,True),result)

if __name__ == '__main__': unittest.main()

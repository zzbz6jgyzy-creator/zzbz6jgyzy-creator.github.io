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

    def commit(self,source,date,message='Revision'):
        self.path.write_text(source); self.git('add','story.html')
        self.git('commit','-qm',message,env={**os.environ,'GIT_AUTHOR_DATE':date,'GIT_COMMITTER_DATE':date})

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

    def test_reading_toolbar_is_furniture_wherever_it_sits(self):
        tools = '<!--rs:tools--><div class="rs-tools"><span class="rs-time">DISPATCH / About 4 min read</span><button>Share</button></div><!--/rs:tools-->'
        relabelled = tools.replace('<button>Share</button>', '<a>Post on X</a><button>Copy link</button><button>Share…</button>').replace('4 min', '5 min')
        top = ARTICLE.replace('<p class="meta">', tools + '<p class="meta">')
        # A relabelled toolbar is not an edit (the 9 Nov 2026 relabel re-stamped 83 stories)
        self.assertEqual(API['signature'](top), API['signature'](top.replace(tools, relabelled)))
        # Nor is moving it below the lead image, as the redesign does
        self.assertEqual(API['signature'](top), API['signature'](ARTICLE.replace('alt="A car">', 'alt="A car">' + tools)))
        # Real text beside it still is
        self.assertNotEqual(API['signature'](top), API['signature'](top.replace('Verified reporting', 'Corrected reporting')))

    def test_relabelled_toolbar_does_not_restamp_history(self):
        tools = '<!--rs:tools--><div class="rs-tools"><button>Share</button></div><!--/rs:tools-->'
        self.commit(ARTICLE.replace('<p class="meta">', tools + '<p class="meta">'), PUBLISHED)
        self.commit(ARTICLE.replace('<p class="meta">', tools.replace('Share', 'Post on X') + '<p class="meta">'), '2026-11-09T09:10:00Z', 'Reading tools: post on X')
        self.assertEqual(self.date(), PUBLISHED)

    def test_unknown_or_uncommitted_history_has_no_invented_date(self):
        self.path.write_text(ARTICLE); self.assertIsNone(self.date())
        self.commit(ARTICLE,PUBLISHED); self.path.write_text(ARTICLE.replace('Verified','New'))
        API['revision_date'].cache_clear(); self.assertIsNone(self.date())
        self.assertIsNone(API['revision_date'](str(self.root),'story.html','invalid',ARTICLE))

    def test_shallow_history_does_not_claim_original_date(self):
        self.commit(ARTICLE,PUBLISHED)
        (self.root/'.git/shallow').write_bytes(self.git('rev-parse','HEAD').stdout)
        self.assertIsNone(self.date())

    def test_furniture_commits_do_not_move_tracker_dates(self):
        self.assertTrue(API['BOT_SUBJECT'].search('Audit fixes: remove internal notes from HTML'))
        self.assertTrue(API['BOT_SUBJECT'].search('Pre-render homepage headlines, Dispatch and tracker numbers.'))
        self.assertIsNone(API['BOT_SUBJECT'].search('Latvia approves Tesla FSD'))

    def test_redesign_switch_commits_are_presentation(self):
        self.assertTrue(API['BOT_SUBJECT'].search('Switch: plain page titles across the site'))
        self.commit(ARTICLE, PUBLISHED)
        self.commit(ARTICLE.replace('<h1>A story</h1>','<h1>A plain story</h1>'), '2026-11-23T14:02:36Z', 'Switch: plain page titles')
        self.assertEqual(self.date().replace('+00:00', 'Z'), PUBLISHED)

    def merge_branch(self, source, date, subject, merge_date):
        """Commit on a side branch, then merge it into the main line the way a pull request lands."""
        main = self.git('rev-parse','--abbrev-ref','HEAD').stdout.decode().strip()
        self.git('checkout','-qb','topic'); self.commit(source, date, subject); self.git('checkout','-q',main)
        self.git('merge','--no-ff','-qm','Merge pull request #1 from owner/topic','topic',
                 env={**os.environ,'GIT_AUTHOR_DATE':merge_date,'GIT_COMMITTER_DATE':merge_date})

    def test_merged_switch_branch_stays_presentation(self):
        self.commit(ARTICLE, PUBLISHED)
        self.merge_branch(ARTICLE.replace('<h1>A story</h1>','<h1>A plain story</h1>'), '2026-11-23T14:02:36Z',
                          'Switch: plain page titles', '2026-11-24T09:00:00Z')
        self.assertEqual(self.date().replace('+00:00', 'Z'), PUBLISHED)

    def test_merged_editorial_branch_moves_the_date(self):
        self.commit(ARTICLE, PUBLISHED)
        self.merge_branch(ARTICLE.replace('Verified reporting','Corrected reporting'), '2026-11-23T14:02:36Z',
                          'Correct the story', '2026-11-24T09:00:00Z')
        self.assertEqual(self.date().replace('+00:00', 'Z'), '2026-11-24T09:00:00Z')

    def test_audit_fix_commit_does_not_steal_the_revision_date(self):
        self.commit(ARTICLE, PUBLISHED)
        self.commit(ARTICLE.replace('Verified reporting','Corrected reporting'), '2026-10-10T10:00:00Z')
        self.commit(ARTICLE.replace('Verified reporting','Corrected reporting').replace('Menu','Nav'), '2026-10-25T14:44:29Z', 'Audit fixes: remove internal notes')
        self.assertEqual(self.date().replace('+00:00', 'Z'), '2026-10-10T10:00:00Z')

    def test_seo_and_contents_styles_keep_a_stable_order(self):
        root=pathlib.Path(__file__).resolve().parents[1]
        seo=runpy.run_path(str(root/'scripts/build-seo.py'))
        way=runpy.run_path(str(root/'scripts/build-wayfinding.py'))
        source='<head>\n    <!--sd:members--><script src="/members.js"></script><!--/sd:members-->\n  </head>'
        source=way['stylesheet'](source,True)
        result=seo['head_block'](source,'\n    <!-- seo:ld --><script type="application/ld+json">{}</script><!-- /seo:ld -->')
        self.assertEqual(way['stylesheet'](result,True),result)

if __name__ == '__main__': unittest.main()

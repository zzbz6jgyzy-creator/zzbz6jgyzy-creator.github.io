"""Google News redirect links resolve to publisher URLs, use the cache, and fall back safely."""
import importlib.util, json, sys, tempfile, unittest, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
spec = importlib.util.spec_from_file_location("snapshot_news", ROOT / "scripts" / "snapshot-news.py")
sn = importlib.util.module_from_spec(spec); spec.loader.exec_module(sn)
G = "https://news.google.com/rss/articles/{}?oc=5"


class Resolve(unittest.TestCase):
    def run_with(self, items, fetcher, cache=None):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "cache.json"
            if cache is not None:
                path.write_text(json.dumps(cache))
            out = sn.resolve_links(items, fetcher=fetcher, cache_path=path)
            return out, (json.loads(path.read_text()) if path.exists() else {})

    def test_resolves_and_caches(self):
        calls = []
        items = [{"url": G.format("AAA")}, {"url": "https://www.reuters.com/x"}]
        out, cache = self.run_with(items, lambda gid: calls.append(gid) or "https://www.wsj.com/a")
        self.assertEqual(out[0]["url"], "https://www.wsj.com/a")
        self.assertEqual(out[1]["url"], "https://www.reuters.com/x")
        self.assertEqual(calls, ["AAA"]); self.assertEqual(cache["AAA"], "https://www.wsj.com/a")

    def test_cache_hit_needs_no_request(self):
        out, _ = self.run_with([{"url": G.format("BBB")}], lambda gid: self.fail("no request expected"), cache={"BBB": "https://electrek.co/b"})
        self.assertEqual(out[0]["url"], "https://electrek.co/b")

    def test_failure_keeps_google_link_and_429_stops_the_run(self):
        calls = []
        def fetch(gid):
            calls.append(gid)
            raise urllib.error.HTTPError("u", 429, "Too Many Requests", None, None)
        items = [{"url": G.format("C1")}, {"url": G.format("C2")}]
        out, cache = self.run_with(items, fetch)
        self.assertEqual([r["url"] for r in out], [G.format("C1"), G.format("C2")])
        self.assertEqual(calls, ["C1"]); self.assertNotIn("C1", cache)

    def test_parse_rejects_google_and_non_http(self):
        ok = ')]}\'\n[["wrb.fr","Fbv4je","[\\"garturlres\\",\\"https://www.cnbc.com/z\\",1]"]]'
        self.assertEqual(sn.parse_batchexecute(ok), "https://www.cnbc.com/z")
        self.assertEqual(sn.parse_batchexecute(ok.replace("www.cnbc.com", "news.google.com")), "")
        self.assertEqual(sn.parse_batchexecute("nothing"), "")
        self.assertEqual(sn.parse_batchexecute(ok.replace("www.cnbc.com", "www.facebook.com/nytimes/posts")), "")
        self.assertEqual(sn.parse_batchexecute(ok.replace("www.cnbc.com", "x.com")), "")
        self.assertEqual(sn.parse_batchexecute(ok.replace("ftp", "ftp").replace("https://", "javascript:")), "")

    def test_parse_decodes_json_escapes(self):
        raw = ')]}\'\n[["wrb.fr","Fbv4je","[\\"garturlres\\",\\"https://example.com/a?b\\u003d1\\u0026c\\u003d2\\",1]"]]'
        self.assertEqual(sn.parse_batchexecute(raw), "https://example.com/a?b=1&c=2")


if __name__ == "__main__":
    unittest.main()

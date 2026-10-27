"""The shared SEO refresh must not replace the FSD tracker's reviewed structured data."""
import runpy, tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
module = runpy.run_path(str(ROOT / 'scripts/build-seo.py'))
assert 'fsd-tracker.html' not in module['PAGE_TYPES']
with tempfile.TemporaryDirectory() as tmp:
    page = Path(tmp) / 'fsd-tracker.html'
    saved = (ROOT / 'fsd-tracker.html').read_text()
    page.write_text(saved)
    module['pages'].__globals__['ROOT'] = tmp
    module['pages']()
    assert page.read_text() == saved
print('Shared SEO refresh preserves the reviewed FSD tracker graph.')

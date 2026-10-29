#!/usr/bin/env python3
"""Create the vendored Earth texture tiers from attributed public source imagery.

Network is used only for a missing tier. --export-generated emits the exact new
files as base64 in read-only CI so they can be reviewed and committed normally.
No credentials, API keys, repository writes or live telemetry are used.
"""
import argparse
import base64
import hashlib
import io
import json
import math
import pathlib
import time
import urllib.error
import urllib.request
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/earth'
Image.MAX_IMAGE_PIXELS = 300_000_000  # Known NASA 21600×10800 JPEG master.
SOURCES = {
 'day': {
  'urls': [
   'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/july/world.200407.3x21600x10800.jpg',
  ],
  'minimum_width': 8192,
  'tiers': [2048, 4096, 8192],
  'credit': 'NASA Earth Observatory / Reto Stöckli, Blue Marble: Next Generation, July 2004 composite',
 },
 'night': {
  'urls': [
   'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144898/BlackMarble_2016_3km.jpg',
   'https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_3km.jpg',
  ],
  'minimum_width': 4096,
  'tiers': [2048, 4096],
  'credit': 'NASA Earth Observatory / Joshua Stevens, Suomi NPP VIIRS data from Miguel Román, NASA GSFC; Black Marble 2016 composite',
 },
 'clouds': {
  'urls': [
   'https://www.solarsystemscope.com/textures/download/8k_earth_clouds.jpg',
   'https://raw.githubusercontent.com/Siqister/files/2ed70f6955b88070080e21067568c233a50856ec/8k_earth_clouds.jpg',
  ],
  'minimum_width': 4096,
  'tiers': [2048, 4096],
  'credit': 'Solar System Scope / INOVE, Earth clouds texture, CC BY 4.0; NASA-derived composite',
 },
}

def download(url):
 # Trusted URLs are fixed above. TLS verification and normal proxy settings stay enabled.
 request = urllib.request.Request(url, headers={'User-Agent': 'SuperchargedDaily-EarthAssets/1.0'})
 for attempt in range(2):
  try:
   with urllib.request.urlopen(request, timeout=35) as response:
    data = response.read(55 * 1024 * 1024 + 1)
   if len(data) > 55 * 1024 * 1024:
    raise ValueError('Source exceeds 55 MiB asset limit')
   return data
  except (urllib.error.URLError, TimeoutError):
   if attempt: raise
   time.sleep(1)

def texture(kind, source, generated):
 files = [OUT / f'earth-{kind}-{width//1024}k.webp' for width in source['tiers']]
 if all(path.is_file() for path in files): return
 last = None
 for url in source['urls']:
  try:
   image = Image.open(io.BytesIO(download(url)))
   original = image.size
   if original[0] < source['minimum_width'] or original[0] != 2 * original[1]:
    raise ValueError(f'Unexpected source dimensions: {original}')
   image.draft('RGB', (max(source['tiers']), max(source['tiers'])//2))
   image = image.convert('L' if kind == 'clouds' else 'RGB')
   for width, path in zip(source['tiers'], files):
    tier = image.resize((width, width//2), Image.Resampling.LANCZOS)
    tier.save(path, 'WEBP', quality=88 if kind == 'clouds' else 91, method=6)
    generated.add(path)
   print(f'EARTH_SOURCE {kind} {original[0]}x{original[1]} {url}', flush=True)
   return
  except (urllib.error.URLError, TimeoutError, OSError, ValueError) as error:
   last = error
   print(f'EARTH_SOURCE_RETRY {kind} {type(error).__name__}: {error}', flush=True)
 raise RuntimeError(f'Could not prepare {kind} from its documented sources: {last}')

def poster(generated):
 path = OUT / 'earth-poster.webp'
 if path.is_file(): return
 day = Image.open(OUT/'earth-day-4k.webp').convert('RGB'); day_pixels = day.load()
 cloud = Image.open(OUT/'earth-clouds-2k.webp').convert('L'); cloud_pixels = cloud.load()
 # Original orthographic rendering of the source maps. This is not a photograph.
 size = 1100; radius = size * .437
 result = Image.new('RGB', (size,size), (3,6,12)); pixels = result.load()
 latitude, longitude = math.radians(16), math.radians(18)
 slat,clat,slon,clon = math.sin(latitude),math.cos(latitude),math.sin(longitude),math.cos(longitude)
 sun = (-.64,.32,.70); length = math.sqrt(sum(v*v for v in sun)); sun = tuple(v/length for v in sun)
 for py in range(size):
  y = (size/2-py)/radius
  for px in range(size):
   x = (px-size/2)/radius; r2 = x*x+y*y
   if r2 > 1.065: continue
   if r2 >= 1:
    glow = max(0,1-(math.sqrt(r2)-1)/.032)**2
    pixels[px,py] = (int(3+12*glow),int(6+55*glow),int(12+95*glow)); continue
   z = math.sqrt(1-r2)
   wx = x*clon-y*slat*slon+z*clat*slon
   wy = y*clat+z*slat
   wz = -x*slon-y*slat*clon+z*clat*clon
   u = (.5+math.atan2(wx,wz)/(2*math.pi))%1
   v = .5-math.asin(max(-1,min(1,wy)))/math.pi
   rgb = day_pixels[min(day.width-1,int(u*day.width)),min(day.height-1,int(v*day.height))]
   alpha = (cloud_pixels[min(cloud.width-1,int(u*cloud.width)),min(cloud.height-1,int(v*cloud.height))]/255)**1.7*.88
   light = max(0,x*sun[0]+y*sun[1]+z*sun[2]); shade=.055+.945*light**.72
   rim = (1-z)**4 * (.25+.75*light)
   values = [min(255,int(((channel*(1-alpha)+240*alpha)*shade)+rim*glow)) for channel,glow in zip(rgb,(15,70,130))]
   pixels[px,py] = tuple(values)
 result.save(path,'WEBP',quality=90,method=6); generated.add(path)

def manifest(generated):
 items=[]
 for path in sorted(OUT.glob('*.webp')):
  with Image.open(path) as image: width,height=image.size
  data=path.read_bytes()
  items.append({'file':'/assets/earth/'+path.name,'width':width,'height':height,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
  print(f'EARTH_ASSET_INFO {path.name} {width}x{height} {len(data)} bytes',flush=True)
 path=OUT/'manifest.json'; content=json.dumps({'schema':1,'assets':items},indent=2)+'\n'
 if not path.exists() or path.read_text()!=content:
  path.write_text(content);generated.add(path)

def verify():
 recorded=json.loads((OUT/'manifest.json').read_text())
 entries={entry['file']:entry for entry in recorded['assets']}
 expected={f'earth-{kind}-{width//1024}k.webp':(width,width//2) for kind,source in SOURCES.items() for width in source['tiers']}
 expected['earth-poster.webp']=(1100,1100)
 for name,size in expected.items():
  path=OUT/name;entry=entries['/assets/earth/'+name]
  with Image.open(path) as image:
   assert image.size==size and image.format=='WEBP',f'Unexpected image: {name}'
  data=path.read_bytes()
  assert (entry['width'],entry['height'])==size and entry['bytes']==len(data),f'Incorrect dimensions/size: {name}'
  assert entry['sha256']==hashlib.sha256(data).hexdigest(),f'Checksum mismatch: {name}'
 print(f'Verified {len(expected)} vendored Earth images, including an 8192x4096 surface.',flush=True)

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--export-generated',action='store_true');parser.add_argument('--poster-only',action='store_true');parser.add_argument('--check',action='store_true');args=parser.parse_args()
 if args.check:
  verify();return
 OUT.mkdir(parents=True,exist_ok=True);generated=set()
 try:
  if not args.poster_only:
   for kind,source in SOURCES.items(): texture(kind,source,generated)
  poster(generated);manifest(generated)
 finally:
  # Preserve exact successful derivatives if a later source is temporarily unavailable.
  # A preparation failure still raises and fails CI; no checks are skipped or relaxed.
  if args.export_generated:
   for path in sorted(generated):
    print('EARTH_ASSET '+str(path.relative_to(ROOT))+' '+base64.b64encode(path.read_bytes()).decode(),flush=True)

if __name__=='__main__':main()

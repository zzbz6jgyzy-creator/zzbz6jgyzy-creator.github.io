#!/usr/bin/env python3
"""Build attributed, pinned cosmic imagery and a compact HYG catalogue; no runtime API keys."""
import argparse,concurrent.futures,csv,hashlib,io,json,pathlib,urllib.request
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'assets/cosmos';OUT.mkdir(parents=True,exist_ok=True)
Image.MAX_IMAGE_PIXELS=300_000_000
SOURCES={
 'earth-day-16k.jpg':('https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/july/world.200407.3x21600x10800.jpg',16384,'NASA Earth Observatory / Reto Stöckli, Blue Marble July 2004'),
 'earth-night-8k.webp':('https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144898/BlackMarble_2016_3km.jpg',8192,'NASA Earth Observatory / Joshua Stevens; VIIRS / Miguel Román; 2016'),
 'earth-normal-4k.webp':('https://www.solarsystemscope.com/textures/download/8k_earth_normal_map.tif',4096,'Solar System Scope / INOVE, CC BY 4.0; NASA-derived'),
 'earth-specular-4k.webp':('https://www.solarsystemscope.com/textures/download/8k_earth_specular_map.tif',4096,'Solar System Scope / INOVE, CC BY 4.0; NASA-derived'),
 'milky-way-4k.webp':('https://cdn.eso.org/images/large/eso0932a.jpg',4096,'ESO/S. Brunier, CC BY 4.0; 2009 photographic panorama'),
 'moon-4k.webp':('https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_16bit_srgb_4k.tif',4096,"NASA's Scientific Visualization Studio / LRO / LROC / ASU; 2025 map"),
}
for body,filename in [('mercury','mercury'),('venus','venus_atmosphere'),('mars','mars'),('jupiter','jupiter'),('saturn','saturn'),('uranus','uranus'),('neptune','neptune'),('sun','sun')]:SOURCES[body+'-2k.webp']=('https://www.solarsystemscope.com/textures/download/2k_'+filename+'.jpg',2048,'Solar System Scope / INOVE, CC BY 4.0; NASA-derived; enhanced/filled maps')
SOURCES['saturn-rings.webp']=('https://www.solarsystemscope.com/textures/download/2k_saturn_ring_alpha.png',2048,'Solar System Scope / INOVE, CC BY 4.0')

def get(url,limit=350_000_000):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'SuperchargedDaily-SpaceExplorer/1.0'}),timeout=100) as r:b=r.read(limit+1)
 if len(b)>limit:raise ValueError('Source exceeds bounded download limit')
 return b

def image(item):
 name,(url,width,credit)=item;path=OUT/name
 if path.exists():return
 b=get(url);im=Image.open(io.BytesIO(b));original=im.size
 if original[0]<width:raise ValueError('Refusing to upscale '+name+': '+str(original))
 # 16-bit NASA RGB TIFF is converted by Pillow through its embedded RGB representation.
 im=im.convert('RGBA' if 'rings' in name else 'RGB')
 if 'rings' not in name and abs(im.width/im.height-2)>.05:raise ValueError('Not a spherical texture: '+name+str(original))
 height=round(im.height*width/im.width);im=im.resize((width,height),Image.Resampling.LANCZOS)
 if path.suffix=='.jpg':im.save(path,'JPEG',quality=94,optimize=True,subsampling=0)
 else:im.save(path,'WEBP',quality=93 if 'normal' in name else 92,method=6)
 print('COSMOS_SOURCE',name,original,im.size,len(path.read_bytes()),credit,url,flush=True)

def stars():
 path=OUT/'stars.json'
 if path.exists():return
 url='https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv'
 rows=[]
 for r in csv.DictReader(io.StringIO(get(url,50_000_000).decode('utf-8-sig'))):
  try:
   dist=float(r['dist']);mag=float(r['mag'])
   if r['id']=='0' or dist<=0 or dist>=100000 or (mag>6.5 and dist>40):continue
   def num(k):return round(float(r[k] or '0'),8)
   rows.append([int(r['id']),num('x'),num('y'),num('z'),num('vx'),num('vy'),num('vz'),mag,num('absmag'),float(r['ci']) if r['ci'] else .65,r['proper'] or '',dist])
  except (ValueError,KeyError):continue
 if len(rows)<6000:raise ValueError('Incomplete star catalogue')
 data={'schema':1,'epoch':2000,'equinox':'J2000','units':'parsecs; velocity parsecs/year','columns':['hyg_id','x','y','z','vx','vy','vz','magnitude','absolute_magnitude','B-V','name','distance_pc'],'source':url,'credit':'HYG v4.1, David Nash / Astronomy Nexus; Hipparcos, Yale Bright Star, Gliese','licence':'CC BY-SA 4.0','licence_url':'https://creativecommons.org/licenses/by-sa/4.0/','modifications':'Selected magnitude <=6.5 or distance <=40 pc; excluded unknown/dubious distances >=100000 pc; selected columns, numeric rounding.','stars':rows}
 path.write_text(json.dumps(data,separators=(',',':'))+'\n');print('COSMOS_CATALOGUE',len(rows),len(path.read_bytes()),flush=True)

def vendor():
 folder=ROOT/'vendor/astronomy';folder.mkdir(parents=True,exist_ok=True)
 for name,url in [('astronomy.js','https://raw.githubusercontent.com/cosinekitty/astronomy/v2.1.19/source/js/esm/astronomy.js'),('LICENSE','https://raw.githubusercontent.com/cosinekitty/astronomy/v2.1.19/LICENSE')]:
  (folder/name).write_bytes(get(url,2_000_000))

def manifest():
 rows=[]
 for p in sorted(OUT.iterdir()):
  if p.name=='manifest.json' or p.suffix not in ['.webp','.jpg','.json']:continue
  b=p.read_bytes();entry={'file':p.name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
  if p.suffix in ['.webp','.jpg']:
   with Image.open(p) as im:entry.update({'width':im.width,'height':im.height})
   source=SOURCES[p.name];entry.update({'source':source[0],'credit':source[2],'processing':'Resized with Lanczos; WebP conversion. No image generation.'})
  rows.append(entry)
 (OUT/'manifest.json').write_text(json.dumps({'schema':1,'assets':rows},indent=2)+'\n')

def check():
 data=json.loads((OUT/'manifest.json').read_text());seen=set()
 for r in data['assets']:
  p=OUT/r['file'];b=p.read_bytes();assert len(b)==r['bytes'] and hashlib.sha256(b).hexdigest()==r['sha256'],p.name
  if p.suffix in ['.webp','.jpg']:
   with Image.open(p) as im:assert im.size==(r['width'],r['height']) and im.format in ['WEBP','JPEG']
  seen.add(p.name)
 assert set(SOURCES)|{'stars.json'}<=seen
 print('Verified cosmic source dimensions and checksums:',len(seen))

def weather_probe():
 url='https://clouds.matteason.co.uk/images/4096x2048/clouds.jpg'
 with urllib.request.urlopen(urllib.request.Request(url,headers={'Origin':'https://superchargeddaily.com','User-Agent':'SuperchargedDaily-SpaceExplorer/1.0'}),timeout=30) as r:
  b=r.read(10_000_000);im=Image.open(io.BytesIO(b));print('WEATHER_AUDIT',json.dumps({'http':r.status,'cors':r.headers.get('Access-Control-Allow-Origin'),'modified':r.headers.get('Last-Modified'),'date':r.headers.get('Date'),'etag':r.headers.get('ETag'),'dimensions':im.size,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'note':'HTTP Date is retrieval time, not observation time.'}),flush=True)

if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--check',action='store_true');ap.add_argument('--weather-probe',action='store_true');args=ap.parse_args()
 if args.check:check()
 else:
  with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(image,SOURCES.items()))
  stars();vendor();manifest();check()
 if args.weather_probe:weather_probe()

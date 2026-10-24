#!/usr/bin/env python3
"""Prepare local city search and map geometry from public, attributed datasets.
No runtime API, secret or third-party geocoder. See docs/launch-viewing.md.
"""
import argparse,json,pathlib,zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--cities',required=True,help='GeoNames cities15000.zip');parser.add_argument('--world',required=True,help='Natural Earth ne_110m_admin_0_countries.geojson');parser.add_argument('--as-of',required=True,help='Download date YYYY-MM-DD');args=parser.parse_args()
def compact(x):
 if isinstance(x,list):return [compact(y)for y in x]
 return round(x,2)if isinstance(x,float)else x
raw=json.loads(pathlib.Path(args.world).read_text());world={'type':'FeatureCollection','features':[{'type':'Feature','properties':{},'geometry':{'type':f['geometry']['type'],'coordinates':compact(f['geometry']['coordinates'])}}for f in raw['features']]};rows=[]
with zipfile.ZipFile(args.cities)as z:
 for line in z.read('cities15000.txt').decode().splitlines():
  c=line.split('\t')
  if len(c)<19:continue
  pop=int(c[14]or'0')
  if pop<50000 and c[7]!='PPLC' and not(c[8]=='US'and c[10]in ['CA','FL','TX']):continue
  rows.append([c[1],c[8],round(float(c[4]),4),round(float(c[5]),4),c[17],pop,c[2],c[10]])
rows.sort(key=lambda c:(-c[5],c[0]));cities={'version':1,'source':'https://download.geonames.org/export/dump/','license':'CC BY 4.0','asOf':args.as_of,'columns':['name','country','latitude','longitude','timeZone','population','asciiName','admin1Code'],'cities':rows}
# Validate before replacing the installed public assets.
if len(world['features'])<100 or len(rows)<1000:raise ValueError('Incomplete source dataset')
folder=ROOT/'data/viewing';folder.mkdir(parents=True,exist_ok=True)
for name,value in [('world.json',world),('cities.json',cities)]:
 target=folder/name;temp=target.with_suffix('.tmp');temp.write_text(json.dumps(value,separators=(',',':'),ensure_ascii=name!='cities.json')+'\n');temp.replace(target)
print(f'Prepared {len(rows)} cities and {len(world["features"])} map features')

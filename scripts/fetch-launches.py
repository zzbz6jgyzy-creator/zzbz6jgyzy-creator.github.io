#!/usr/bin/env python3
"""One cached SpaceX request per refresh; keep the last file on bad upstream data.

The v2.3 adapter preserves the existing compact shape used by other site pages.
No browser needs to call the rate-limited provider for the new calendar.
"""
import argparse, datetime, json, os, pathlib, sys, urllib.request
URL='https://ll.thespacedevs.com/2.3.0/launches/upcoming/?lsp__name=SpaceX&limit=40&mode=normal'
OUT=pathlib.Path(__file__).resolve().parents[1]/'data/launches.json'
KEEP=('id','name','net','window_start','window_end','url')

def parse(value):
    try:
        date=datetime.datetime.fromisoformat(str(value).replace('Z','+00:00'))
        return date if date.tzinfo else None
    except (ValueError,TypeError): return None

def skip_launch(row, now):
    status=(row.get('status')or{}).get('abbrev')or''
    precision=(row.get('net_precision')or{}).get('abbrev')or''
    timed=precision in ('SEC','MIN','')
    if status=='Hold' or status=='TBD' and timed:return True
    date=parse(row.get('net'))
    return bool(date and timed and status not in ('In Flight','Success') and now-date>datetime.timedelta(minutes=30))

def normalize(data, now):
    if not isinstance(data,dict) or not isinstance(data.get('results'),list) or not data['results']:raise ValueError('Missing launch results')
    rows=[];seen=set()
    for item in data['results']:
        if not isinstance(item,dict) or not item.get('id') or item['id'] in seen or not isinstance(item.get('name'),str) or not parse(item.get('net')):raise ValueError('Invalid or duplicate launch record')
        provider=item.get('launch_service_provider')or{}
        if provider.get('name') and provider['name']!='SpaceX':raise ValueError('Unexpected provider in SpaceX feed')
        if not isinstance(item.get('status'),dict) or not item['status'].get('abbrev'):raise ValueError('Missing launch status')
        seen.add(item['id'])
        if skip_launch(item,now):continue
        row={key:item.get(key)for key in KEEP}
        row['status']={key:item['status'].get(key)for key in ('name','abbrev')}
        precision=item.get('net_precision')or{}
        row['net_precision']={key:precision.get(key)for key in ('name','abbrev')}
        pad=item.get('pad')or{}
        row['pad']={'name':pad.get('name'),'location':{'name':(pad.get('location')or{}).get('name')}}
        if item.get('last_updated'):row['last_updated']=item['last_updated']
        mission=item.get('mission')or{}
        if mission:row['mission']={'name':mission.get('name'),'type':mission.get('type'),'orbit':{'name':(mission.get('orbit')or{}).get('name'),'abbrev':(mission.get('orbit')or{}).get('abbrev')}}
        configuration=(item.get('rocket')or{}).get('configuration')or{}
        if configuration.get('full_name'):row['vehicle']=configuration['full_name']
        rows.append(row)
    if not rows:raise ValueError('No usable launches; previous snapshot retained')
    return rows

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--input');parser.add_argument('--output',default=str(OUT));args=parser.parse_args()
    try:
        if args.input:data=json.loads(pathlib.Path(args.input).read_text())
        else:
            request=urllib.request.Request(URL,headers={'User-Agent':'superchargeddaily.com launch refresh'})
            with urllib.request.urlopen(request,timeout=30)as response:data=json.load(response)
        now=datetime.datetime.now(datetime.timezone.utc);rows=normalize(data,now);stamp=now.strftime('%Y-%m-%dT%H:%M:%SZ')
        out={'_about':'SpaceX launch snapshot from The Space Devs / Launch Library 2 v2.3. Refreshed hourly by launches-refresh.yml. Targets may change; this is not live telemetry.','source':URL,'updated':stamp,'checked':stamp,'results':rows}
        target=pathlib.Path(args.output);temp=target.with_suffix('.tmp');temp.write_text(json.dumps(out,indent=1,ensure_ascii=False)+'\n');temp.replace(target)
        print(f'Validated {len(rows)} launches; source checked {stamp}');return 0
    except Exception as error:
        print('Launch refresh failed; previous file retained:',error,file=sys.stderr);return 1
if __name__=='__main__':sys.exit(main())

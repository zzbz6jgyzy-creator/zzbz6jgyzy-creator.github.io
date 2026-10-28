#!/usr/bin/env python3
"""Cached SpaceX upcoming + recent previous launches; keep the last file on bad upstream data.

The v2.3 adapter preserves the existing compact shape used by other site pages.
No browser needs to call the rate-limited provider for the new calendar.
Upcoming is one call; previous is one extra call per run (LL2 free limit is 15/hour).
"""
import argparse, datetime, json, pathlib, sys, urllib.request
UPCOMING='https://ll.thespacedevs.com/2.3.0/launches/upcoming/?lsp__name=SpaceX&limit=40&mode=normal'
PREVIOUS='https://ll.thespacedevs.com/2.3.0/launches/previous/?lsp__name=SpaceX&limit=15&mode=list'
OUT=pathlib.Path(__file__).resolve().parents[1]/'data/launches.json'
KEEP=('id','name','net','window_start','window_end','url')
KEEP_DAYS=45
TERMINAL=('In Flight','Success','Failure','Partial Failure')
RANK={'Success':4,'Failure':4,'Partial Failure':4,'In Flight':3,'Go':2}

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
    if date and now-date>datetime.timedelta(days=KEEP_DAYS):return True
    return bool(date and timed and status not in TERMINAL and now-date>datetime.timedelta(minutes=30))

def compact(item):
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
    if item.get('vehicle'):row['vehicle']=item['vehicle']
    return row

def normalize(data, now, allow_empty=False):
    if not isinstance(data,dict) or not isinstance(data.get('results'),list):raise ValueError('Missing launch results')
    if not data['results']:
        if allow_empty:return []
        raise ValueError('Missing launch results')
    rows=[];seen=set()
    for item in data['results']:
        if not isinstance(item,dict) or not item.get('id') or item['id'] in seen or not isinstance(item.get('name'),str) or not parse(item.get('net')):raise ValueError('Invalid or duplicate launch record')
        provider=item.get('launch_service_provider')or{}
        if provider.get('name') and provider['name']!='SpaceX':raise ValueError('Unexpected provider in SpaceX feed')
        if not isinstance(item.get('status'),dict) or not item['status'].get('abbrev'):raise ValueError('Missing launch status')
        seen.add(item['id'])
        if skip_launch(item,now):continue
        rows.append(compact(item))
    if not rows and not allow_empty:raise ValueError('No usable launches; previous snapshot retained')
    return rows

def rank(row):
    return RANK.get((row.get('status')or{}).get('abbrev'),1)

def merge_rows(*groups):
    by_id={}
    for rows in groups:
        for row in rows:
            prev=by_id.get(row['id'])
            if not prev or rank(row)>=rank(prev):by_id[row['id']]=row
    return sorted(by_id.values(),key=lambda row:row.get('net') or '')

def fetch(url):
    request=urllib.request.Request(url,headers={'User-Agent':'superchargeddaily.com launch refresh'})
    with urllib.request.urlopen(request,timeout=30)as response:return json.load(response)

def cached_rows(path, now):
    try:
        data=json.loads(pathlib.Path(path).read_text())
        return normalize(data,now,allow_empty=True)
    except Exception:
        return []

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--input');parser.add_argument('--previous-input');parser.add_argument('--output',default=str(OUT));args=parser.parse_args()
    try:
        now=datetime.datetime.now(datetime.timezone.utc)
        if args.input:upcoming=json.loads(pathlib.Path(args.input).read_text())
        else:upcoming=fetch(UPCOMING)
        rows=normalize(upcoming,now)
        previous_rows=[]
        try:
            previous=json.loads(pathlib.Path(args.previous_input).read_text()) if args.previous_input else (None if args.input else fetch(PREVIOUS))
            if previous is not None:previous_rows=normalize(previous,now,allow_empty=True)
        except Exception as error:
            print('Previous-launch refresh failed; upcoming kept:',error,file=sys.stderr)
        target=pathlib.Path(args.output)
        rows=merge_rows(cached_rows(target,now),rows,previous_rows)
        if not rows:raise ValueError('No usable launches; previous snapshot retained')
        stamp=now.strftime('%Y-%m-%dT%H:%M:%SZ')
        out={
            '_about':'SpaceX launch snapshot from The Space Devs / Launch Library 2 v2.3 (upcoming plus the last ~45 days of previous launches). Refreshed hourly by launches-refresh.yml. Targets may change; this is not live telemetry.',
            'source':UPCOMING,
            'previousSource':PREVIOUS,
            'updated':stamp,
            'checked':stamp,
            'results':rows
        }
        temp=target.with_suffix('.tmp');temp.write_text(json.dumps(out,indent=1,ensure_ascii=False)+'\n');temp.replace(target)
        print(f'Validated {len(rows)} launches; source checked {stamp}');return 0
    except Exception as error:
        print('Launch refresh failed; previous file retained:',error,file=sys.stderr);return 1
if __name__=='__main__':sys.exit(main())

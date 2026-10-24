#!/usr/bin/env python3
"""Save only Tesla certification records from the public FuelEconomy.gov CSV.

No owner data is read or sent. A failed/empty download never replaces the saved data.
"""
import argparse, csv, datetime, io, json, pathlib, urllib.request, zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
URL = 'https://www.fueleconomy.gov/feg/epadata/vehicles.csv.zip'
FAMILIES = {'Model 3': '3', 'Model Y': 'Y', 'Model S': 'S', 'Model X': 'X', 'Cybertruck': 'CT'}

def transform(blob, checked):
    with zipfile.ZipFile(io.BytesIO(blob)) as archive:
        with archive.open('vehicles.csv') as file:
            rows = csv.DictReader(io.TextIOWrapper(file, encoding='utf-8-sig'))
            vehicles = []
            for row in rows:
                if row['make'] != 'Tesla' or row['baseModel'] not in FAMILIES or row['fuelType1'] != 'Electricity':
                    continue
                record = {'id': row['id'], 'model': FAMILIES[row['baseModel']], 'year': int(row['year']), 'label': row['model'], 'drive': row['drive'], 'rangeMiles': float(row['range']), 'kwh100Miles': float(row['combE']), 'cityRangeMiles': float(row['rangeCity']), 'highwayRangeMiles': float(row['rangeHwy']), 'mpge': int(row['comb08'])}
                if not record['id'].isdigit() or not 2008 <= record['year'] <= 2100 or not 10 < record['rangeMiles'] < 1000 or not 5 < record['kwh100Miles'] < 200:
                    raise ValueError('Invalid Tesla certification record')
                vehicles.append(record)
    vehicles.sort(key=lambda row: (row['model'], -row['year'], row['label'], row['id']))
    if len(vehicles) < 100 or len({v['id'] for v in vehicles}) != len(vehicles):
        raise ValueError('Incomplete or duplicate EPA records; saved data retained')
    return {'schema': 1, 'checkedAt': checked, 'source': 'FuelEconomy.gov / US EPA and Department of Energy', 'sourceUrl': 'https://www.fueleconomy.gov/feg/download.shtml', 'market': 'US', 'note': 'US certification records, not WLTP, observed driving range or a battery-health measurement. Match the original model year, variant and wheels; registration year alone is insufficient. EPA energy consumption includes charging losses.', 'vehicles': vehicles}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--input'); parser.add_argument('--checked', default=datetime.datetime.now(datetime.timezone.utc).date().isoformat()); args = parser.parse_args()
    if args.input:
        blob = pathlib.Path(args.input).read_bytes()
    else:
        with urllib.request.urlopen(urllib.request.Request(URL, headers={'User-Agent': 'SuperchargedDaily-EPA-Snapshot/1.0'}), timeout=60) as response:
            blob = response.read(12 * 1024 * 1024 + 1)
        if len(blob) > 12 * 1024 * 1024:
            raise ValueError('EPA archive unexpectedly large; saved data retained')
    data = transform(blob, args.checked)
    target = ROOT / 'data/my-tesla-epa.json'; temporary = target.with_suffix('.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n'); temporary.replace(target)
    print(f"Saved {len(data['vehicles'])} Tesla EPA records; checked {data['checkedAt']}")

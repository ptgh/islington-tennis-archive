#!/usr/bin/env python3
"""Add sourced surface railway corridors to the London club geography.

python3 scripts/fetch-iconic-railways.py
The mapped venue extracts stopped short of the real railway lines, so the
surface tracks around Wimbledon and Queen's Club are fetched separately from
Overpass (railway=rail only; underground and covered tube lines are omitted)
and merged into src/data/iconic-geography.json as a `railways` array per
venue. Existing features, trees and metadata are preserved untouched.
"""
import json, math, time, urllib.request, urllib.parse
from datetime import date
from pathlib import Path

TARGET = Path(__file__).resolve().parents[1] / 'src/data/iconic-geography.json'
CLUBS = {'wimbledon': (-0.2143, 51.434), 'queens': (-0.2115, 51.4876)}
REACH = 1050  # metres, inside the drawn ±1100 ground plane
QUERY = """[out:json][timeout:60];(way["railway"="rail"]("%f","%f","%f","%f"););out geom;"""


ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter',
             'https://overpass.private.coffee/api/interpreter']


def fetch(name, lon, lat):
    radius = 0.011
    bbox = (lat - radius, lon - radius, lat + radius, lon + radius)
    query = QUERY % bbox
    for endpoint in ENDPOINTS:
        for attempt in range(3):
            url = endpoint + '?data=' + urllib.parse.quote(query)
            request = urllib.request.Request(url, headers={'User-Agent': 'islingtontennis-scene/1.0 (railway extract)'})
            try:
                return json.load(urllib.request.urlopen(request, timeout=90))
            except Exception as error:
                print(f'{name}: retry {attempt} on {endpoint}: {error}')
                time.sleep(6)
    raise SystemExit(f'{name}: Overpass unavailable')


def merge(data, name, lon, lat):
    scale_x = 111320 * math.cos(math.radians(lat))
    existing = {f['id'] for f in data.get('features', [])} | {w['id'] for w in data.get('railways', [])}
    ways = []
    for element in fetch(name, lon, lat).get('elements', []):
        tags = element.get('tags', {})
        if tags.get('railway') != 'rail' or tags.get('tunnel') == 'yes':
            continue
        if element.get('id') in existing:
            continue
        points = []
        for point in element.get('geometry', []):
            x = (point['lon'] - lon) * scale_x
            z = -(point['lat'] - lat) * 111320
            if abs(x) <= REACH and abs(z) <= REACH:
                points.append([round(x, 2), round(z, 2)])
            elif points:
                break  # keep the first contiguous stretch inside the drawn ground
        if len(points) >= 2:
            ways.append({'id': element['id'], 'tags': {'railway': 'rail', 'name': tags.get('name', ''),
                        'usage': tags.get('usage', '')}, 'points': points})
    return ways


if __name__ == '__main__':
    geography = json.loads(TARGET.read_text())
    for venue, (lon, lat) in CLUBS.items():
        data = geography[venue]
        data['railways'] = merge(data, venue, lon, lat)
        data['railwaySource'] = 'https://overpass-api.de/api/interpreter'
        data['railwaysImportedAt'] = date.today().isoformat()
        note = 'Surface railway ways are sourced from Overpass and drawn at ground level; underground and covered tube lines are omitted.'
        if note not in data['notes']:
            data['notes'] = data['notes'] + ' ' + note
        print(venue, len(data['railways']), 'railway ways')
    TARGET.write_text(json.dumps(geography, separators=(',', ':')) + '\n')
    print(TARGET.stat().st_size, 'bytes')

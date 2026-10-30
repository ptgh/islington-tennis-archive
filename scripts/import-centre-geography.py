#!/usr/bin/env python3
"""Import the bounded Tennis Centre neighbourhood from a public OSM map XML.

curl -fL 'https://api.openstreetmap.org/api/0.6/map?bbox=-0.125,51.543,-0.117,51.549' -o /tmp/centre-osm.xml
python3 scripts/import-centre-geography.py /tmp/centre-osm.xml
Only rendering geometry and source IDs are retained, not contributor/address metadata.
Heights are illustrative defaults; the indoor hall does not imply mapped indoor courts.
"""
import json, sys, xml.etree.ElementTree as ET
from pathlib import Path

BBOX = [-.125, 51.543, -.117, 51.549]
root = ET.parse(sys.argv[1]).getroot()
nodes = {n.get('id'): [float(n.get('lon')), float(n.get('lat'))] for n in root.findall('node')}
def tags(e): return {t.get('k'): t.get('v') for t in e.findall('tag')}
def inside(p): return BBOX[0] <= p[0] <= BBOX[2] and BBOX[1] <= p[1] <= BBOX[3]
data = dict(source='https://api.openstreetmap.org/api/0.6/map?bbox=' + ','.join(map(str, BBOX)), checked='2026-10-30', bbox=BBOX, roads=[], parks=[], buildings=[], courts=[], trees=[])
for way in root.findall('way'):
    refs = [n.get('ref') for n in way.findall('nd')]
    if any(ref not in nodes for ref in refs): continue
    points = [nodes[ref] for ref in refs]
    if len(points) < 2 or not any(map(inside, points)): continue
    t, ident = tags(way), int(way.get('id'))
    closed = len(points) >= 4 and refs[0] == refs[-1]
    if t.get('highway') and t.get('area') != 'yes':
        data['roads'].append(dict(id=ident, name=t.get('name', ''), kind=t['highway'], points=points))
    if closed and t.get('building') and t['building'] != 'no':
        data['buildings'].append(dict(id=ident, points=points, height=.96))
    if closed and (t.get('leisure') in ('park', 'garden') or t.get('landuse') in ('grass', 'village_green') or t.get('natural') == 'grassland'):
        data['parks'].append(points)
    if closed and t.get('sport') == 'tennis' and t.get('leisure') == 'pitch' and not t.get('building'):
        data['courts'].append(dict(id=ident, points=points, lit=t.get('lit') == 'yes'))
for node in root.findall('node'):
    if tags(node).get('natural') == 'tree' and inside(nodes[node.get('id')]): data['trees'].append(nodes[node.get('id')])
assert {c['id'] for c in data['courts']} == {161419463, 161419464}, 'Inspect changed source court coverage before importing'
assert any(b['id'] == 30198196 for b in data['buildings']), 'Centre hall footprint missing'
Path('src/data/centre-geography.json').write_text(json.dumps(data, separators=(',', ':')) + '\n')
print({key: len(data[key]) for key in ('roads', 'parks', 'buildings', 'courts', 'trees')})

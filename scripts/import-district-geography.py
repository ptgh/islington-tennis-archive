#!/usr/bin/env python3
"""Build the Caledonian accuracy pilot from a saved OSM API map extract.

Download (once, outside the app):
  curl 'https://api.openstreetmap.org/api/0.6/map?bbox=-0.129,51.543,-0.113,51.551' -o /tmp/caledonian.osm
Then: python3 scripts/import-district-geography.py /tmp/caledonian.osm
Only rendering tags are retained. Coordinates remain WGS84; one shared projection
in the renderer gives all streets, footprints and courts the same scale.
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import xml.etree.ElementTree as ET

BBOX = [-0.129, 51.543, -0.113, 51.551]
TAGS = {'name', 'building', 'building:levels', 'height', 'roof:height', 'roof:shape',
        'highway', 'leisure', 'sport', 'surface', 'natural', 'landuse', 'waterway',
        'railway', 'bridge', 'tunnel', 'layer', 'width', 'lanes', 'area', 'man_made', 'tower:type'}


def extract(path):
    root = ET.parse(path).getroot()
    if root.tag != 'osm' or root.find('error') is not None:
        raise ValueError('Not a complete OSM map response')
    nodes = {n.get('id'): [float(n.get('lon')), float(n.get('lat'))] for n in root.findall('node')}
    def tags(e):
        return {t.get('k'): t.get('v') for t in e.findall('tag') if t.get('k') in TAGS}
    ways = {w.get('id'): w for w in root.findall('way')}
    features = []
    for way in ways.values():
        t = tags(way)
        if not any(k in t for k in ['building', 'highway', 'leisure', 'natural', 'landuse', 'railway', 'waterway']):
            continue
        if t.get('highway') in ['proposed', 'construction', 'platform', 'corridor']:
            continue
        refs = [n.get('ref') for n in way.findall('nd')]
        if len(refs) < 2 or any(ref not in nodes for ref in refs):
            raise ValueError(f'Incomplete geometry for way {way.get("id")}')
        features.append({'id': int(way.get('id')), 'tags': t, 'points': [nodes[ref] for ref in refs]})
    trees = [nodes[n.get('id')] for n in root.findall('node') if tags(n).get('natural') == 'tree']
    required = {17999028, 30198196, 37371124, 161419463, 161419464}
    if not required.issubset({f['id'] for f in features}):
        raise ValueError('Extract is missing the park, centre, clock tower or two outdoor courts')
    # Keep all relation metadata out of the renderer. Record the limitation rather
    # than silently treating open outer fragments as complete building footprints.
    omitted = sum(1 for r in root.findall('relation') if tags(r).get('building') or tags(r).get('leisure') == 'park')
    return {'bbox': BBOX, 'source': 'https://api.openstreetmap.org/api/0.6/map?bbox=' + ','.join(map(str, BBOX)),
            'importedAt': datetime.now(timezone.utc).isoformat(),
            'osmTimestamp': (root.find('meta').get('osm_base') if root.find('meta') is not None else None),
            'attribution': '© OpenStreetMap contributors', 'license': 'https://www.openstreetmap.org/copyright',
            'notes': 'Accuracy pilot: WGS84 way geometry, not a survey. Heights are estimates except tagged heights and the council-reported 47.5 m clock tower. Multipolygon relations and building interiors are not rendered; mapped trees only. No live API calls.',
            'omittedAreaRelations': omitted, 'features': features, 'trees': trees}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'src/data/caledonian-geography.json')
    args = parser.parse_args()
    data = extract(args.input)
    payload = json.dumps(data, separators=(',', ':'), ensure_ascii=False) + '\n'
    if len(payload.encode()) > 1500000:
        raise ValueError('Pilot exceeds the 1.5 MB data budget')
    temporary = args.output.with_suffix('.tmp')
    temporary.write_text(payload)
    temporary.replace(args.output)
    print(len(data['features']), 'features;', len(data['trees']), 'trees;', len(payload.encode()), 'bytes;', data['omittedAreaRelations'], 'omitted area relations')

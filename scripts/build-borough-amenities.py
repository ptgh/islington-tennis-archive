#!/usr/bin/env python3
"""Build a small discovery snapshot from the same OSM extract grid as the map.
Usage: python3 scripts/build-borough-amenities.py /tmp/borough-amenity-source 2026-11-06
Source XML is a build input, not a runtime service. Existing map geometry is unchanged.
"""
import json, math, re, sys
from pathlib import Path
import xml.etree.ElementTree as ET

manifest=json.loads(Path('src/data/islington-geography.json').read_text())
def inside(x,z,ring):
    hit=False
    for a,b in zip(ring,ring[1:]+ring[:1]):
        if (a[1]>z)!=(b[1]>z) and x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]:hit=not hit
    return hit
def project(lng,lat):return ((lng+.115)*6900,-(lat-51.549)*11100)
def area(x,z):return 'Islington' if inside(x,z,manifest['boundary']) else 'Nearby'
park_shapes={}
for cell in manifest['cells']:
    for p in json.loads((Path('public')/cell['url']).read_text())['parks']:park_shapes[str(p['id'])]=p
relation_shapes={}
for ident,shape in park_shapes.items():
    if int(ident)<0:relation_shapes.setdefault(str(-int(ident)//10),[]).append(shape)
parks,stops={},{}
paths=sorted(Path(sys.argv[1]).glob('*.xml'))
if len(paths)!=16:raise SystemExit('Expected the complete 4 by 4 source grid')
for path in paths:
    for _,e in ET.iterparse(path,events=('end',)):
        if e.tag not in ('node','way','relation'):continue
        tags={t.get('k'):t.get('v') for t in e.findall('tag')};ident=e.get('id')
        if e.tag=='node' and tags.get('highway')=='bus_stop' and tags.get('name'):
            lat,lng=float(e.get('lat')),float(e.get('lon'));x,z=project(lng,lat)
            west,south,east,north=manifest['bbox']
            if west<=lng<=east and south<=lat<=north:
                atco=tags.get('naptan:AtcoCode','');url='https://tfl.gov.uk/bus/stop/'+atco if re.fullmatch(r'490[A-Za-z0-9]+',atco) else 'https://www.openstreetmap.org/node/'+ident
                stops[ident]=dict(id=ident,name=tags['name'],lat=lat,lng=lng,letter=tags.get('local_ref',''),area=area(x,z),cell=f'{math.floor(x/manifest["cellSize"])}_{math.floor(z/manifest["cellSize"])}',url=url,sourceUrl='https://www.openstreetmap.org/node/'+ident)
        shapes=relation_shapes.get(ident,[]) if e.tag=='relation' else ([park_shapes[ident]] if ident in park_shapes else [])
        if e.tag in ('way','relation') and shapes and tags.get('name') and tags.get('leisure') in ('park','garden','nature_reserve','recreation_ground') and tags.get('access') not in ('private','no'):
            shape=max(shapes,key=lambda f:(max(p[0] for p in f['points'])-min(p[0] for p in f['points']))*(max(p[1] for p in f['points'])-min(p[1] for p in f['points'])));ring=shape['points'];xs=[p[0] for p in ring];zs=[p[1] for p in ring];cx=sum(xs)/len(xs);cz=sum(zs)/len(zs)
            candidates=[(cx,cz)]+[(min(xs)+(max(xs)-min(xs))*(i+.5)/12,min(zs)+(max(zs)-min(zs))*(j+.5)/12) for i in range(12) for j in range(12)]
            valid=[p for p in candidates if inside(*p,ring) and not any(inside(*p,h) for h in shape.get('holes',[]))]
            if valid:
                x,z=min(valid,key=lambda p:math.dist(p,(cx,cz)))
                parks[e.tag+'-'+ident]=dict(id=e.tag+'-'+ident,name=tags['name'],lat=round(51.549-z/11100,7),lng=round(x/6900-.115,7),area=area(x,z),url=f'https://www.openstreetmap.org/{e.tag}/{ident}')
        e.clear()
result=dict(checked=sys.argv[2],source='https://api.openstreetmap.org/api/0.6/map',coverage='Named parks and gardens with stored outlines, and recorded bus stops inside the stored map bounding box. Access restrictions may apply. Nearby places are labelled. Not an exhaustive facilities or accessibility survey.',parks=sorted(parks.values(),key=lambda p:(p['area']!='Islington',p['name'])),busStops=sorted(stops.values(),key=lambda p:(p['name'],p['letter'],p['id'])))
Path('src/data/borough-amenities.json').write_text(json.dumps(result,separators=(',',':'),ensure_ascii=False)+'\n')
print(len(parks),'parks',len(stops),'bus stops')

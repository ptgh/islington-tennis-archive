#!/usr/bin/env python3
"""Build the continuous borough/context map from OSM API map XML extracts.

Source grid: 4x4 over -0.152,51.516,-0.075,51.580 (two concurrent downloads maximum).
Boundary: https://api.openstreetmap.org/api/0.6/relation/51821/full
Usage: python3 scripts/import-islington-geography.py /tmp/islington-osm /tmp/islington-boundary.xml
Rendering tags only. Coordinates use the app's shared geographic projection;
heights/levels are retained when recorded, otherwise the renderer estimates them.
The manifest carries the full boundary, courts, totals and content-addressed cells.
"""
import json, math, sys, hashlib, xml.etree.ElementTree as ET
from pathlib import Path

BBOX=[-.152,51.516,-.075,51.580]
CELL=40 # 400 m cells, shared coordinates without per-cell ground plates.
TAGS={'building','building:levels','height','roof:shape','leisure','sport','surface','highway','landuse','natural','water','railway','lit','name','area','tunnel','layer','building:part'}
nodes,ways,relations={}, {}, {}
for path in sorted(Path(sys.argv[1]).glob('*.xml')):
    r=ET.parse(path).getroot()
    for n in r.findall('node'):
        nodes[n.get('id')]=(float(n.get('lon')),float(n.get('lat')), {t.get('k'):t.get('v') for t in n.findall('tag') if t.get('k') in TAGS})
    for w in r.findall('way'): ways[w.get('id')]=([n.get('ref') for n in w.findall('nd')],{t.get('k'):t.get('v') for t in w.findall('tag') if t.get('k') in TAGS})
    for rel in r.findall('relation'): relations[rel.get('id')]=rel

def project(p): return [round((p[0]+.115)*6900,4),round(-(p[1]-51.549)*11100,4)]
def coord(ref): return project(nodes[ref])
def closed(pts): return len(pts)>3 and pts[0]==pts[-1]
def area(pts): return abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(pts,pts[1:])))/2
# Full boundary includes points outside the feature extract only via its own source.
r=ET.parse(sys.argv[2]).getroot(); bn={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in r.findall('node')}; bw={w.get('id'):[n.get('ref') for n in w.findall('nd')] for w in r.findall('way')}
rel=next(e for e in r.findall('relation') if e.get('id')=='51821')
assert any(t.get('k')=='name' and t.get('v')=='London Borough of Islington' for t in rel.findall('tag'))
chains=[bw[m.get('ref')] for m in rel.findall('member') if m.get('type')=='way' and m.get('role')=='outer']
def join(chains):
    rings=[]
    while chains:
        chain=chains.pop(0)
        while chain[0]!=chain[-1] and chains:
            for i,c in enumerate(chains):
                if chain[-1]==c[0]:chain+=c[1:];chains.pop(i);break
                if chain[-1]==c[-1]:chain+=list(reversed(c))[1:];chains.pop(i);break
                if chain[0]==c[-1]:chain=c[:-1]+chain;chains.pop(i);break
                if chain[0]==c[0]:chain=list(reversed(c))[:-1]+chain;chains.pop(i);break
            else: break
        if chain[0]==chain[-1]:rings.append(chain)
    return rings
boundary=[project(bn[ref]) for ref in max(join(chains),key=len)]
cells={}; courts=[]; counts=dict(buildings=0,roads=0,parks=0,trees=0,railways=0,water=0)
def cell(x,z): return f'{math.floor(x/CELL)}_{math.floor(z/CELL)}'
def put(kind,f):
    pts=f['points']; x=(min(p[0] for p in pts)+max(p[0] for p in pts))/2;z=(min(p[1] for p in pts)+max(p[1] for p in pts))/2
    c=cells.setdefault(cell(x,z),dict(buildings=[],roads=[],parks=[],trees=[],railways=[],water=[]));c[kind].append(f);counts[kind]+=1
used=set()
def polygon(ident,pts,t,holes=None):
    if not closed(pts) or area(pts)<.002:return
    f=dict(id=int(ident),points=pts)
    if holes:f['holes']=holes
    if t.get('building') and t['building']!='no' and t.get('building:part')!='yes':
        f['tags']={k:v for k,v in t.items() if k in ('building','building:levels','height','roof:shape','name')};put('buildings',f)
    elif t.get('leisure')=='pitch' and t.get('sport')=='tennis':
        f['lit']=t.get('lit')=='yes';f['surface']=t.get('surface','');courts.append(f)
    elif t.get('natural')=='water' or t.get('water'):
        put('water',f)
    elif t.get('leisure') in ('park','garden','recreation_ground','nature_reserve') or t.get('landuse') in ('grass','forest','cemetery','meadow','recreation_ground','village_green') or t.get('natural') in ('wood','scrub','grassland'):
        put('parks',f)
# Preserve multipolygon holes (courtyards, lakes); member footprints are not drawn twice.
for ident,rel in sorted(relations.items(),key=lambda x:int(x[0])):
    t={a.get('k'):a.get('v') for a in rel.findall('tag') if a.get('k') in TAGS}
    if not any(k in t for k in ('building','leisure','landuse','natural','water')):continue
    members=[m for m in rel.findall('member') if m.get('type')=='way' and m.get('ref') in ways]
    outer=join([ways[m.get('ref')][0][:] for m in members if m.get('role') in ('outer','')]);inner=join([ways[m.get('ref')][0][:] for m in members if m.get('role')=='inner'])
    if not outer:continue
    for i,ring in enumerate(outer):
        if all(ref in nodes for ref in ring):polygon(-int(ident)*10-i,[coord(ref) for ref in ring],t,[[coord(ref) for ref in hole] for hole in inner if all(ref in nodes for ref in hole)])
    used.update(m.get('ref') for m in members)
for ident,(refs,t) in sorted(ways.items(),key=lambda x:int(x[0])):
    if not refs or any(ref not in nodes for ref in refs):continue
    pts=[coord(ref) for ref in refs]
    # Restrict to the extraction rectangle; complete OSM ways can extend outside it.
    if not any(BBOX[0]<=nodes[ref][0]<=BBOX[2] and BBOX[1]<=nodes[ref][1]<=BBOX[3] for ref in refs):continue
    if ident not in used:polygon(ident,pts,t)
    if (t.get('highway') or t.get('railway') in ('rail','light_rail')) and t.get('tunnel')!='yes' and t.get('highway') not in ('corridor','elevator','proposed','construction','platform'):
        kind='roads' if t.get('highway') else 'railways'
        for index,(a,b) in enumerate(zip(pts,pts[1:])):
            if math.dist(a,b)<.0001:continue
            # Segment subdivision keeps every cell's culling bounds bounded, without altering the route.
            steps=max(1,math.ceil(math.dist(a,b)/(CELL/2)))
            for step in range(steps):
                p=[[round(a[k]+(b[k]-a[k])*v/steps,4) for k in (0,1)] for v in (step,step+1)]
                put(kind,dict(id=f'{ident}:{index}:{step}',kind=t.get('highway',t.get('railway')),points=p))
for ident,(lng,lat,t) in sorted(nodes.items(),key=lambda x:int(x[0])):
    if t.get('natural')=='tree' and BBOX[0]<=lng<=BBOX[2] and BBOX[1]<=lat<=BBOX[3]:put('trees',dict(id=int(ident),points=[project((lng,lat))]))
out=Path('public/map/islington');out.mkdir(parents=True,exist_ok=True)
manifest=dict(checked='2026-10-30',source='https://api.openstreetmap.org/api/0.6/map',boundarySource='https://api.openstreetmap.org/api/0.6/relation/51821/full',bbox=BBOX,boundary=boundary,cellSize=CELL,counts=counts,courts=courts,cells=[])
for key,data in sorted(cells.items()):
    encoded=json.dumps(data,separators=(',',':')).encode(); digest=hashlib.sha256(encoded).hexdigest()[:10]; filename=f'{key}-{digest}.json'
    (out/filename).write_bytes(encoded)
    x,z=map(int,key.split('_'));allp=[p for fs in data.values() for f in fs for p in f['points']]
    manifest['cells'].append(dict(id=key,url=f'map/islington/{filename}',x=(x+.5)*CELL,z=(z+.5)*CELL,bounds=[min(p[0] for p in allp),min(p[1] for p in allp),max(p[0] for p in allp),max(p[1] for p in allp)],counts={kind:len(fs) for kind,fs in data.items()}))
Path('src/data/islington-geography.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
print(counts,'courts',len(courts),'cells',len(cells),'data bytes',sum(p.stat().st_size for p in out.glob('*.json')))
# Inspection output only; venue association is intentionally explicit in app code.
for name,lng,lat in [('highbury',-.098780,51.551501),('centre',-.1211113,51.5462388),('rosemary',-.0877521,51.5386367),('tufnell',-.1336788,51.5584335),('spa',-.1078098,51.525318),('ega',-.114072,51.5329007),('coolhurst',-.13117,51.57638),('barbican',-.0947,51.51916)]:
    p=project((lng,lat)); cs=sorted(courts,key=lambda f:math.dist(p,[sum(v[k] for v in f['points'][:-1])/(len(f['points'])-1) for k in (0,1)]))
    print(name,[(c['id'],round(math.dist(p,[sum(v[k] for v in c['points'][:-1])/(len(c['points'])-1) for k in (0,1)])),c['surface']) for c in cs[:16]])

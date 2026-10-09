#!/usr/bin/env python3
"""Import public OSM API map extracts for the two court miniatures.

python3 scripts/import-iconic-geography.py /tmp/wimbledon-osm.xml /tmp/queens-osm.xml
Downloads: https://api.openstreetmap.org/api/0.6/map?bbox=west,south,east,north
Only rendering tags are retained; contributor and address metadata are discarded.
"""
import json, math, sys, xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path

CONFIG = {'wimbledon': (-.2143, 51.434, 490, 490), 'queens': (-.2115, 51.4876, 350, 350)}
TAGS = ['name','ref','building','building:levels','height','roof:shape','leisure','sport','surface','highway','landuse','natural','water','barrier','area']

def extract(path, venue):
    lon, lat, rx, rz = CONFIG[venue]
    root = ET.parse(path).getroot()
    def project(n):
        return [round((float(n.get('lon'))-lon)*111320*math.cos(math.radians(lat)),2), round(-(float(n.get('lat'))-lat)*111320,2)]
    nodes = {n.get('id'):project(n) for n in root.findall('node')}
    ways = {w.get('id'):w for w in root.findall('way')}
    def tags(e): return {t.get('k'):t.get('v') for t in e.findall('tag') if t.get('k') in TAGS}
    features=[]
    for w in ways.values():
        t=tags(w)
        if not any(k in t for k in ['building','highway','leisure','landuse','natural','barrier']): continue
        refs=[n.get('ref') for n in w.findall('nd')]
        if any(n not in nodes for n in refs): continue
        pts=[nodes[n] for n in refs]
        if len(pts)<2 or not any(abs(x)<rx and abs(z)<rz for x,z in pts):continue
        features.append({'id':int(w.get('id')), 'tags':t,'points':pts})
    # OSM multipolygons may contain several independent outer rings, not just
    # fragments of one outline. Preserve each section and use the largest as main.
    for rel in root.findall('relation'):
        t=tags(rel)
        if t.get('leisure')!='sports_centre' or 'All England' not in t.get('name',''):continue
        chains=[[n.get('ref') for n in ways[m.get('ref')].findall('nd')] for m in rel.findall('member') if m.get('role')=='outer' and m.get('ref') in ways]
        rings=[]
        while chains:
            chain=chains.pop(0)
            while chain[0]!=chain[-1] and chains:
                for i,c in enumerate(chains):
                    if chain[-1]==c[0]:chain+=c[1:];chains.pop(i);break
                    if chain[-1]==c[-1]:chain+=list(reversed(c))[1:];chains.pop(i);break
                    if chain[0]==c[-1]:chain=c[:-1]+chain;chains.pop(i);break
                    if chain[0]==c[0]:chain=list(reversed(c))[:-1]+chain;chains.pop(i);break
                else:break
            if chain[0]==chain[-1] and all(n in nodes for n in chain):rings.append([nodes[n] for n in chain])
        def area(p):return abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(p,p[1:])))
        rings.sort(key=area,reverse=True)
        if rings:features.append({'id':-int(rel.get('id')),'tags':t,'points':rings[0],'outlines':rings})
    trees=[{'id':int(n.get('id')),'point':nodes[n.get('id')]} for n in root.findall('node') if tags(n).get('natural')=='tree' and abs(nodes[n.get('id')][0])<rx and abs(nodes[n.get('id')][1])<rz]
    return {'origin':[lon,lat],'extent':[rx,rz], 'source':'https://api.openstreetmap.org/api/0.6/map','attribution':'© OpenStreetMap contributors','license':'https://www.openstreetmap.org/copyright','importedAt':date.today().isoformat(),'notes':'Mapped ground footprints in local metres, x east and z south. Heights, roofs, facade details and supplementary planting are illustrative. Map data is not a survey.', 'features':features,'trees':trees}

if __name__=='__main__':
    if len(sys.argv)!=3:raise SystemExit(__doc__)
    result={v:extract(p,v) for v,p in zip(CONFIG,sys.argv[1:])}
    target=Path(__file__).resolve().parents[1]/'src/data/iconic-geography.json'
    target.write_text(json.dumps(result,separators=(',',':'))+'\n')
    for v,d in result.items():print(v,len(d['features']),'features',len(d['trees']),'trees')
    print(target.stat().st_size,'bytes')

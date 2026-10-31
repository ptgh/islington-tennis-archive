#!/usr/bin/env python3
"""Bake the distant overview from the same OSM cells used for 3D close-ups.
Requires Pillow in the authoring environment only; app builds use the saved PNG.
Re-run after scripts/import-islington-geography.py. North is image top.
"""
from PIL import Image,ImageDraw
import json
from pathlib import Path
m=json.load(open('src/data/islington-geography.json'));west,south,east,north=m['bbox'];minx=(west+.115)*6900;maxx=(east+.115)*6900;minz=-(north-51.549)*11100;maxz=-(south-51.549)*11100
W=4096;H=round(W*(maxz-minz)/(maxx-minx));im=Image.new('RGB',(W,H),'#a9b69b');d=ImageDraw.Draw(im)
def pts(p):return [((x-minx)/(maxx-minx)*W,(z-minz)/(maxz-minz)*H) for x,z in p]
cells=[json.load(open('public/'+c['url'])) for c in m['cells']]
for c in cells:
 for f in c['parks']:d.polygon(pts(f['points']),fill='#839c68')
 for f in c['water']:d.polygon(pts(f['points']),fill='#769e9b')
for c in cells:
 for f in c['roads']:
  walking=f['kind'] in ['footway','path','pedestrian','steps','cycleway'];w=.18 if walking else .75 if f['kind'] in ['primary','secondary','tertiary','trunk'] else .42
  d.line(pts(f['points']),fill='#c9c4b2',width=max(1,round((w+.24)/(maxx-minx)*W)))
  if not walking:d.line(pts(f['points']),fill='#818b82',width=max(1,round(w/(maxx-minx)*W)))
 for f in c['railways']:d.line(pts(f['points']),fill='#73817a',width=max(1,round(.18/(maxx-minx)*W)))
paint=['#bca58c','#c9b79d','#b69e86','#c1b297'];roofs=['#7b8880','#8a9286','#7b8985','#92998c']
for c in cells:
 for f in c['buildings']:
  p=pts(f['points']);offset=[(x+2,z+3) for x,z in p];d.polygon(offset,fill='#899582');d.polygon(p,fill=roofs[abs(f['id'])%4],outline=paint[abs(f['id'])%4])
  for hole in f.get('holes',[]):d.polygon(pts(hole),fill='#a9b69b')
for c in cells:
 for f in c['trees']:
  x,z=pts(f['points'])[0];d.ellipse((x-2,z-2,x+2,z+2),fill='#65804e')
for f in m['courts']:d.polygon(pts(f['points']),fill='#4e8b86',outline='#dce4d1')
im.save('public/map/islington-overview.png',optimize=True)
print(W,H,Path('public/map/islington-overview.png').stat().st_size)

import json,urllib.request,time,io,hashlib
from pathlib import Path
from PIL import Image,ImageOps,ImageFilter
import numpy as np
BASE=__import__('os').environ.get('H3_URL','http://127.0.0.1:8190');OUT=Path('assets/generated/terrain');OUT.mkdir(parents=True,exist_ok=True);PR=Path('assets/generated/props');PR.mkdir(parents=True,exist_ok=True)
T={
'plain':"seamless tileable top-down ancient Chinese battlefield grassland texture, short grass, subtle dirt patches, dry green and olive, orthographic, uniform soft daylight, no objects, no people, no text",
'road':"seamless tileable top-down ancient Chinese packed earth road texture, wheel ruts, small stones, dry brown, orthographic, no objects, no people, no text",
'forest':"seamless tileable top-down dark forest floor texture, moss, roots, fallen leaves, deep green and brown, orthographic, no objects, no people, no text",
'hill':"seamless tileable top-down rocky hillside texture, dry grass and exposed stone, olive and gray, orthographic, no objects, no people, no text",
'rock':"seamless tileable top-down gray mountain rock texture, cracks, lichen, cool gray, orthographic, no objects, no people, no text",
'water':"seamless tileable top-down ancient Chinese river water texture, gentle ripples, dark teal and jade, orthographic, no objects, no people, no text",
'bridge':"seamless tileable top-down ancient Chinese wooden bridge planks texture, weathered timber, iron nails, orthographic, no objects, no people, no text",
'village':"seamless tileable top-down ancient Chinese village packed earth and stone texture, straw, small stones, warm brown, orthographic, no objects, no people, no text",
'wall':"seamless tileable top-down ancient Chinese stone city wall masonry texture, large gray blocks, mortar, orthographic, no objects, no people, no text",
'sand':"seamless tileable top-down river sand texture, fine pale sand, small pebbles, orthographic, no objects, no people, no text",
'scorch':"seamless tileable top-down scorched battlefield earth texture, black ash, burnt grass, embers, orthographic, no objects, no people, no text",
}
P={
'tree1':"A single ancient Chinese pine tree, full tree from roots to crown, isolated on a perfectly flat solid pure green background, no shadow, no ground, no other objects, game asset, painterly, no text",
'tree2':"A single ancient Chinese broadleaf tree, full tree from roots to crown, isolated on a perfectly flat solid pure green background, no shadow, no ground, no other objects, game asset, painterly, no text",
'rock1':"A single ancient Chinese gray boulder, isolated on a perfectly flat solid pure green background, no shadow, no ground, no other objects, game asset, painterly, no text",
}
def post(p,d):
 r=urllib.request.Request(BASE+p,data=json.dumps(d).encode(),headers={'Content-Type':'application/json'});return json.loads(urllib.request.urlopen(r,timeout=30).read())
def get(p):return json.loads(urllib.request.urlopen(BASE+p,timeout=30).read())
def wait(jid):
 for i in range(120):
  time.sleep(2)
  try:j=get('/jobs/'+jid)
  except Exception:continue
  if j.get('status') in ('done','error','failed'):return j
 return None
def gen(prompt,prefix,preset='1k'):
 for a in range(3):
  try:
   r=post('/generate',{'kind':'image','prompt':prompt,'preset':preset,'seed':909090+int(hashlib.md5(prefix.encode()).hexdigest()[:5],16)%9999,'prefix':prefix});j=wait(r['job_id'])
   if j and j.get('status')=='done' and j.get('files'):return urllib.request.urlopen(BASE+'/files/'+j['files'][0],timeout=90).read()
  except Exception as e:print('err',e,flush=True);time.sleep(3)
 return None
for k,p in T.items():
 dest=OUT/f'{k}.webp'
 if dest.exists():print('skip',k,flush=True);continue
 print('GEN terrain',k,flush=True);data=gen(p,'tk_terrain_'+k)
 if data:
  im=Image.open(io.BytesIO(data)).convert('RGB');w,h=im.size;s=min(w,h);im=ImageOps.fit(im,(s,s),method=Image.LANCZOS).resize((512,512),Image.LANCZOS);im.save(dest,'WEBP',quality=90,method=6);print(' saved',dest,flush=True)
for k,p in P.items():
 dest=PR/f'{k}.webp'
 if dest.exists():print('skip',k,flush=True);continue
 print('GEN prop',k,flush=True);data=gen(p,'tk_prop_'+k,'portrait')
 if data:
  im=Image.open(io.BytesIO(data)).convert('RGB');a=np.array(im).astype(np.int16);r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
  mask=((g>90)&(g>r*1.35)&(g>b*1.35)).astype(np.uint8)*255
  alpha=Image.fromarray(255-mask).filter(ImageFilter.GaussianBlur(.6));arr=np.array(im).astype(np.uint8);al=np.array(alpha);edge=(al>0)&(al<250)
  arr[:,:,1]=np.where(edge,np.minimum(arr[:,:,1],np.maximum(arr[:,:,0],arr[:,:,2])),arr[:,:,1])
  out=Image.fromarray(arr).convert('RGBA');out.putalpha(alpha);out=out.crop(out.getbbox());out.thumbnail((512,1024),Image.LANCZOS);out.save(dest,'WEBP',quality=90,method=6);print(' saved',dest,flush=True)

import json,urllib.request,time,hashlib
from pathlib import Path
from PIL import Image,ImageFilter
import numpy as np
BASE=__import__('os').environ.get('H3_URL','http://127.0.0.1:8190'); OUT=Path('assets/generated/units');OUT.mkdir(parents=True,exist_ok=True)
U={
'liubei':"Liu Bei, benevolent Han warlord, green and gold lamellar armor, imperial jade crown, short beard, holding a straight sword",
'zhangfei':"Zhang Fei, fearsome general, black iron helmet, bristling black beard, black and bronze lamellar armor, red cape, holding a serpent spear",
'zhaoyun':"Zhao Yun, young heroic general, silver-white armor and white plume, handsome sharp face, holding a spear",
'zhugeliang':"Zhuge Liang, elegant strategist, white scholar robe, silk headscarf, goatee, holding a feather fan",
'caocao':"Cao Cao, cunning warlord, dark blue and gold armor, black crown, short beard, holding a sword",
'lvbu':"Lu Bu, peerless warrior, gold crown with two long pheasant feathers, red and gold armor, handsome arrogant face, holding a halberd",
'chengyuanzhi':"Cheng Yuanzhi, Yellow Turban cavalry commander, yellow headscarf, rough beard, captured Han lamellar armor, holding a spear",
'dengmao':"Deng Mao, Yellow Turban infantry commander, yellow headscarf, weathered face, simple lamellar armor, holding a spear",
'yellowBrute':"Yellow Turban brute soldier, yellow headscarf, ragged lamellar armor, fierce weathered face, holding a heavy blade",
'yellowArcher':"Yellow Turban archer, yellow headscarf, simple leather armor, holding a bow",
}
def post(p,d):
 r=urllib.request.Request(BASE+p,data=json.dumps(d).encode(),headers={'Content-Type':'application/json'});return json.loads(urllib.request.urlopen(r,timeout=30).read())
def get(p):return json.loads(urllib.request.urlopen(BASE+p,timeout=30).read())
def wait(jid):
 for i in range(180):
  time.sleep(2)
  try:j=get('/jobs/'+jid)
  except Exception:continue
  if j.get('status') in ('done','error','failed'):return j
 return None
def cut(src,dest):
 im=Image.open(src).convert('RGB'); a=np.array(im).astype(np.int16)
 r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
 mask=((g>90)&(g>r*1.35)&(g>b*1.35)).astype(np.uint8)*255
 alpha=Image.fromarray(255-mask).filter(ImageFilter.GaussianBlur(.6))
 arr=np.array(im).astype(np.uint8); al=np.array(alpha); edge=(al>0)&(al<250)
 arr[:,:,1]=np.where(edge,np.minimum(arr[:,:,1],np.maximum(arr[:,:,0],arr[:,:,2])),arr[:,:,1])
 out=Image.fromarray(arr).convert('RGBA'); out.putalpha(alpha); bbox=out.getbbox(); out=out.crop(bbox)
 out.thumbnail((512,1024),Image.LANCZOS); out.save(dest,'WEBP',quality=90,method=6); print(' cut',dest,out.size,flush=True)
for k,desc in U.items():
 dest=OUT/f'{k}.webp'
 if dest.exists(): print('skip',k,flush=True);continue
 print('GEN',k,flush=True)
 prompt=f"Full body character concept art of {desc}, standing head to toe, isolated on a perfectly flat solid pure green background, no shadow, no ground, no other objects, centered, game unit sprite, painterly, highly detailed, no text, no watermark"
 for attempt in range(3):
  try:
   r=post('/generate',{'kind':'image','prompt':prompt,'preset':'portrait','seed':616161+int(hashlib.md5(k.encode()).hexdigest()[:5],16)%9999,'prefix':'tk_unit_'+k});print(' job',r,flush=True)
   j=wait(r['job_id']);print(' res',j,flush=True)
   if j and j.get('status')=='done' and j.get('files'):
    raw=Path('/tmp')/f'unit_{k}.png';raw.write_bytes(urllib.request.urlopen(BASE+'/files/'+j['files'][0],timeout=60).read());cut(raw,dest);raw.unlink(missing_ok=True);break
  except Exception as e: print(' err',e,flush=True);time.sleep(4)

"""Generate empty H3 battlefield backdrops via agent API H3 agent service."""
import json,urllib.request,time,hashlib
from pathlib import Path
from PIL import Image,ImageOps
BASE=__import__('os').environ.get('H3_URL','http://127.0.0.1:8190'); OUT=Path('assets/generated/backdrops');OUT.mkdir(parents=True,exist_ok=True)
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
B={
'day':"Aerial establishing shot of an empty ancient Chinese battlefield under pale daylight, no people, no humans, no soldiers, no characters, no figures, no armor, no foreground objects, wide open valley, distant ink-wash mountains and river, low dust, abandoned war banners, cinematic landscape concept art, 16:9, no text, no watermark",
'dusk':"Aerial establishing shot of an empty ancient Chinese battlefield at dusk, no people, no humans, no soldiers, no characters, no figures, no armor, no foreground objects, cinnabar sun, dark mountains, drifting smoke, abandoned banners, cinematic landscape concept art, 16:9, no text, no watermark",
'storm':"Aerial establishing shot of an empty ancient Chinese battlefield in a storm, no people, no humans, no soldiers, no characters, no figures, no armor, no foreground objects, dark clouds, rain, distant mountains, lightning, cold teal and charcoal, cinematic landscape concept art, 16:9, no text, no watermark",
'fire':"Aerial establishing shot of an empty ancient Chinese river battlefield at night, no people, no humans, no soldiers, no characters, no figures, no armor, no foreground objects, burning ships and red smoke, distant ink mountains, embers, cinematic landscape concept art, 16:9, no text, no watermark",
}
for k,p in B.items():
 dest=OUT/f'{k}.webp'
 if dest.exists(): print('skip',k,flush=True);continue
 print('GEN',k,flush=True)
 r=post('/generate',{'kind':'image','prompt':p,'preset':'2k','seed':777001+len(k)*97,'prefix':'tk_bd2_'+k});print(' job',r,flush=True)
 j=wait(r['job_id']);print(' result',j,flush=True)
 if j and j.get('status')=='done' and j.get('files'):
  fn=j['files'][0];data=urllib.request.urlopen(BASE+'/files/'+fn,timeout=60).read();raw=Path('/tmp')/f'bd_{k}.png';raw.write_bytes(data)
  im=Image.open(raw).convert('RGB');im=ImageOps.fit(im,(1600,900),method=Image.LANCZOS);im.save(dest,'WEBP',quality=88,method=6);raw.unlink(missing_ok=True);print(' saved',dest,flush=True)

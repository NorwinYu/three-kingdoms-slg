import json,urllib.request,time,hashlib
from pathlib import Path
from PIL import Image,ImageFilter
import numpy as np
BASE=__import__('os').environ.get('H3_URL','http://127.0.0.1:8190'); OUT=Path('assets/generated/units')
U={
'huangzhong':"Huang Zhong, veteran archer general, 60 years old, white beard, bronze scale armor, holding a longbow",
'machao':"Ma Chao, young fierce cavalry general of Xiliang, white silver armor, white plume helmet, handsome stern face, holding a spear",
'sunquan':"Sun Quan, young lord of Wu, red and gold armor, handsome resolute face, short beard, holding a sword",
'zhouyu':"Zhou Yu, elegant Wu commander, red armor and gold trim, handsome refined face, holding a feather fan",
'huanggai':"Huang Gai, old Wu general, white beard, red armor, determined weathered face, holding a blade",
'zhangjiao':"Zhang Jiao, Yellow Turban leader, yellow daoist robe, wild white hair and beard, holding a staff",
'huaxiong':"Hua Xiong, brutal Dong Zhuo general, heavy dark armor, fierce bearded face, holding a huge blade",
'xiahoudun':"Xiahou Dun, one-eyed Wei general, black eyepatch, dark blue armor, scarred face, holding a spear",
'zhangliao':"Zhang Liao, Wei cavalry general, dark blue and silver armor, sharp heroic face, holding a spear",
'simayi':"Sima Yi, cunning Wei strategist, dark robe, narrow intelligent eyes, goatee, holding a black fan",
'caoren':"Cao Ren, Wei general, heavy dark blue armor, resolute bearded face, holding a shield and sword",
'xiahouyuan':"Xiahou Yuan, Wei archer general, dark blue armor, sharp bearded face, holding a bow",
'dongzhuo':"Dong Zhuo, tyrannical warlord, heavy dark robes, cruel fat face, long beard, holding a sword",
'dongBrute':"Western Liang heavy soldier, dark iron armor, holding a curved blade",
'weiInfantry':"Wei dynasty infantryman, dark blue and steel lamellar armor, holding a shield and spear",
'weiCavalry':"Wei tiger cavalryman, dark blue and silver armor, plumed helmet, holding a spear",
'wuMarine':"Wu dynasty marine, red and bronze armor, holding a spear",
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
 im=Image.open(src).convert('RGB');a=np.array(im).astype(np.int16);r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
 mask=((g>90)&(g>r*1.35)&(g>b*1.35)).astype(np.uint8)*255
 alpha=Image.fromarray(255-mask).filter(ImageFilter.GaussianBlur(.6));arr=np.array(im).astype(np.uint8);al=np.array(alpha);edge=(al>0)&(al<250)
 arr[:,:,1]=np.where(edge,np.minimum(arr[:,:,1],np.maximum(arr[:,:,0],arr[:,:,2])),arr[:,:,1])
 out=Image.fromarray(arr).convert('RGBA');out.putalpha(alpha);out=out.crop(out.getbbox());out.thumbnail((512,1024),Image.LANCZOS);out.save(dest,'WEBP',quality=90,method=6);print(' cut',dest,out.size,flush=True)
for k,desc in U.items():
 dest=OUT/f'{k}.webp'
 if dest.exists():print('skip',k,flush=True);continue
 print('GEN',k,flush=True)
 prompt=f"Full body character concept art of {desc}, standing head to toe, isolated on a perfectly flat solid pure green background, no shadow, no ground, no other objects, centered, game unit sprite, painterly, highly detailed, no text, no watermark"
 for attempt in range(3):
  try:
   r=post('/generate',{'kind':'image','prompt':prompt,'preset':'portrait','seed':717171+int(hashlib.md5(k.encode()).hexdigest()[:5],16)%9999,'prefix':'tk_unit_'+k});print(' job',r,flush=True)
   j=wait(r['job_id']);print(' res',j,flush=True)
   if j and j.get('status')=='done' and j.get('files'):
    raw=Path('/tmp')/f'unit2_{k}.png';raw.write_bytes(urllib.request.urlopen(BASE+'/files/'+j['files'][0],timeout=60).read());cut(raw,dest);raw.unlink(missing_ok=True);break
  except Exception as e:print(' err',e,flush=True);time.sleep(4)

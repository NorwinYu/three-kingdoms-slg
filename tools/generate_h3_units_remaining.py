import json,urllib.request,time,hashlib,io
from pathlib import Path
from PIL import Image,ImageFilter
import numpy as np
BASE=__import__('os').environ.get('H3_URL','http://127.0.0.1:8190');OUT=Path('assets/generated/units')
U={
'zhoucang':"Zhou Cang, Guan Yu's loyal strongman, dark weathered skin, thick beard, simple dark armor, carrying a heavy blade",
'zhangbao':"Zhang Bao, Yellow Turban general, yellow robe and headband, young fierce face, holding a sword",
'zhangliang':"Zhang Liang, Yellow Turban general, yellow robe and headscarf, bearded, holding a spear",
'liru':"Li Ru, Dong Zhuo's strategist, dark scholar robe, narrow calculating eyes, goatee, holding a scroll",
'gaoshun':"Gao Shun, Lu Bu's general, heavy dark armor, stern scarred face, holding a spear",
'chengong':"Chen Gong, Lu Bu's strategist, dark scholar robe, goatee, holding a fan",
'xuchu':"Xu Chu, Cao Cao's tiger guard, massive muscular warrior, heavy armor, fierce bearded face, holding a huge blade",
'zhanghe':"Zhang He, Wei general, elegant dark blue armor, handsome sharp face, holding a spear",
'xuhuang':"Xu Huang, Wei general, heavy dark armor, resolute bearded face, holding a battle axe",
'liubiao':"Liu Biao, Jingzhou lord, scholarly rich robe, long beard, imperial crown, holding a scroll",
'caimao':"Cai Mao, Jingzhou naval commander, dark teal armor, bearded, holding a sword",
'wenpin':"Wen Pin, Jingzhou general, dark armor, stern face, holding a spear",
'kuaiyue':"Kuai Yue, Jingzhou strategist, dark robe, thin face, goatee, holding a scroll",
'huangzu':"Huang Zu, Jingzhou veteran general, old weathered face, dark armor, holding a bow",
'liuzhang':"Liu Zhang, Yizhou lord, rich silk robe, weak worried face, crown, holding a jade tablet",
'zhangren':"Zhang Ren, Yizhou spearmaster, heavy armor, fierce face, holding a spear",
'yanxiang':"Yan Yan, veteran Yizhou general, white beard, heavy armor, holding a blade",
'zhanglu':"Zhang Lu, Hanzhong daoist lord, yellow daoist robe, headband, bearded, holding a staff",
'yangren':"Yang Ren, Hanzhong general, dark armor, bearded, holding a spear",
'yanpu':"Yan Pu, Hanzhong strategist, dark robe, goatee, holding a scroll",
'guosi':"Guo Si, Dong Zhuo general, rough dark armor, brutal bearded face, holding a blade",
'lidian':"Li Dian, Wei general, dark blue armor, calm face, holding a spear",
'yujin':"Yu Jin, Wei general, heavy dark armor, stern face, holding a halberd",
'caochun':"Cao Chun, Wei tiger cavalry commander, dark blue and silver armor, plumed helmet, holding a spear",
'weiyan':"Wei Yan, Shu general, scarred face, dark bronze armor, holding a heavy blade",
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
def cut(data,dest):
 im=Image.open(io.BytesIO(data)).convert('RGB');a=np.array(im).astype(np.int16);r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
 mask=((g>90)&(g>r*1.35)&(g>b*1.35)).astype(np.uint8)*255
 alpha=Image.fromarray(255-mask).filter(ImageFilter.GaussianBlur(.6));arr=np.array(im).astype(np.uint8);al=np.array(alpha);edge=(al>0)&(al<250)
 arr[:,:,1]=np.where(edge,np.minimum(arr[:,:,1],np.maximum(arr[:,:,0],arr[:,:,2])),arr[:,:,1])
 out=Image.fromarray(arr).convert('RGBA');out.putalpha(alpha);out=out.crop(out.getbbox());out.thumbnail((512,1024),Image.LANCZOS);out.save(dest,'WEBP',quality=90,method=6);print(' cut',dest,out.size,flush=True)
for k,desc in U.items():
 dest=OUT/f'{k}.webp'
 if dest.exists():print('skip',k,flush=True);continue
 print('GEN',k,flush=True)
 prompt=f"Full body character concept art of {desc}, standing head to toe, isolated on a perfectly flat solid pure green background, no shadow, no ground, no other objects, centered, game unit sprite, painterly, highly detailed, no text, no watermark"
 for a in range(3):
  try:
   r=post('/generate',{'kind':'image','prompt':prompt,'preset':'portrait','seed':808080+int(hashlib.md5(k.encode()).hexdigest()[:5],16)%9999,'prefix':'tk_unit_'+k});print(' job',r,flush=True);j=wait(r['job_id']);print(' res',j,flush=True)
   if j and j.get('status')=='done' and j.get('files'):
    data=urllib.request.urlopen(BASE+'/files/'+j['files'][0],timeout=90).read();cut(data,dest);break
  except Exception as e:print(' err',e,flush=True);time.sleep(3)

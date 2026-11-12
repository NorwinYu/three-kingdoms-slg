import json,urllib.request,time,io,hashlib
from pathlib import Path
from PIL import Image,ImageOps
BASE=__import__('os').environ.get('H3_URL','http://127.0.0.1:8190');OUT=Path('assets/generated/skills');OUT.mkdir(parents=True,exist_ok=True)
S={
'rende':("仁德",'a gentle green healing light over a jade seal, benevolent aura'),
'jijiang':("激将",'a golden war drum and rising red banners, inspiring aura'),
'wusheng':("武圣",'a green guandao blade with a dragon aura, saintly gold light'),
'yanyue':("拖刀计",'a curved blade dragging a trail of dust, deceptive feint'),
'paoxiao':("咆哮",'a shockwave ring and a roaring tiger silhouette, red sound waves'),
'duanhe':("燕人断喝",'a black iron spear and a thunderous shout shockwave'),
'longdan':("龙胆",'a silver dragon spear with a coiled dragon aura'),
'qijin':("七进七出",'a silver spear breaking through seven red rings'),
'huoji':("火计",'a burning ancient Chinese war banner and flames'),
'dongfeng':("借东风",'a swirling wind talisman with eastern clouds'),
'liegong':("烈弓",'a drawn ancient Chinese bow with a blazing arrow'),
'baibu':("百步穿杨",'an arrow hitting a distant willow leaf, precision emblem'),
'xiliang':("西凉铁骑",'a charging iron cavalry silhouette and dust'),
'jingma':("锦马超",'a silver-white warhorse and spear, bright aura'),
'qimou':("奇谋",'a dark chessboard with a glowing strategy piece'),
'ziwugu':("子午谷",'a narrow mountain pass and a hidden arrow'),
'taiping':("太平要术",'a yellow daoist talisman with healing water and symbols'),
'yaoshu':("妖术",'a purple-green occult wind and talismans'),
'wushuang':("无双",'a red halberd sweeping a circle of gold light'),
'fangtian':("画戟",'a crescent fangtian halberd with red and gold aura'),
'jianxiong':("奸雄",'a dark imperial seal and blue-gold aura'),
'tuntian':("屯田令",'a golden grain sheaf and farmland emblem'),
'tiebi':("铁壁",'a heavy iron shield wall emblem'),
'jianxiong2':("挟天子",'an imperial edict and a dark throne emblem'),
'baonue':("暴虐",'a black iron mace and red shockwave'),
'kuanggu':("狂骨",'a white bone and red berserker aura'),
'jianxiong3':("断粮",'a burning grain cart and black smoke'),
'kuirou':("苦肉计",'a red dagger and a bandaged arm, sacrifice emblem'),
'huo_chuan':("火船",'a burning ancient Chinese warship'),
'guwu':("鼓舞",'a golden drum with rising red banners'),
'jianxiong4':("号令",'a bronze command banner and disciplined spears'),
'heal':("回春",'a green herb and healing water emblem'),
'mighty':("猛击",'a heavy blade impact with gold sparks'),
'arrowRain':("箭雨",'a volley of arrows falling from dark clouds'),
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
for k,(name,desc) in S.items():
 dest=OUT/f'{k}.webp'
 if dest.exists():print('skip',k,flush=True);continue
 prompt=f"Single ancient Chinese game skill icon for {name}, {desc}, symbolic object, centered, dark ink-wash parchment background, painterly, dramatic rim light, gold and cinnabar accents, no people, no text, no watermark"
 print('GEN',k,flush=True)
 try:
  r=post('/generate',{'kind':'image','prompt':prompt,'preset':'1k','seed':505050+int(hashlib.md5(k.encode()).hexdigest()[:5],16)%9999,'prefix':'tk_sk_'+k});j=wait(r['job_id'])
  if j and j.get('status')=='done' and j.get('files'):
   data=urllib.request.urlopen(BASE+'/files/'+j['files'][0],timeout=90).read();im=Image.open(io.BytesIO(data)).convert('RGB');w,h=im.size;s=min(w,h);im=ImageOps.fit(im,(s,s),method=Image.LANCZOS).resize((512,512),Image.LANCZOS);im.save(dest,'WEBP',quality=88,method=6);print(' saved',dest,flush=True)
 except Exception as e:print(' err',e,flush=True)

import json,urllib.request,time,io,hashlib
from pathlib import Path
from PIL import Image,ImageOps
BASE=__import__('os').environ.get('H3_URL','http://127.0.0.1:8190');OUTA=Path('assets/generated/achievements');OUTT=Path('assets/generated/techs');OUTA.mkdir(parents=True,exist_ok=True);OUTT.mkdir(parents=True,exist_ok=True)
A={
'taoyuan':("桃园之誓",'three peach blossoms and a bronze oath cup'),
'hulao':("温酒斩华雄",'a warm wine cup beside a broken enemy blade'),
'wolong':("三顾茅庐",'a thatched cottage and three horse tracks in snow'),
'changban':("一身是胆",'a silver spear and a lone rider silhouette'),
'chibi':("火烧赤壁",'burning warships on a red river'),
'han':("兴复汉室",'a golden Han imperial seal and jade dragon'),
'rich':("富甲一方",'a pile of ancient Chinese gold ingots'),
'army':("兵强马壮",'crossed spears and a warhorse head'),
'cities':("天下归心",'a bronze map of many walled cities'),
'battles':("百战百胜",'a laurel wreath around crossed swords'),
'recruiter':("求贤若渴",'an open scroll and a calling banner'),
'collector':("神兵天降",'a radiant ancient weapon rack'),
}
T={
'array':("鱼鳞阵列",'fish-scale military formation diagram'),
'raid':("轻骑急袭",'a swift cavalry rider and dust trail'),
'fire':("火攻之术",'a burning arrow and fire talisman'),
'strategy':("庙算",'a war room map and strategy pieces'),
'tuntian':("屯田制",'terraced fields and grain sheaves'),
'shanggu':("通商惠工",'ancient Chinese coins and merchant scales'),
'minxin':("民心归附",'a village and a heart-shaped seal'),
'huji':("编户齐民",'bamboo census slips and a household seal'),
'forging':("百炼锻兵",'a glowing sword on an anvil'),
'armor':("玄甲精工",'a dark lamellar armor plate'),
'siege':("攻城器械",'an ancient Chinese siege tower'),
'horses':("西凉良马",'a strong western horse and horse hoof emblem'),
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
def gen(name,desc,prefix,out):
 dest=out/f'{prefix.replace("tk_ach_","").replace("tk_tech_","")}.webp'
 if dest.exists():print('skip',prefix,flush=True);return
 prompt=f"Ancient Chinese game achievement medallion icon for {name}, {desc}, bronze and gold emblem, dark ink-wash background, centered, painterly, no text, no watermark, no people"
 print('GEN',prefix,flush=True)
 try:
  r=post('/generate',{'kind':'image','prompt':prompt,'preset':'1k','seed':606060+int(hashlib.md5(prefix.encode()).hexdigest()[:5],16)%9999,'prefix':prefix});j=wait(r['job_id'])
  if j and j.get('status')=='done' and j.get('files'):
   data=urllib.request.urlopen(BASE+'/files/'+j['files'][0],timeout=90).read();im=Image.open(io.BytesIO(data)).convert('RGB');w,h=im.size;s=min(w,h);im=ImageOps.fit(im,(s,s),method=Image.LANCZOS).resize((512,512),Image.LANCZOS);im.save(dest,'WEBP',quality=88,method=6);print(' saved',dest,flush=True)
 except Exception as e:print(' err',e,flush=True)
for k,(n,d) in A.items(): gen(n,d,'tk_ach_'+k,OUTA)
for k,(n,d) in T.items(): gen(n,d,'tk_tech_'+k,OUTT)

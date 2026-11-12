import json,urllib.request,time,hashlib,io
from pathlib import Path
from PIL import Image,ImageOps
BASE=__import__('os').environ.get('H3_URL','http://127.0.0.1:8190');OUT=Path('assets/generated');(OUT/'items').mkdir(parents=True,exist_ok=True);(OUT/'buildings').mkdir(parents=True,exist_ok=True)
ITEMS={
'shuanggu':("a pair of ancient Chinese twin straight swords, elegant bronze guards, laid diagonally","weapon"),
'qinglong':("a massive ancient Chinese guandao polearm, curved blade like a crescent, green dragon motif, antique gold","weapon"),
'zhangba':("a long ancient Chinese serpent spear, wavy blade, dark iron and bronze","weapon"),
'longdan':("an ancient Chinese silver dragon spear, elegant white and silver, spearhead shaped like a dragon","weapon"),
'yitian':("an ancient Chinese royal straight sword, dark steel blade, gold guard, imperial","weapon"),
'guding':("an ancient Chinese broad saber, weathered bronze and dark steel, simple guard","weapon"),
'fangtian':("an ancient Chinese fangtian halberd, crescent side blades, gold and red, ornate","weapon"),
'mingguang':("an ancient Chinese lamellar breastplate, polished silver and gold, ornate shoulder guards","armor"),
'suozi':("an ancient Chinese chainmail armor, fine iron rings, dark steel, laid flat","armor"),
'tengjia':("an ancient Chinese rattan armor, woven red-brown scales, lacquered, tribal","armor"),
'delu':("an ancient Chinese warhorse with a white marking on its forehead, dark bay coat, ornate saddle","horse"),
'chitu':("a magnificent red chestnut warhorse, fiery mane, ornate gold saddle, full side profile","horse"),
'jueying':("a swift black warhorse, dark coat, silver saddle, full side profile","horse"),
'sunzi':("an ancient Chinese bamboo slip book of Sun Tzu's Art of War, dark wood and silk, open scroll","treasure"),
'mengde':("an ancient Chinese military treatise book, dark blue cover, gold clasp, scrolls","treasure"),
'qingnang':("an ancient Chinese medical book, green silk cover, herbal talismans, open scroll","treasure"),
'taiping':("an ancient Chinese daoist grimoire, yellow cover, red talismans, glowing symbols","treasure"),
}
BUILDINGS={
'farm':"an ancient Chinese farm with terraced fields, thatched barn, isometric game building icon",
'market':"an ancient Chinese market street with cloth awnings and stalls, isometric game building icon",
'barracks':"an ancient Chinese military barracks with tents and spears, isometric game building icon",
'wall':"an ancient Chinese city wall with gate tower and battlements, isometric game building icon",
'academy':"an ancient Chinese academy hall with tiled roof and scrolls, isometric game building icon",
'forge':"an ancient Chinese blacksmith forge with furnace and anvil, isometric game building icon",
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
def gen(prompt,preset,prefix):
 for a in range(3):
  try:
   r=post('/generate',{'kind':'image','prompt':prompt,'preset':preset,'seed':303030+int(hashlib.md5(prefix.encode()).hexdigest()[:5],16)%9999,'prefix':prefix});j=wait(r['job_id'])
   if j and j.get('status')=='done' and j.get('files'):return urllib.request.urlopen(BASE+'/files/'+j['files'][0],timeout=90).read()
  except Exception as e:print('err',e,flush=True);time.sleep(3)
 return None
for k,(desc,typ) in ITEMS.items():
 dest=OUT/'items'/f'{k}.webp'
 if dest.exists():print('skip item',k,flush=True);continue
 print('GEN item',k,flush=True)
 data=gen(f"Single ancient Chinese {desc}, centered game item icon, isolated object, dark ink-wash parchment background, painterly, highly detailed, no text, no watermark, no people",'1k','tk_item_'+k)
 if data:
  im=Image.open(io.BytesIO(data)).convert('RGB');w,h=im.size;s=min(w,h);im=ImageOps.fit(im,(s,s),method=Image.LANCZOS,centering=(.5,.5)).resize((512,512),Image.LANCZOS);im.save(dest,'WEBP',quality=88,method=6);print(' saved',dest,flush=True)
for k,desc in BUILDINGS.items():
 dest=OUT/'buildings'/f'{k}.webp'
 if dest.exists():print('skip b',k,flush=True);continue
 print('GEN building',k,flush=True)
 data=gen(f"{desc}, painterly Chinese ink-wash game asset, dark parchment background, centered, no text, no watermark, no people",'1k','tk_b_'+k)
 if data:
  im=Image.open(io.BytesIO(data)).convert('RGB');w,h=im.size;s=min(w,h);im=ImageOps.fit(im,(s,s),method=Image.LANCZOS,centering=(.5,.5)).resize((512,512),Image.LANCZOS);im.save(dest,'WEBP',quality=88,method=6);print(' saved',dest,flush=True)

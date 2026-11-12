import json,urllib.request,time,hashlib
from pathlib import Path
from PIL import Image,ImageOps
BASE=__import__('os').environ.get('H3_URL','http://127.0.0.1:8190');OUT=Path('assets/generated');(OUT/'items').mkdir(parents=True,exist_ok=True);(OUT/'buildings').mkdir(parents=True,exist_ok=True)
P={
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
   r=post('/generate',{'kind':'image','prompt':prompt,'preset':preset,'seed':20261212+int(hashlib.md5(prefix.encode()).hexdigest()[:5],16)%9999,'prefix':prefix});j=wait(r['job_id'])
   if j and j.get('status')=='done' and j.get('files'):return urllib.request.urlopen(BASE+'/files/'+j['files'][0],timeout=90).read()
  except Exception as e:print('err',e,flush=True);time.sleep(3)
 return None
STYLE="Cinematic semi-realistic Chinese ink-wash character portrait, half-length bust, facing camera, dramatic chiaroscuro, painterly brushwork, intricate armor and silk, muted cinnabar/jade/antique gold, dark atmospheric ink background, highly detailed, no text, no watermark."
for k,desc in P.items():
 dest=OUT/'portraits'/f'{k}.webp'
 if dest.exists():print('skip',k,flush=True);continue
 print('GEN portrait',k,flush=True);data=gen(STYLE+' Subject: '+desc,'portrait','tk_'+k)
 if data:
  im=Image.open(__import__('io').BytesIO(data)).convert('RGB');im=ImageOps.fit(im,(576,1024),method=Image.LANCZOS,centering=(.5,.35));im.save(dest,'WEBP',quality=88,method=6);print(' saved',dest,flush=True)
for k,(desc,typ) in ITEMS.items():
 dest=OUT/'items'/f'{k}.webp'
 if dest.exists():print('skip item',k,flush=True);continue
 print('GEN item',k,flush=True)
 prompt=f"Single ancient Chinese {desc}, centered game item icon, isolated object, dark ink-wash parchment background, painterly, highly detailed, no text, no watermark, no people"
 data=gen(prompt,'1k','tk_item_'+k)
 if data:
  im=Image.open(__import__('io').BytesIO(data)).convert('RGB');w,h=im.size;s=min(w,h);im=ImageOps.fit(im,(s,s),method=Image.LANCZOS,centering=(.5,.5));im=im.resize((512,512),Image.LANCZOS);im.save(dest,'WEBP',quality=88,method=6);print(' saved',dest,flush=True)
for k,desc in BUILDINGS.items():
 dest=OUT/'buildings'/f'{k}.webp'
 if dest.exists():print('skip b',k,flush=True);continue
 print('GEN building',k,flush=True);data=gen(f"{desc}, painterly Chinese ink-wash game asset, dark parchment background, centered, no text, no watermark, no people",'1k','tk_b_'+k)
 if data:
  im=Image.open(__import__('io').BytesIO(data)).convert('RGB');w,h=im.size;s=min(w,h);im=ImageOps.fit(im,(s,s),method=Image.LANCZOS,centering=(.5,.5));im=im.resize((512,512),Image.LANCZOS);im.save(dest,'WEBP',quality=88,method=6);print(' saved',dest,flush=True)

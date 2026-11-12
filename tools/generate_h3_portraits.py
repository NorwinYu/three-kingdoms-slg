"""Generate H3 portraits via agent API H3 agent service. Edit BASE/prompts as needed."""
import json, urllib.request, time, sys, os, hashlib
from pathlib import Path
from PIL import Image, ImageOps
BASE=__import__('os').environ.get('H3_URL','http://127.0.0.1:8190')
OUT=Path('assets/generated'); (OUT/'portraits').mkdir(parents=True,exist_ok=True)
STYLE="Cinematic semi-realistic Chinese ink-wash character portrait, half-length bust, facing camera, dramatic chiaroscuro side lighting, painterly brushwork, intricate lamellar armor and silk, muted cinnabar/jade/antique gold palette, dark atmospheric ink background, highly detailed, no text, no watermark."
P={
'zhaoyun':("Zhao Yun, young heroic general, silver-white armor and white plume, handsome sharp face, spear, cold moonlight","silver blue"),
'huangzhong':("Huang Zhong, veteran archer general, 60 years old, white beard, weathered strong face, bronze scale armor, longbow, autumn forest","bronze amber"),
'machao':("Ma Chao, young fierce cavalry general of Xiliang, white silver armor, white plume helmet, handsome stern face, spear, desert dust","silver white"),
'lvbu':("Lu Bu, peerless warrior, gold crown with two long pheasant feathers, red and gold armor, handsome arrogant face, halberd, fire and smoke","cinnabar gold"),
'dongzhuo':("Dong Zhuo, tyrannical warlord, heavy dark robes, cruel fat face, long beard, gold ornaments, smoke and torchlight","charcoal gold"),
'caocao':("Cao Cao, cunning warlord, dark blue and gold armor, narrow calculating eyes, short beard, black crown, cold moonlight","indigo gold"),
'sunquan':("Sun Quan, young lord of Wu, red and gold armor, handsome resolute face, short beard, river and warships background","cinnabar gold"),
'zhouyu':("Zhou Yu, elegant Wu commander, red armor and gold trim, handsome refined face, feather fan, river fire","cinnabar gold"),
'huanggai':("Huang Gai, old Wu general, white beard, red armor, determined weathered face, fire ships","cinnabar bronze"),
'zhangjiao':("Zhang Jiao, Yellow Turban leader, yellow daoist robe, wild white hair and beard, mystical glowing eyes, yellow headband, storm and talismans","ochre yellow"),
'huaxiong':("Hua Xiong, brutal Dong Zhuo general, heavy dark armor, fierce bearded face, huge blade, burning gate","charcoal red"),
'xiahoudun':("Xiahou Dun, one-eyed Wei general, black eyepatch, dark blue armor, scarred face, stern","indigo steel"),
'zhangliao':("Zhang Liao, Wei cavalry general, dark blue and silver armor, sharp heroic face, spear, cold wind","indigo silver"),
'simayi':("Sima Yi, cunning Wei strategist, dark robe, narrow intelligent eyes, goatee, black fan, shadowy court","black indigo"),
'chengyuanzhi':("Cheng Yuanzhi, Yellow Turban cavalry commander, yellow headscarf, rough beard, captured Han armor, fierce","ochre yellow"),
'dengmao':("Deng Mao, Yellow Turban infantry commander, yellow headscarf, weathered face, simple lamellar, spear","ochre yellow"),
'caoren':("Cao Ren, Wei general, heavy dark blue armor, resolute bearded face, defensive shield","indigo steel"),
'xiahouyuan':("Xiahou Yuan, Wei archer general, dark blue armor, sharp bearded face, bow, mountain pass","indigo steel"),
}
M={
'yellowBrute':("Yellow Turban brute soldier, yellow headscarf, ragged lamellar armor, fierce weathered face, rebel army","ochre yellow"),
'yellowArcher':("Yellow Turban archer, yellow headscarf, simple leather armor, bow and arrow, rebel army","ochre yellow"),
'dongBrute':("Western Liang heavy soldier, dark iron armor, curved blade, dust and smoke","charcoal red"),
'weiInfantry':("Wei dynasty infantryman, dark blue and steel lamellar armor, shield and spear, disciplined","indigo steel"),
'weiCavalry':("Wei tiger cavalryman, dark blue and silver armor, plumed helmet, spear, cold wind","indigo silver"),
'wuMarine':("Wu dynasty marine, red and bronze armor, river warships, determined","cinnabar bronze"),
}
def post(path,data):
 req=urllib.request.Request(BASE+path,data=json.dumps(data).encode(),headers={'Content-Type':'application/json'})
 return json.loads(urllib.request.urlopen(req,timeout=30).read())
def get(path): return json.loads(urllib.request.urlopen(BASE+path,timeout=30).read())
def wait(jid,timeout=420):
 t=time.time(); errs=0
 while time.time()-t<timeout:
  time.sleep(2)
  try: j=get('/jobs/'+jid); errs=0
  except Exception as e:
   errs+=1; print(' poll err',e,flush=True)
   if errs>5: return None
   time.sleep(3); continue
  if j.get('status') in ('done','error','failed'): return j
 return None
def gen(prompt,prefix):
 for attempt in range(3):
  try:
   r=post('/generate',{'kind':'image','prompt':prompt,'preset':'portrait','seed':20261111+int(hashlib.md5(prefix.encode()).hexdigest()[:6],16)%99999,'prefix':prefix})
   jid=r.get('job_id') or r.get('id'); print(' job',jid,flush=True)
   j=wait(jid)
   if j and j.get('status')=='done' and j.get('files'):
    fn=j['files'][0]; return urllib.request.urlopen(BASE+'/files/'+fn,timeout=60).read()
   print(' bad',j,flush=True)
  except Exception as e: print(' err',attempt,e,flush=True)
  time.sleep(4)
 return None
def save(data,dest):
 raw=Path('/tmp')/('h3_'+dest.stem+'.png'); raw.write_bytes(data)
 im=Image.open(raw).convert('RGB'); im=ImageOps.fit(im,(576,1024),method=Image.LANCZOS,centering=(.5,.35))
 im.save(dest,'WEBP',quality=88,method=6); raw.unlink(missing_ok=True); print(' saved',dest,flush=True)
for k,(desc,bg) in P.items():
 dest=OUT/'portraits'/f'{k}.webp'
 if dest.exists(): print('skip',k,flush=True); continue
 print('GEN',k,flush=True); data=gen(STYLE+f" Subject: {desc}. Background: {bg} ink wash.",'tk_'+k)
 if data: save(data,dest)
for k,(desc,bg) in M.items():
 dest=OUT/'portraits'/f'{k}.webp'
 if dest.exists(): print('skip',k,flush=True); continue
 print('GEN mook',k,flush=True); data=gen(STYLE+f" Subject: {desc}. Background: {bg} ink wash.",'tk_'+k)
 if data: save(data,dest)
# manifest
man={'portraits':{},'backdrops':{},'misc':{}}
for f in sorted((OUT/'portraits').glob('*.webp')): man['portraits'][f.stem]=f'assets/generated/portraits/{f.name}'
for f in sorted((OUT/'backdrops').glob('*.webp')): man['backdrops'][f.stem]=f'assets/generated/backdrops/{f.name}'
if (OUT/'misc'/'menu.webp').exists(): man['misc']['menu']='assets/generated/misc/menu.webp'
# aliases
aliases={'dongCavalry':'dongBrute','dongArcher':'dongBrute','weiArcher':'weiInfantry','jingArcher':'wuMarine','shuInfantry':'weiInfantry'}
for a,b in aliases.items():
 if b in man['portraits']: man['portraits'][a]=man['portraits'][b]
Path('assets/manifest.js').write_text('window.AI_ASSETS = '+json.dumps(man,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
print('DONE',len(man['portraits']),flush=True)

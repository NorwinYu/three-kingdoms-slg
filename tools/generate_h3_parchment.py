import json,urllib.request,time,io
from pathlib import Path
from PIL import Image,ImageOps
BASE=__import__('os').environ.get('H3_URL','http://127.0.0.1:8190');OUT=Path('assets/generated/misc');OUT.mkdir(parents=True,exist_ok=True)
def post(p,d):
 r=urllib.request.Request(BASE+p,data=json.dumps(d).encode(),headers={'Content-Type':'application/json'});return json.loads(urllib.request.urlopen(r,timeout=30).read())
def get(p):return json.loads(urllib.request.urlopen(BASE+p,timeout=30).read())
p="Seamless ancient Chinese parchment paper texture, warm beige rice paper, subtle ink stains, fibers, faint folds, aged edges, no text, no objects, no people, top-down, tileable, high detail"
r=post('/generate',{'kind':'image','prompt':p,'preset':'1k','seed':121212,'prefix':'tk_parchment'});print(r)
for i in range(120):
 time.sleep(2);j=get('/jobs/'+r['job_id'])
 if j.get('status')=='done' and j.get('files'):
  data=urllib.request.urlopen(BASE+'/files/'+j['files'][0],timeout=60).read();im=Image.open(io.BytesIO(data)).convert('RGB');w,h=im.size;s=min(w,h);im=ImageOps.fit(im,(s,s),method=Image.LANCZOS).resize((768,768),Image.LANCZOS);im.save(OUT/'parchment.webp','WEBP',quality=90,method=6);print('saved', (OUT/'parchment.webp').stat().st_size);break
 if j.get('status') in ('error','failed'):
  print(j);break

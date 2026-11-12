import json,urllib.request,time
from pathlib import Path
BASE=__import__('os').environ.get('H3_URL','http://127.0.0.1:8190');OUT=Path('assets/generated/videos');OUT.mkdir(parents=True,exist_ok=True)
def post(p,d):
 r=urllib.request.Request(BASE+p,data=json.dumps(d).encode(),headers={'Content-Type':'application/json'});return json.loads(urllib.request.urlopen(r,timeout=30).read())
def get(p):return json.loads(urllib.request.urlopen(BASE+p,timeout=30).read())
def wait(jid):
 for i in range(240):
  time.sleep(2)
  try:j=get('/jobs/'+jid)
  except Exception:continue
  if j.get('status') in ('done','error','failed'):return j
 return None
jobs={
'lvbu':("<Picture 1> is the exact character portrait. Animate a cinematic boss introduction: subtle breathing, eyes narrowing, armor glinting, embers and smoke drifting around him, very slow camera push. Keep the face, costume and colors exactly. No text, no extra characters.",'boss_lvbu.png'),
'caocao':("<Picture 1> is the exact character portrait. Animate a cinematic boss introduction: subtle breathing, a cold calculating gaze, dark cape moving slightly, blue torchlight flickering, very slow camera push. Keep the face, costume and colors exactly. No text, no extra characters.",'boss_caocao.png'),
'dongzhuo':("<Picture 1> is the exact character portrait. Animate a cinematic boss introduction: heavy breathing, cruel eyes, gold ornaments glinting, smoke and torch embers drifting, very slow camera push. Keep the face, costume and colors exactly. No text, no extra characters.",'boss_dongzhuo.png'),
}
for k,(prompt,ref) in jobs.items():
 dest=OUT/f'boss_{k}.mp4'
 if dest.exists():print('skip',k,flush=True);continue
 print('GEN',k,flush=True)
 try:
  r=post('/generate',{'kind':'video','prompt':prompt,'seed':727272+len(k)*31,'frames':73,'steps':8,'prefix':'tk_boss_'+k,'refs':[ref]});print(r,flush=True);j=wait(r['job_id']);print(j,flush=True)
  if j and j.get('status')=='done' and j.get('files'):
   dest.write_bytes(urllib.request.urlopen(BASE+'/files/'+j['files'][0],timeout=90).read());print('saved',dest,dest.stat().st_size,flush=True)
 except Exception as e:print('err',e,flush=True)

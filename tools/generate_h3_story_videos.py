import json,urllib.request,time
from pathlib import Path
BASE=__import__('os').environ.get('H3_URL','http://127.0.0.1:8190');OUT=Path('assets/generated/videos');OUT.mkdir(parents=True,exist_ok=True)
def post(p,d):
 r=urllib.request.Request(BASE+p,data=json.dumps(d).encode(),headers={'Content-Type':'application/json'});return json.loads(urllib.request.urlopen(r,timeout=30).read())
def get(p):return json.loads(urllib.request.urlopen(BASE+p,timeout=30).read())
def wait(jid):
 for i in range(200):
  time.sleep(2)
  try:j=get('/jobs/'+jid)
  except Exception:continue
  if j.get('status') in ('done','error','failed'):return j
 return None
jobs={
'dawn':("<Picture 1> is the exact empty battlefield at dawn. Animate a subtle cinematic establishing shot: slow forward camera push, low mist drifting across the valley, abandoned banners moving in wind, faint embers. Keep the composition and lighting. No people, no soldiers, no new objects, no text.",'story_dawn.png'),
'fire':("<Picture 1> is the exact empty river battlefield at night. Animate a subtle cinematic shot: slow camera push, red smoke drifting, embers rising, distant burning wrecks flickering. Keep composition and lighting. No people, no soldiers, no new objects, no text.",'story_fire.png'),
}
for k,(prompt,ref) in jobs.items():
 dest=OUT/f'story_{k}.mp4'
 if dest.exists():print('skip',k);continue
 print('GEN',k,flush=True)
 r=post('/generate',{'kind':'video','prompt':prompt,'seed':919191+len(k)*71,'frames':73,'steps':8,'prefix':'tk_story_'+k,'refs':[ref]});print(r,flush=True)
 j=wait(r['job_id']);print(j,flush=True)
 if j and j.get('status')=='done' and j.get('files'):
  dest.write_bytes(urllib.request.urlopen(BASE+'/files/'+j['files'][0],timeout=90).read());print('saved',dest,dest.stat().st_size,flush=True)

"""Generate a short H3 menu video via agent API H3 agent service."""
import json,urllib.request,time
BASE=__import__('os').environ.get('H3_URL','http://127.0.0.1:8190')
def post(p,d):
 r=urllib.request.Request(BASE+p,data=json.dumps(d).encode(),headers={'Content-Type':'application/json'});return json.loads(urllib.request.urlopen(r,timeout=30).read())
def get(p):return json.loads(urllib.request.urlopen(BASE+p,timeout=30).read())
p="Cinematic slow aerial push across an empty ancient Chinese battlefield at dusk, no people, no soldiers, no characters, no figures, abandoned war banners moving in wind, drifting smoke and embers, ink-wash mountains, muted cinnabar and antique gold, 24fps, no text"
try:
 r=post('/generate',{'kind':'video','prompt':p,'seed':424242,'frames':73,'steps':8,'prefix':'tk_menu_video'});print(r)
except Exception as e: print('ERR',e); raise SystemExit
jid=r.get('job_id');print('jid',jid)
for i in range(150):
 time.sleep(2)
 try:j=get('/jobs/'+jid)
 except Exception as e: print('poll',e);continue
 print(i,j.get('status'),j.get('files'))
 if j.get('status') in ('done','error','failed'):break

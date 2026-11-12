/* ============================================================
   烽火三国 · 战阵
   Three.js 战旗战场 / 回合制战斗 / 战法 / AI / 演出
   ============================================================ */
const BATTLE = (() => {
'use strict';
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
function isMobileView(){ return window.innerWidth<=900 || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches); }
const manhattan=(a,b)=>Math.abs(a.c-b.c)+Math.abs(a.r-b.r);
let S=null;
const TIMES={
  dawn:{top:0x122323,horizon:0x96a795,fog:0x6e7f74,fogD:.024,amb:0x93a994,ambI:.4,sun:0xffd2a0,sunI:1.0,sunPos:[-8,11,7],cloud:0xdfe2d4},
  day:{top:0x224652,horizon:0xaab7a4,fog:0x84988b,fogD:.02,amb:0xaebfb0,ambI:.46,sun:0xfff0cf,sunI:1.12,sunPos:[-6,13,6],cloud:0xeae8d8},
  dusk:{top:0x1e1c27,horizon:0xa56f52,fog:0x6f6459,fogD:.027,amb:0x9d8f86,ambI:.38,sun:0xffb071,sunI:.95,sunPos:[7,9,5],cloud:0xd0b19c},
  storm:{top:0x131b1e,horizon:0x4b5654,fog:0x3f4846,fogD:.033,amb:0x6d7c78,ambI:.42,sun:0xb8c8c4,sunI:.55,sunPos:[4,10,-5],cloud:0x8b9694},
  fire:{top:0x1b171d,horizon:0xa95034,fog:0x66493f,fogD:.026,amb:0xb08b7d,ambI:.46,sun:0xff9d63,sunI:1.05,sunPos:[8,8,5],cloud:0xd4a18c}
};

/* ---------------- 工具 ---------------- */
function bwait(ms){
  return new Promise(res=>{
    const start=performance.now();
    const tick=()=>{
      if(!S||!S.active||S.ending) return;
      if(S.paused){ setTimeout(tick,120); return; }
      if(performance.now()-start>=ms/S.speed) res(); else setTimeout(tick,60);
    };
    tick();
  });
}
function addTween(dur, fn, ease){
  return new Promise(res=>{
    if(!S) return res();
    S.tweens.push({t:0,dur:Math.max(.01,dur),fn:fn||(()=>{}),res,ease:ease||(x=>1-Math.pow(1-x,3))});
  });
}
function waitUntil(cond,timeout=3000){
  return new Promise(res=>{
    const t0=performance.now();
    const tick=()=>{ if(!S||!S.active) return res(false); if(cond()||performance.now()-t0>timeout) res(true); else setTimeout(tick,50); };
    tick();
  });
}
function bfeed(text,cls=''){
  if(!S) return;
  const el=$('#battleFeed'); if(!el) return;
  const d=document.createElement('div'); d.className='feed-line '+cls; d.innerHTML=text; el.appendChild(d);
  S.log.push({text,cls}); if(S.log.length>100) S.log.shift();
  while(el.children.length>5) el.removeChild(el.firstChild);
}
function toast(text,type=''){ if(window.UI) UI.toast(text,'',type||'',2200); }

/* ---------------- 启动 ---------------- */
function start(cfg,onEnd){
  cleanup();
  S={
    active:true,paused:false,ending:false,busy:false,cfg,onEnd,round:0,queue:[],current:null,canAct:false,
    units:[],playerUnits:[],enemyUnits:[],allyUnits:[],kills:0,tweens:[],fx:[],particles:[],fireZones:[],log:[],
    selected:null,mode:null,pendingSkill:null,moveData:null,attackTiles:new Set(),skillTiles:new Set(),
    hoverUnit:null,hoverTile:null,time:0,speed:SETTINGS.speed||1,shake:0,introT:0,overSoon:false,
    raycastHits:[],tilePick:[],pickables:[],bannerMeshes:[],clouds:[],waterMats:[],listeners:[],rng:Math.random,
    tutorialStep:0,attackTargets:[],turnToken:0,isMobile:isMobileView(),miniAcc:0,pointers:new Map(),mobileTargets:[],autoBattle:false,prevSpeed:null,lastPhaseSide:null,suppressTargetSheet:false,threatGroup:null,threatUnit:null,hitStop:0
  };
  try{
    initScene(); buildBoard(); buildProps(); spawnAllUnits(); initUI(); bindBattleEvents(); setupMobileBattle();
    S.active=true;
    updateHUD(); updateObjectiveUI();
    S.loop=requestAnimationFrame(renderLoop);
    showIntro();
  }catch(e){
    console.error('Battle init failed',e);
    toast('战场初始化失败：'+e.message,'bad');
    setTimeout(()=>{ if(S){S.ending=true;} cleanup(); onEnd&&onEnd({victory:false,retry:false,error:true}); },600);
  }
}

function cleanup(){
  if(!S) return;
  S.active=false;
  if(S.loop) cancelAnimationFrame(S.loop);
  if(S.renderer){ try{ S.renderer.dispose(); }catch(e){} }
  S.listeners.forEach(({el,type,fn})=>el.removeEventListener(type,fn));
  const stage=$('#battleStage'); if(stage) stage.innerHTML='';
  ['#battleQueue','#battleIntel','#battleFeed','#battleCommand','#battleActions'].forEach(sel=>{ const el=$(sel); if(el) el.innerHTML=''; });
  const fx=$('#fxRoot'); if(fx) fx.innerHTML='';
  const tut=$('#battleTutorial'); if(tut) tut.classList.add('hidden');
  const banner=$('.battle-result-banner'); if(banner) banner.remove();
  const intro=$('.battle-intro'); if(intro) intro.remove();
  const bars=$('#battleBars'); if(bars) bars.classList.remove('show');
  const cut=$('#battleCutin'); if(cut) cut.classList.remove('show');
  const bvid=$('#bossVideo'); if(bvid){ bvid.pause(); bvid.classList.remove('show'); bvid.removeAttribute('src'); }
  closeMobileQueue();
  closeMobileTargets();
  const mi=$('#mobileInfo'); if(mi){ mi.classList.remove('open'); mi.innerHTML=''; }
  const mt=$('#mobileTargets'); if(mt){ mt.classList.remove('open'); mt.innerHTML=''; }
  const tip=$('#rotateTip'); if(tip) tip.classList.add('hide');
  S=null;
}

/* ---------------- 场景 ---------------- */
function initScene(){
  const stage=$('#battleStage'); stage.innerHTML='';
  const W=stage.clientWidth||window.innerWidth, H=stage.clientHeight||window.innerHeight;
  const renderer=new THREE.WebGLRenderer({antialias:SETTINGS.quality!=='low',alpha:true,powerPreference:'high-performance'});
  renderer.setSize(W,H,false); renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, S.isMobile?1.4:(SETTINGS.quality==='low'?1:SETTINGS.quality==='medium'?1.4:2)));
  renderer.outputEncoding=THREE.sRGBEncoding; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=.82;
  renderer.shadowMap.enabled=!S.isMobile&&SETTINGS.quality!=='low'; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  stage.appendChild(renderer.domElement);
  S.renderer=renderer;
  const scene=new THREE.Scene();
  const time=Object.assign({id:S.cfg.time},TIMES[S.cfg.time]||TIMES.dawn);
  scene.fog=new THREE.FogExp2(time.fog,time.fogD);
  const camera=new THREE.PerspectiveCamera(40,W/H,.1,220);
  camera.position.set(0,12,17); camera.lookAt(0,0,0);
  S.scene=scene; S.camera=camera;
  S.cam={theta:Math.PI/2+.08,phi:S.isMobile?.76:.88,dist:S.isMobile?(window.innerWidth>window.innerHeight?14.5:27):14.9,target:new THREE.Vector3(0,.25,0)};
  S.skyTime=time;
  // sky dome
  const skyGeo=new THREE.SphereGeometry(90,32,18);
  const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color(time.top)},bottom:{value:new THREE.Color(time.horizon)}},
    vertexShader:'varying vec3 vWorld; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vWorld=wp.xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:'uniform vec3 top; uniform vec3 bottom; varying vec3 vWorld; void main(){ float h=clamp(normalize(vWorld).y*1.5+.12,0.0,1.0); vec3 c=mix(bottom,top,pow(h,.65)); gl_FragColor=vec4(c,1.0); }'});
  const skyMesh=new THREE.Mesh(skyGeo,skyMat); scene.add(skyMesh); S.skyMesh=skyMesh;
  // lights
  const hemi=new THREE.HemisphereLight(time.amb,0x101510,time.ambI); scene.add(hemi);
  const sun=new THREE.DirectionalLight(time.sun,time.sunI); sun.position.set(-11,8,6); sun.castShadow=!S.isMobile&&SETTINGS.quality!=='low';
  sun.shadow.mapSize.set(SETTINGS.quality==='high'?2048:1024,SETTINGS.quality==='high'?2048:1024);
  sun.shadow.camera.left=-10; sun.shadow.camera.right=10; sun.shadow.camera.top=9; sun.shadow.camera.bottom=-9; sun.shadow.camera.near=.5; sun.shadow.camera.far=40; sun.shadow.bias=-.0015;
  scene.add(sun); S.sun=sun;
  const rim=new THREE.DirectionalLight(time.cloud,.26); rim.position.set(-6,5,-9); scene.add(rim);
  const fill=new THREE.DirectionalLight(0x718f83,.12); fill.position.set(7,3,8); scene.add(fill);
  // sun disc
  const sunSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:ART.cloud(91),color:time.sun,transparent:true,opacity:.36,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));
  sunSprite.position.set(-18,11,-30); sunSprite.scale.set(13,13,1); scene.add(sunSprite);
  // clouds
  for(let i=0;i<14;i++){
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:ART.cloud(i+4),color:time.cloud,transparent:true,opacity:.10+Math.random()*.1,depthWrite:false,fog:false}));
    sp.position.set(-25+Math.random()*50,5+Math.random()*10,-18-Math.random()*18); sp.scale.set(9+Math.random()*18,4+Math.random()*6,1); sp.userData.speed=.15+Math.random()*.2;
    scene.add(sp); S.clouds.push(sp);
  }
  // camera-locked painted backdrop (ink mountains, sun, mist)
  const backTex=ART.battleBackdrop(time,3);
  const backMat=new THREE.MeshBasicMaterial({map:backTex,depthTest:false,depthWrite:false,fog:false,side:THREE.DoubleSide});
  if(window.AI_ASSETS&&window.AI_ASSETS.backdrops&&time&&time.id&&window.AI_ASSETS.backdrops[time.id]) backMat.color.setHex(0x62685f);
  const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(118,52),backMat);
  backdrop.position.set(0,-2.5,-58); backdrop.renderOrder=-100; camera.add(backdrop); scene.add(camera);
  if(S.skyMesh) S.skyMesh.visible=false;
  // ambient dust
  const N=160, pos=new Float32Array(N*3);
  for(let i=0;i<N;i++){ pos[i*3]=(Math.random()-.5)*18; pos[i*3+1]=.5+Math.random()*6; pos[i*3+2]=(Math.random()-.5)*14; }
  const pg=new THREE.BufferGeometry(); pg.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const pm=new THREE.PointsMaterial({map:ART.ember(),color:0xd8c69b,size:.055,transparent:true,opacity:.45,depthWrite:false,blending:THREE.AdditiveBlending});
  S.dust=new THREE.Points(pg,pm); scene.add(S.dust);
  // under-board clouds
  for(let i=0;i<8;i++){
    const c=new THREE.Sprite(new THREE.SpriteMaterial({map:ART.cloud(20+i),color:0xc8d0c2,transparent:true,opacity:.15,depthWrite:false,fog:false}));
    c.position.set(-10+Math.random()*20,-4+Math.random()*1.5,-6+Math.random()*12); c.scale.set(9+Math.random()*8,3+Math.random()*3,1); scene.add(c); S.clouds.push(c);
  }
  // horizon haze band
  for(let i=0;i<7;i++){
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:ART.cloud(70+i),color:0xa8b6a6,transparent:true,opacity:.18,depthWrite:false,fog:false}));
    sp.position.set(-26+i*9,1.8+Math.random()*1.4,-20-Math.random()*8); sp.scale.set(14+Math.random()*10,3.5+Math.random()*2,1); scene.add(sp);
  }
  // upper clouds
  for(let i=0;i<6;i++){
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:ART.cloud(110+i),color:0xd7ddd0,transparent:true,opacity:.13,depthWrite:false,fog:false}));
    sp.position.set(-22+i*9,8+Math.random()*5,-28-Math.random()*8); sp.scale.set(13+Math.random()*9,4+Math.random()*3,1); scene.add(sp);
  }
  // weather particles
  if(['rain','snow','fog'].includes(S.cfg.weather)){
    const isSnow=S.cfg.weather==='snow';
    const N=isSnow?180:320; const pos=new Float32Array(N*3); const vel=[];
    for(let i=0;i<N;i++){ pos[i*3]=(Math.random()-.5)*18; pos[i*3+1]=Math.random()*9; pos[i*3+2]=(Math.random()-.5)*14; vel.push(.5+Math.random()*.7); }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const pm=new THREE.PointsMaterial({color:isSnow?0xeef2f0:0x9fb8be,size:isSnow?.07:.045,transparent:true,opacity:isSnow?.7:.5,depthWrite:false});
    const pts=new THREE.Points(g,pm); pts.userData.vel=vel; pts.userData.snow=isSnow; scene.add(pts); S.weatherPts=pts;
    if(S.cfg.weather==='fog'){ for(let i=0;i<5;i++){ const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:ART.cloud(150+i),color:0xc6d0c2,transparent:true,opacity:.22,depthWrite:false})); sp.position.set(-8+i*4,1.4+Math.random()*1.8,-2-Math.random()*5); sp.scale.set(8,3,1); scene.add(sp); } }
    if(S.cfg.weather==='fog') scene.fog.density*=1.7;
  }
  // current unit marker
  const markMat=new THREE.MeshBasicMaterial({color:0xe7c884,transparent:true,opacity:.9});
  const mark=new THREE.Mesh(new THREE.ConeGeometry(.13,.32,4),markMat); mark.rotation.x=Math.PI; mark.visible=false; scene.add(mark); S.currentMarker=mark;
  S.clock=new THREE.Clock();
}

/* ---------------- 地形 ---------------- */
function parseMap(){
  const m=DATA.MAPS[S.cfg.map]||DATA.MAPS.zhuojunField;
  const rows=m.rows.slice(0,9);
  const cols=Math.max(...rows.map(r=>r.length));
  const grid=[];
  for(let r=0;r<9;r++){ grid[r]=[]; for(let c=0;c<cols;c++){ grid[r][c]=rows[r]?.[c]||'.'; } }
  S.cols=cols; S.rows=9; S.grid=grid; S.mapData=m;
  S.heights=[];
  for(let r=0;r<9;r++){ S.heights[r]=[]; for(let c=0;c<cols;c++){ const t=grid[r][c]; S.heights[r][c]=t==='h'?.28:t==='c'?.72:t==='r'?.36:t==='f'?.04:t==='b'?.02:0; } }
}
function tileTop(c,r){ return S.heights?.[r]?.[c]||0; }
function tileAt(c,r){ return S.grid?.[r]?.[c]||'r'; }
function isPassable(c,r){
  if(c<0||r<0||c>=S.cols||r>=S.rows) return false;
  const t=tileAt(c,r); return (DATA.TERRAIN[t]?.move||0)>0;
}
function tileToWorld(c,r){
  const t=1.04;
  return new THREE.Vector3((c-(S.cols-1)/2)*t, tileTop(c,r), (r-(S.rows-1)/2)*t);
}
function worldToTile(x,z){
  const t=1.04; return {c:Math.round(x/t+(S.cols-1)/2),r:Math.round(z/t+(S.rows-1)/2)};
}

function buildBoard(){
  parseMap();
  const t=1.04, boardW=S.cols*t, boardD=S.rows*t;
  const group=new THREE.Group(); S.boardGroup=group; S.scene.add(group);
  // base
  const baseMat=new THREE.MeshStandardMaterial({map:ART.texture('rock',9),color:0x8a8170,roughness:1,metalness:.02});
  if(baseMat.map){ baseMat.map.wrapS=baseMat.map.wrapT=THREE.RepeatWrapping; }
  const base=new THREE.Mesh(new THREE.BoxGeometry(boardW+1.3,.62,boardD+1.3),baseMat);
  base.position.y=-.48; base.receiveShadow=true; base.castShadow=true; group.add(base);
  // cliff rocks around the board edge
  const cliffMat=new THREE.MeshStandardMaterial({map:ART.texture('rock',3),color:0x8a8272,roughness:1,flatShading:true});
  const cliffGeo=new THREE.DodecahedronGeometry(1,0);
  const addCliff=(x,z)=>{
    const m=new THREE.Mesh(cliffGeo,cliffMat);
    const sc=.3+Math.random()*.55;
    m.position.set(x,-.42-Math.random()*1.5,z);
    m.scale.set(sc*(.8+Math.random()*.6),sc*(.7+Math.random()*.8),sc*(.8+Math.random()*.6));
    m.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);
    m.castShadow=true; m.receiveShadow=true; group.add(m);
  };
  for(let i=0;i<12;i++){
    const t=(i+.5)/12, x=-boardW/2-.9, z=-boardD/2+t*boardD;
    addCliff(x,z); addCliff(-x,z);
    const z2=-boardD/2-.9, x2=-boardW/2+t*boardW;
    addCliff(x2,z2); addCliff(x2,-z2);
  }
  // gold rim
  const rimMat=new THREE.MeshStandardMaterial({color:0x8a6c38,metalness:.45,roughness:.55});
  const rimGeo=new THREE.BoxGeometry(boardW+1.36,.05,boardD+1.36);
  const rim=new THREE.Mesh(rimGeo,rimMat); rim.position.y=-.17; group.add(rim);
  const rim2=new THREE.Mesh(new THREE.BoxGeometry(boardW+1.18,.08,boardD+1.18),new THREE.MeshStandardMaterial({color:0x2b2a22,roughness:.9}));
  rim2.position.y=-.13; group.add(rim2);
  // underside rocks
  const darkRock=new THREE.MeshStandardMaterial({color:0x2c302a,roughness:1,flatShading:true});
  for(let i=0;i<14;i++){
    const r=Math.random(); const g=new THREE.DodecahedronGeometry(.6+Math.random()*1.15,0);
    const m=new THREE.Mesh(g,darkRock);
    m.position.set((Math.random()-.5)*boardW*.88,-2.4-Math.random()*3.6,(Math.random()-.5)*boardD*.88);
    m.scale.y=.8+Math.random()*1.4; m.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3); group.add(m);
  }
  // under-mist
  for(let i=0;i<9;i++){
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:ART.cloud(40+i),color:0x8fa395,transparent:true,opacity:.12,depthWrite:false}));
    s.position.set((Math.random()-.5)*boardW,-3+Math.random()*1.5,(Math.random()-.5)*boardD); s.scale.set(8+Math.random()*7,2.5+Math.random()*2,1); group.add(s);
  }
  // tiles
  const topMats={}, sideMats={};
  function topMat(type,seed){ const key=type+'_'+seed; if(topMats[key]) return topMats[key]; const ai=ART.hasAITerrain(type); const tex=ai?ART.texture(type,seed):ART.texture(type,seed).clone(); if(!ai){ tex.needsUpdate=true; tex.repeat.set(1,1); } tex.encoding=THREE.sRGBEncoding; topMats[key]=new THREE.MeshStandardMaterial({map:tex,roughness:.97,metalness:0,color:new THREE.Color(ai?0xffffff:(seed===1?0xd8dccb:seed===2?0xd2cdb8:seed===3?0xc9d4c2:0xd8d3c2))}); return topMats[key]; }
  const sideColors={plain:0x4e4531,forest:0x2a3527,hill:0x5d5941,rock:0x46443d,water:0x303f3d,bridge:0x59452f,village:0x574832,wall:0x46453e,scorch:0x332d26,sand:0x77684c,road:0x6d5d45,city:0x504b3c};
  Object.keys(sideColors).forEach(k=>{ sideMats[k]=new THREE.MeshStandardMaterial({color:sideColors[k],roughness:1,flatShading:true,map:ART.texture('rock',1)}); });
  for(let r=0;r<S.rows;r++){
    for(let c=0;c<S.cols;c++){
      const ch=S.grid[r][c], info=DATA.TERRAIN[ch]||DATA.TERRAIN['.'];
      const pos=tileToWorld(c,r);
      if(ch==='w'){
        const bed=new THREE.Mesh(new THREE.BoxGeometry(t*.98,.16,t*.98),sideMats.water);
        bed.position.copy(pos); bed.position.y=-.2; bed.receiveShadow=true; group.add(bed);
        const wm=new THREE.MeshStandardMaterial({map:ART.texture('water',7),color:0xa8dadd,transparent:true,opacity:.9,roughness:.24,metalness:.12,emissive:0x0a252c,emissiveIntensity:.28});
        const water=new THREE.Mesh(new THREE.PlaneGeometry(t*.98,t*.98,8,8),wm); water.rotation.x=-Math.PI/2; water.position.copy(pos); water.position.y=-.05;
        water.userData.base=water.position.y; group.add(water); S.waterMats.push(water);
        const hit=new THREE.Mesh(new THREE.BoxGeometry(t*.98,.06,t*.98),new THREE.MeshBasicMaterial({visible:false}));
        hit.position.copy(pos); hit.position.y=.02; hit.userData={c,r}; group.add(hit); S.tilePick.push(hit);
        continue;
      }
      const h=S.heights[r][c];
      const boxH=.18+h;
      const geo=new THREE.BoxGeometry(t*.985,boxH,t*.985);
      const top=topMat(info.id,1+((r*7+c*13)%4)), side=sideMats[info.id]||sideMats.plain;
      const mesh=new THREE.Mesh(geo,[side,side,top,side,side,side]);
      mesh.position.copy(pos); mesh.position.y=h-boxH/2; mesh.receiveShadow=true; group.add(mesh);
      mesh.userData={c,r};
      const hit=new THREE.Mesh(new THREE.BoxGeometry(t*.98,.12,t*.98),new THREE.MeshBasicMaterial({visible:false}));
      hit.position.copy(pos); hit.position.y=h+.03; hit.userData={c,r}; group.add(hit); S.tilePick.push(hit);
      // edges / elevation
      if(h>0){
        const ed=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(t*.99,boxH,t*.99)),new THREE.LineBasicMaterial({color:0x2a2c24,transparent:true,opacity:.3}));
        ed.position.copy(mesh.position); group.add(ed);
      }
    }
  }
  // board border posts
  for(let i=0;i<4;i++){
    const x=(i<2?-1:1)*(boardW/2+.48), z=(i%2?-1:1)*(boardD/2+.48);
    const post=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,1.0,6),new THREE.MeshStandardMaterial({color:0x3b2e1d,roughness:.8}));
    post.position.set(x,.25,z); post.castShadow=true; group.add(post);
    const cap=new THREE.Mesh(new THREE.SphereGeometry(.1,8,6),new THREE.MeshStandardMaterial({color:0xa8884c,metalness:.5,roughness:.5}));
    cap.position.set(x,.8,z); group.add(cap);
  }
  buildSkyDetails();
}
function buildSkyDetails(){
  // birds
  S.birds=[];
  for(let i=0;i<5;i++){
    const g=new THREE.Group();
    const m=new THREE.LineBasicMaterial({color:0x1b2622,transparent:true,opacity:.6});
    const pts=[new THREE.Vector3(-.3,0,0),new THREE.Vector3(0,.12,0),new THREE.Vector3(.3,0,0)];
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),m); g.add(line);
    g.position.set(-12+Math.random()*24,7+Math.random()*5,-14-Math.random()*8); g.userData={phase:Math.random()*9,speed:.4+Math.random()*.4};
    S.scene.add(g); S.birds.push(g);
  }
}

/* ---------------- 装饰 ---------------- */
function buildProps(){
  const group=new THREE.Group(); S.propsGroup=group; S.scene.add(group);
  const rnd=ART.mulberry32(90210);
  const addProp=(name,x,y,z,w,h)=>{ const tex=ART.propTexture(name); if(!tex) return false; const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,alphaTest:.04,depthWrite:false})); spr.position.set(x,y+h/2,z); spr.scale.set(w,h,1); group.add(spr); return true; };
  const treeMats=[new THREE.MeshStandardMaterial({color:0x203a28,roughness:.9,flatShading:true}),new THREE.MeshStandardMaterial({color:0x294832,roughness:.9,flatShading:true}),new THREE.MeshStandardMaterial({color:0x182e21,roughness:.9,flatShading:true})];
  const trunkMat=new THREE.MeshStandardMaterial({color:0x3d2f20,roughness:1});
  const rockMat=new THREE.MeshStandardMaterial({color:0x5b5a50,roughness:1,flatShading:true});
  const woodMat=new THREE.MeshStandardMaterial({color:0x5a4228,roughness:.9});
  const roofMat=new THREE.MeshStandardMaterial({color:0x49382c,roughness:.95});
  for(let r=0;r<S.rows;r++)for(let c=0;c<S.cols;c++){
    const ch=S.grid[r][c], p=tileToWorld(c,r);
    if(ch==='f'){
      const n=2+(rnd()>.5?1:0);
      for(let i=0;i<n;i++){
        const off=.24+rnd()*.18, ang=rnd()*Math.PI*2;
        const tx=p.x+Math.cos(ang)*off, tz=p.z+Math.sin(ang)*off;
        const th=1.3+rnd()*.5;
        if(!addProp(rnd()>.5?'tree1':'tree2',tx,p.y,tz,th*.75,th)){
          const tree=new THREE.Group(); tree.position.set(tx,p.y,tz);
          const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.055,.085,th*.42,5),trunkMat); trunk.position.y=th*.21; tree.add(trunk);
          for(let j=0;j<3;j++){ const cone=new THREE.Mesh(new THREE.ConeGeometry(.32-j*.07,th*.55,5),treeMats[Math.floor(rnd()*treeMats.length)]); cone.position.y=th*.3+j*th*.19; cone.castShadow=true; tree.add(cone); }
          group.add(tree);
        }
      }
      if(rnd()>.55){ const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.12+rnd()*.12,0),rockMat); rock.position.set(p.x+(rnd()-.5)*.5,p.y+.06,p.z+(rnd()-.5)*.5); group.add(rock); }
    } else if(ch==='h'){
      for(let i=0;i<2;i++){ const rx=p.x+(rnd()-.5)*.6, rz=p.z+(rnd()-.5)*.6; if(!addProp('rock1',rx,p.y,rz,.5+rnd()*.3,.35+rnd()*.3)){ const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.12+rnd()*.2,0),rockMat); rock.position.set(rx,p.y+.08,rz); rock.scale.y=.7; rock.castShadow=true; group.add(rock); } }
      if(rnd()>.5){ const bush=new THREE.Mesh(new THREE.SphereGeometry(.16,6,5),treeMats[1]); bush.position.set(p.x+(rnd()-.5)*.5,p.y+.13,p.z+(rnd()-.5)*.5); bush.scale.y=.7; group.add(bush); }
    } else if(ch==='b'){
      const planks=new THREE.Group();
      for(let i=0;i<6;i++){ const p1=new THREE.Mesh(new THREE.BoxGeometry(.95,.045,.12),woodMat); p1.position.set(0,0,-.36+i*.145); planks.add(p1); }
      planks.position.copy(p); planks.position.y=p.y+.02; group.add(planks);
    } else if(ch==='v'){
      const house=new THREE.Group();
      const base=new THREE.Mesh(new THREE.BoxGeometry(.46,.32,.4),new THREE.MeshStandardMaterial({color:0x8a7959,roughness:1})); base.position.y=.16; house.add(base);
      const roof=new THREE.Mesh(new THREE.ConeGeometry(.36,.22,4),roofMat); roof.position.y=.39; roof.rotation.y=Math.PI/4; house.add(roof);
      house.position.set(p.x,p.y,p.z); group.add(house);
      if(rnd()>.5){ const smoke=new THREE.Sprite(new THREE.SpriteMaterial({map:ART.smoke(),color:0xcfc7b6,transparent:true,opacity:.18,depthWrite:false})); smoke.position.set(p.x,p.y+1.0,p.z); smoke.scale.set(.8,.8,1); group.add(smoke); }
    } else if(ch==='c'){
      // battlement on wall
      for(let i=0;i<2;i++){ const merlon=new THREE.Mesh(new THREE.BoxGeometry(.28,.3,.28),new THREE.MeshStandardMaterial({color:0x5b5a50,roughness:1})); merlon.position.set(p.x+(i?-.25:.25),p.y+.15,p.z); merlon.castShadow=true; group.add(merlon); }
    } else if(ch==='r'){
      const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.38,0),rockMat); rock.position.set(p.x,p.y+.1,p.z); rock.scale.set(1,.8,1); rock.rotation.set(rnd(),rnd(),rnd()); rock.castShadow=true; group.add(rock);
    } else if(ch==='scorch'){
      if(rnd()>.5){ const stump=new THREE.Mesh(new THREE.CylinderGeometry(.05,.08,.25,5),new THREE.MeshStandardMaterial({color:0x241b14})); stump.position.set(p.x+(rnd()-.5)*.4,p.y+.12,p.z+(rnd()-.5)*.4); group.add(stump); }
    } else {
      if(rnd()>.72){ const tuft=new THREE.Mesh(new THREE.ConeGeometry(.035,.18,3),new THREE.MeshStandardMaterial({color:0x4e6138,roughness:1})); tuft.position.set(p.x+(rnd()-.5)*.7,p.y+.09,p.z+(rnd()-.5)*.7); tuft.rotation.z=(rnd()-.5)*.4; group.add(tuft); }
      if(rnd()>.93){ const flower=new THREE.Mesh(new THREE.SphereGeometry(.035,5,4),new THREE.MeshBasicMaterial({color:rnd()>.5?0xc9b56a:0xc78b7d})); flower.position.set(p.x+(rnd()-.5)*.7,p.y+.12,p.z+(rnd()-.5)*.7); group.add(flower); }
    }
  }
  // terrain decals: dirt patches and dry grass
  for(let i=0;i<26;i++){
    const c=1+Math.floor(rnd()*(S.cols-2)), r=1+Math.floor(rnd()*(S.rows-2));
    if(tileAt(c,r)!==' '){} // noop
    if(!['.','s','v'].includes(tileAt(c,r))) continue;
    const p=tileToWorld(c,r);
    const mat=new THREE.MeshBasicMaterial({color:rnd()>.5?0x7d6b44:0x8f9660,transparent:true,opacity:.12+rnd()*.1,depthWrite:false,side:THREE.DoubleSide});
    const m=new THREE.Mesh(new THREE.CircleGeometry(.18+rnd()*.32,10),mat); m.rotation.x=-Math.PI/2; m.position.set(p.x+(rnd()-.5)*.6,p.y+.055,p.z+(rnd()-.5)*.6); m.scale.y=.7; group.add(m);
  }
  // river boats
  if(['chibi','jiangxia','jianye'].includes(S.cfg.map)){
    let boatCount=0;
    for(let r=0;r<S.rows;r++)for(let c=0;c<S.cols;c++){
      if(tileAt(c,r)!=='w'||boatCount>=5) continue;
      if((r*3+c*7)%4!==0) continue;
      const p=tileToWorld(c,r); const boat=new THREE.Group(); boat.position.set(p.x,p.y+.02,p.z);
      const hull=new THREE.Mesh(new THREE.BoxGeometry(.52,.1,.2),new THREE.MeshStandardMaterial({color:0x4b3826,roughness:.9})); hull.position.y=.07; boat.add(hull);
      const bow=new THREE.Mesh(new THREE.ConeGeometry(.1,.22,4),new THREE.MeshStandardMaterial({color:0x5b452e,roughness:.9})); bow.rotation.z=-Math.PI/2; bow.position.set(.31,.08,0); boat.add(bow);
      const mast=new THREE.Mesh(new THREE.CylinderGeometry(.012,.016,.55,4),new THREE.MeshStandardMaterial({color:0x3b2f20})); mast.position.set(0,.34,0); boat.add(mast);
      const sail=new THREE.Mesh(new THREE.PlaneGeometry(.3,.34),new THREE.MeshStandardMaterial({color:0xc8bfa8,roughness:.9,side:THREE.DoubleSide})); sail.position.set(.06,.4,0); sail.rotation.y=.3; boat.add(sail);
      boat.rotation.y=(r*1.7+c)*.4; boatCount++; group.add(boat);
    }
  }
  // camp decor: tents, war drums, torches and banners
  const tentMat=new THREE.MeshStandardMaterial({color:0x6b5a42,roughness:.95});
  const tentDark=new THREE.MeshStandardMaterial({color:0x3a3024,roughness:1});
  const poleMat=new THREE.MeshStandardMaterial({color:0x3a2d1c,roughness:.85});
  function campBanner(x,z,text,col,scale=1){
    const g=new THREE.Group(); g.position.set(x,0,z); g.scale.setScalar(scale);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.06,3.2,6),poleMat); pole.position.y=1.6; g.add(pole);
    const tex=ART.banner(text,col);
    const cloth=new THREE.Mesh(new THREE.PlaneGeometry(.8,1.35,6,8),new THREE.MeshStandardMaterial({map:tex,transparent:true,alphaTest:.05,side:THREE.DoubleSide,roughness:.9}));
    cloth.position.set(.44,2.5,0); cloth.rotation.y=.15; g.add(cloth);
    S.bannerMeshes.push({mesh:cloth,base:cloth.geometry.attributes.position.array.slice(),phase:Math.random()*6});
    g.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
    S.propsGroup.add(g);
  }
  [[-7.2,-2.9],[-7.2,2.9],[7.2,-2.9],[7.2,2.9]].forEach(([x,z],i)=>{
    const tent=new THREE.Group(); tent.position.set(x,0,z); tent.scale.setScalar(.62);
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.6,.68,.75,7),tentMat); body.position.y=.38; tent.add(body);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(.9,.65,7),tentDark); roof.position.y=1.0; tent.add(roof);
    tent.rotation.y=i*.8; tent.traverse(o=>{if(o.isMesh)o.castShadow=true;}); S.propsGroup.add(tent);
  });
  campBanner(-7.4,.2,'蜀','#3f7a56',1.05);
  campBanner(7.4,-.3,'魏','#476d9e',1.05);
  // war drums
  [[-5.9,4.0],[5.9,-4.0]].forEach(([x,z])=>{
    const g=new THREE.Group(); g.position.set(x,0,z); g.scale.setScalar(.72);
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.42,.5,.6,10),new THREE.MeshStandardMaterial({color:0x7b4b33,roughness:.85})); body.rotation.z=Math.PI/2; body.position.y=.55; g.add(body);
    const skin=new THREE.Mesh(new THREE.CircleGeometry(.4,12),new THREE.MeshStandardMaterial({color:0xd0bc94,roughness:.9})); skin.rotation.y=Math.PI/2; skin.position.set(.31,.55,0); g.add(skin);
    g.traverse(o=>{if(o.isMesh)o.castShadow=true;}); S.propsGroup.add(g);
  });
  // torches with glow
  [[-6.2,3.6],[6.2,3.6],[-6.2,-3.6],[6.2,-3.6]].forEach(([x,z],i)=>{
    const g=new THREE.Group(); g.position.set(x,0,z);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.035,.05,1.6,5),poleMat); pole.position.y=.8; g.add(pole);
    const flame=new THREE.Sprite(new THREE.SpriteMaterial({map:ART.ember(),color:0xffb35e,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending})); flame.position.y=1.72; flame.scale.set(.55,.75,1); g.add(flame);
    S.propsGroup.add(g);
    if(i<2){ const pl=new THREE.PointLight(0xff9a52,.55,7,2); pl.position.set(x,1.7,z); S.scene.add(pl); }
  });
  // fireflies at dusk
  if(S.cfg.time==='dusk'||S.cfg.time==='fire'){
    const N=40,pos=new Float32Array(N*3);
    for(let i=0;i<N;i++){ pos[i*3]=(Math.random()-.5)*12; pos[i*3+1]=.4+Math.random()*2.5; pos[i*3+2]=(Math.random()-.5)*9; }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pos,3));
    S.fireflies=new THREE.Points(g,new THREE.PointsMaterial({map:ART.ember(),color:0xffb45e,size:.14,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending}));
    S.scene.add(S.fireflies);
  }
}

/* ---------------- 单位 ---------------- */
const CLASS_FALLBACK={infantry:'mighty',spear:'mighty',cavalry:'mighty',archer:'arrowRain',strategist:'huoji',commander:'guwu'};
function genericStats(defId,lv){
  const d=CORE.genDef(defId); if(!d) return null;
  const lv1=Math.max(1,Math.min(20,lv||1)); const b=d.base, gr=d.growth||{};
  const stat=k=>Math.round((b[k]||50)+((gr[k]!==undefined?gr[k]:.5)*(lv1-1)));
  const cls=DATA.CLASSES[d.class]||DATA.CLASSES.infantry;
  return { might:stat('might'),lead:stat('lead'),int:stat('int'),pol:stat('pol'),charm:stat('charm'),
    atk:Math.round((26+stat('might')*1.15+lv1*2.2)*(cls.atk||1)), def:Math.round((14+stat('lead')*.7+lv1*1.6)*(cls.def||1)),
    hp:Math.round((300+stat('lead')*3.2+lv1*22)*(cls.hp||1)), speed:(b.speed||12)+lv1*.15, move:cls.move, range:cls.range,minRange:cls.minRange,
    crit:.06,counter:.42,class:d.class,className:cls.name };
}
function makeUnit(defId,side,lv,opts={}){
  const d=CORE.genDef(defId); if(!d) return null;
  const faction=opts.faction||d.faction||'wei';
  const isPlayerSide=side==='player'||side==='ally';
  let st;
  if(side==='player' && GS.generals[defId]){
    st=CORE.genStats(GS.generals[defId]);
    lv=GS.generals[defId].level;
  } else {
    st=genericStats(defId,lv);
  }
  if(!st) return null;
  const diff=DATA.DIFFICULTY[GS.difficulty]||DATA.DIFFICULTY.normal;
  if(side==='enemy'){
    const mult=diff.enemy;
    st.atk=Math.round(st.atk*mult); st.def=Math.round(st.def*mult); st.hp=Math.round(st.hp*mult);
  }
  if(side==='player'){
    const tech=CORE.techBonus(), form=DATA.FORMATIONS[S.cfg.formation]||DATA.FORMATIONS.yulin;
    st.atk=Math.round(st.atk*(1+tech.atk+(form.buff?.atk||0)));
    st.def=Math.round(st.def*(1+tech.def+(form.buff?.def||0)));
    st.hp=Math.round(st.hp*(1+tech.hp));
    st.crit=(st.crit||0)+(form.buff?.crit||0)+(tech.crit||0);
    st.move+=(tech.move||0)+(d.class==='cavalry'?(tech.cavMove||0):0);
    st.speed*=1+(d.class==='cavalry'?(tech.cavSpeed||0):0);
    if(tech.rage) st.rage=tech.rage;
  }
  const boss=S.cfg.objective?.boss===defId || opts.boss;
  if(boss){ st.hp=Math.round(st.hp*1.28); st.atk=Math.round(st.atk*1.1); }
  const skills=(d.skills&&d.skills.length?d.skills:[CLASS_FALLBACK[d.class]||'mighty']).filter(x=>DATA.SKILLS[x]);
  const sideFaction=side==='ally'?'wu':faction;
  const u={
    uid:'u'+(S.uidSeq=(S.uidSeq||0)+1), defId, name:d.name, title:d.title||'', side, faction:sideFaction, cls:d.class,
    lv:lv||1, stats:st, maxHp:st.hp, hp:st.hp, rage:Math.min(100,(opts.rage??20)+(side==='player'?((CORE.techBonus().rage||0)+(st.rage||0)):0)),
    atk:st.atk, def:st.def, int:st.int, speed:st.speed+rand(0,.8), move:st.move, range:st.range, minRange:st.minRange,
    crit:st.crit||.05, counter:st.counter??.42, skills:skills.slice(0,2), buffs:[], status:{}, alive:true, acted:false, moved:false, movedDist:0,
    c:0,r:0, isBoss:!!boss, portrait:defId, kills:0, stats:{dmg:0,taken:0,heal:0,kills:0}
  };
  return u;
}
function spawnAllUnits(){
  const cfg=S.cfg;
  const playerIds=(cfg.playerIds&&cfg.playerIds.length?cfg.playerIds:CORE.playerGenerals().slice(0,5).map(g=>g.id)).slice(0,5);
  const playerSlots=[[1,2],[1,4],[1,6],[0,3],[2,5]];
  playerIds.forEach((id,i)=>{
    const u=makeUnit(id,'player',GS.generals[id]?.level||1,{faction:'shu'});
    if(u){ const p=findFreeSpot(playerSlots[i]||[1,3+i%3],'player'); u.c=p.c;u.r=p.r; addUnit(u,'player'); S.playerUnits.push(u); }
  });
  (cfg.enemies||[]).forEach((e,i)=>{
    const id=e.g||e.mook; const pos=e.pos||[[10,2],[10,4],[10,6],[9,3],[9,5],[10,1]][i%6];
    const u=makeUnit(id,'enemy',e.lv||1,{faction:cfg.enemyFaction,boss:e.boss});
    if(u){ const p=findFreeSpot(pos,'enemy'); u.c=p.c;u.r=p.r; addUnit(u,'enemy'); S.enemyUnits.push(u); }
  });
  (cfg.allies||[]).forEach((a,i)=>{
    const u=makeUnit(a.g,'ally',a.lv||1,{faction:'wu'});
    if(u){ const p=findFreeSpot(a.pos||[[2,1],[2,7]][i%2],'ally'); u.c=p.c;u.r=p.r; addUnit(u,'ally'); S.allyUnits.push(u); }
  });
  // initial facing
  S.units.forEach(u=>{ faceUnit(u,u.side==='enemy'?-1:1); });
}
function addUnit(u,side){
  const group=makeSquadModel(u); group.scale.setScalar(1.3); u.group=group;
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.5,20),new THREE.MeshBasicMaterial({color:0x0b0d09,transparent:true,opacity:.24,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2; shadow.position.y=.065; group.add(shadow);
  const p=tileToWorld(u.c,u.r); group.position.set(p.x,p.y,p.z);
  S.scene.add(group);
  // invisible hit mesh
  const hit=new THREE.Mesh(new THREE.CylinderGeometry(.56,.56,2.3,8),new THREE.MeshBasicMaterial({visible:false}));
  hit.position.y=1.0; hit.userData={uid:u.uid}; group.add(hit); S.pickables.push(hit);
  u.hit=hit;
  if(!S.units.includes(u)) S.units.push(u);
  // spawn animation
  group.position.y+=1.4; group.scale.setScalar(.7);
  addTween(.55, t=>{ const e=1-Math.pow(1-t,3); group.position.y=p.y+1.4*(1-e); group.scale.setScalar(.7+.6*e); },x=>x);
  // dust
  spawnDust(p,.6,7,0x9a8d6d);
}
function findFreeSpot(pref,side){
  let [c0,r0]=pref||[1,4];
  const occupied=(c,r)=>S.units.some(u=>u.alive&&u.c===c&&u.r===r)||S._pending?.some?.(p=>p.c===c&&p.r===r);
  if(isPassable(c0,r0)&&!occupied(c0,r0)) return {c:c0,r:r0};
  for(let rad=1;rad<=5;rad++){
    for(let dr=-rad;dr<=rad;dr++)for(let dc=-rad;dc<=rad;dc++){
      if(Math.abs(dr)!==rad&&Math.abs(dc)!==rad) continue;
      let c=c0+dc,r=r0+dr;
      if(side==='enemy'){ c=clamp(c,Math.floor(S.cols/2)+1,S.cols-1); } else { c=clamp(c,0,Math.floor(S.cols/2)-1); }
      r=clamp(r,0,S.rows-1);
      if(isPassable(c,r)&&!occupied(c,r)) return {c,r};
    }
  }
  for(let r=0;r<S.rows;r++)for(let c=0;c<S.cols;c++){ if(isPassable(c,r)&&!occupied(c,r)) return {c,r}; }
  return {c:c0,r:r0};
}
function faceUnit(u,dir){
  // 1 = east, -1 = west
  u.facing=dir||1;
  if(u.group) u.group.rotation.y=dir>0?Math.PI/2:-Math.PI/2;
}
function faceToward(u,target){
  const dx=target.c-u.c, dz=target.r-u.r;
  if(u.group) u.group.rotation.y=Math.atan2(dx,dz);
}

/* ---------------- 模型 ---------------- */
function makeMat(color,opts={}){ return new THREE.MeshStandardMaterial({color,roughness:opts.rough??.85,metalness:opts.metal??0,flatShading:true,emissive:opts.emissive||0x000000,emissiveIntensity:opts.ei||0}); }
function makeSquadModel(u){
  const g=new THREE.Group();
  const fac=DATA.FACTIONS[u.faction]||DATA.FACTIONS.wei;
  const color=fac.colorHex||0x557a5d;
  const cls=u.cls;
  const accentMap={guanyu:0x3f7a52,zhangfei:0x353b38,zhaoyun:0xd6d6c8,zhugeliang:0xe0ddcf,liubei:0x4f8b6b,lvbu:0x9a3a2c,caocao:0x425b80,huanggai:0xb05640,zhouyu:0xb45a42};
  const robeCol=accentMap[u.defId]||color;
  const skin=0xd3a47e, armor=0x3a3c35, gold=0xb99554;
  const mats={};
  const M=(c,o)=>{ if(!mats[c+JSON.stringify(o||{})]) mats[c+JSON.stringify(o||{})]=makeMat(c,o||{}); return mats[c+JSON.stringify(o||{})]; };
  // base disc
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.455,.47,.055,28),M(u.side==='enemy'?0x5c2e26:u.side==='ally'?0x7a5a2f:0x2f5c45,{rough:.7}));
  base.position.y=.03; base.receiveShadow=true; g.add(base);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.43,.018,6,32),M(gold,{metal:.6,rough:.35,emissive:0x3a2a0e,ei:.35}));
  ring.rotation.x=-Math.PI/2; ring.position.y=.062; g.add(ring);
  const selRing=new THREE.Mesh(new THREE.TorusGeometry(.52,.022,6,40),new THREE.MeshBasicMaterial({color:0xe7c884,transparent:true,opacity:.9}));
  selRing.rotation.x=-Math.PI/2; selRing.position.y=.07; selRing.visible=false; g.add(selRing); u.selRing=selRing;
  // 2.5D painterly unit sprite
  const unitTex=ART.unitSprite(u);
  const aiUnit=!!(window.AI_ASSETS&&window.AI_ASSETS.units&&window.AI_ASSETS.units[u.defId]);
  const sprMat=new THREE.SpriteMaterial({map:unitTex,transparent:true,alphaTest:.02,depthWrite:false,depthTest:true});
  const spr=new THREE.Sprite(sprMat);
  if(aiUnit){ spr.scale.set(.72,1.34,1); spr.position.set(0,.66,.03); } else { spr.scale.set(1.38,1.72,1); spr.position.set(0,.86,.03); }
  g.add(spr); u.sprite=spr;
  // hp bar (canvas sprite: reliable billboard, always readable)
  const barCv=document.createElement('canvas'); barCv.width=160; barCv.height=26;
  const barTex=new THREE.CanvasTexture(barCv); barTex.encoding=THREE.sRGBEncoding;
  const bar=new THREE.Sprite(new THREE.SpriteMaterial({map:barTex,transparent:true,depthTest:false,depthWrite:false}));
  bar.scale.set(.9,.15,1); bar.position.set(0,1.52,.03); bar.renderOrder=999;
  g.add(bar); u.bar=bar; u.barCv=barCv; u.barTex=barTex;
  updateUnitBar(u);
  // name label sprite? keep bar only
  g.traverse(o=>{ if(o.isMesh){ o.castShadow=SETTINGS.quality!=='low'; o.receiveShadow=false; } });
  return g;
}
function makeSoldier(u,robe,M,scale,leader){
  const g=new THREE.Group(); g.scale.setScalar(scale);
  const skin=0xd2a17b, armorCol=0x3d4039, trim=0xb79352;
  const legsM=M(0x2b2c28,{rough:.9}), bodyM=M(robe,{rough:.88});
  const legL=new THREE.Mesh(new THREE.CylinderGeometry(.06,.07,.42,5),legsM); legL.position.set(-.1,.22,0); g.add(legL);
  const legR=legL.clone(); legR.position.x=.1; g.add(legR);
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.16,.2,.56,7),bodyM); body.position.y=.68; g.add(body);
  const armor=new THREE.Mesh(new THREE.CylinderGeometry(.19,.21,.36,7),M(armorCol,{rough:.7,metal:.15})); armor.position.y=.74; g.add(armor);
  // shoulder plates
  [-.2,.2].forEach(x=>{ const p=new THREE.Mesh(new THREE.SphereGeometry(.11,6,5,0,Math.PI*2,0,Math.PI/2),M(armorCol,{rough:.65,metal:.2})); p.position.set(x,.94,0); p.scale.set(1,.6,1); g.add(p); });
  const head=new THREE.Mesh(new THREE.SphereGeometry(.145,10,8),M(skin,{rough:.75})); head.position.y=1.13; g.add(head);
  const helmet=new THREE.Mesh(new THREE.ConeGeometry(.17,.24,6),M(u.side==='enemy'?0x41382e:0x494c40,{rough:.6,metal:.25})); helmet.position.y=1.28; g.add(helmet);
  const crest=new THREE.Mesh(new THREE.BoxGeometry(.025,.16,.06),M(trim,{metal:.4,rough:.5})); crest.position.y=1.4; g.add(crest);
  // arms
  const armM=M(robe,{rough:.9});
  const armL=new THREE.Mesh(new THREE.CylinderGeometry(.045,.05,.36,5),armM); armL.position.set(-.23,.78,.03); armL.rotation.z=.35; g.add(armL);
  const armR=new THREE.Mesh(new THREE.CylinderGeometry(.045,.05,.36,5),armM); armR.position.set(.23,.78,.06); armR.rotation.z=-.35; g.add(armR);
  // leader extras
  if(leader){
    const cape=new THREE.Mesh(new THREE.PlaneGeometry(.4,.62,4,6),new THREE.MeshStandardMaterial({color:shadeHex(robe,-25),side:THREE.DoubleSide,roughness:.95}));
    cape.position.set(0,.8,-.18); cape.rotation.x=.08; g.add(cape); u.cape=cape;
    if(u.defId==='guanyu'){ const beard=new THREE.Mesh(new THREE.ConeGeometry(.08,.32,5),M(0x1b1410,{rough:.9})); beard.position.set(0,1.0,.13); beard.rotation.x=.2; g.add(beard); }
    if(u.defId==='zhangfei'){ const beard=new THREE.Mesh(new THREE.SphereGeometry(.13,6,5),M(0x1a1410,{rough:.9})); beard.position.set(0,1.0,.12); beard.scale.set(1,.9,.6); g.add(beard); }
    if(u.defId==='zhugeliang'){ const fan=new THREE.Mesh(new THREE.CircleGeometry(.17,10,0,Math.PI),M(0xe7dfc8,{rough:.9})); fan.position.set(.3,1.0,.08); fan.rotation.z=-.8; g.add(fan); }
    if(u.defId==='lvbu'){ const f1=new THREE.Mesh(new THREE.ConeGeometry(.018,.55,4),M(0xd9bf78,{metal:.5,rough:.4})); f1.position.set(-.1,1.55,-.02); f1.rotation.z=.35; g.add(f1); const f2=f1.clone(); f2.position.x=.1; f2.rotation.z=-.35; g.add(f2); }
  }
  // weapons
  const metal=M(0xb9beb3,{metal:.7,rough:.35}), wood=M(0x4a3824,{rough:.8});
  if(u.cls==='spear'){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.022,.025,1.5,5),wood); pole.position.set(.3,.78,.08); pole.rotation.z=-.08; g.add(pole);
    const tip=new THREE.Mesh(new THREE.ConeGeometry(.065,.3,4),metal); tip.position.set(.36,1.55,.08); g.add(tip);
  } else if(u.cls==='archer'){
    const bow=new THREE.Mesh(new THREE.TorusGeometry(.28,.018,5,12,Math.PI*1.3),wood); bow.position.set(-.28,.95,.16); bow.rotation.set(Math.PI/2,0,-.3); g.add(bow);
    const string=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.4,.72,.16),new THREE.Vector3(-.4,1.2,.16)]),new THREE.LineBasicMaterial({color:0xd8cfb5})); g.add(string);
    const quiver=new THREE.Mesh(new THREE.CylinderGeometry(.06,.05,.42,5),wood); quiver.position.set(-.05,.9,-.18); quiver.rotation.x=.2; g.add(quiver);
  } else if(u.cls==='strategist'){
    const staff=new THREE.Mesh(new THREE.CylinderGeometry(.02,.028,1.35,5),wood); staff.position.set(.3,.76,.05); g.add(staff);
    const orb=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),M(0xd9b86b,{metal:.4,rough:.3,emissive:0x5a4318,ei:.5})); orb.position.set(.3,1.45,.05); g.add(orb);
  } else {
    const blade=new THREE.Mesh(new THREE.BoxGeometry(.055,.55,.02),metal); blade.position.set(.3,.98,.08); blade.rotation.z=-.15; g.add(blade);
    const guard=new THREE.Mesh(new THREE.BoxGeometry(.16,.035,.05),M(trim,{metal:.5,rough:.4})); guard.position.set(.3,.72,.08); g.add(guard);
    if(u.cls==='infantry'||u.cls==='commander'){
      const shield=new THREE.Mesh(new THREE.CircleGeometry(.22,8),M(0x4b4a3c,{rough:.8})); shield.position.set(-.3,.75,.12); shield.rotation.y=.1; g.add(shield);
      const boss=new THREE.Mesh(new THREE.SphereGeometry(.045,6,5),M(trim,{metal:.5,rough:.4})); boss.position.set(-.3,.75,.13); g.add(boss);
    }
  }
  return g;
}
function makeHorse(u,robe,M){
  const g=new THREE.Group();
  const coatCol={guanyu:0x8a3b2f,zhaoyun:0xd9d6c8,machao:0xd8d2c2,lvbu:0x9a3a2c,zhangfei:0x2a2925}[u.defId]||0x6a4d35;
  const coat=M(coatCol,{rough:.9}), dark=M(0x2a231c,{rough:.9}), trim=M(0xb99554,{metal:.5,rough:.4});
  const body=new THREE.Mesh(new THREE.BoxGeometry(.34,.4,.82),coat); body.position.y=.66; g.add(body);
  const neck=new THREE.Mesh(new THREE.BoxGeometry(.2,.45,.26),coat); neck.position.set(0,.9,.38); neck.rotation.x=-.35; g.add(neck);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.17,.19,.38),coat); head.position.set(0,1.12,.5); head.rotation.x=.2; g.add(head);
  const mane=new THREE.Mesh(new THREE.BoxGeometry(.05,.2,.32),dark); mane.position.set(0,1.02,.32); mane.rotation.x=-.3; g.add(mane);
  [[-.13,-.24],[.13,-.24],[-.13,.27],[.13,.27]].forEach(([x,z])=>{ const leg=new THREE.Mesh(new THREE.CylinderGeometry(.045,.04,.55,5),dark); leg.position.set(x,.28,z); g.add(leg); });
  const tail=new THREE.Mesh(new THREE.ConeGeometry(.06,.4,5),dark); tail.position.set(0,.75,-.47); tail.rotation.x=-.5; g.add(tail);
  const saddle=new THREE.Mesh(new THREE.BoxGeometry(.38,.09,.32),trim); saddle.position.set(0,.88,.02); g.add(saddle);
  return g;
}
function shadeHex(hex,amt){ return new THREE.Color(hex).offsetHSL(0,0,amt/400).getHex(); }
function spawnDust(pos,scale=1,count=8,color=0xa89a7c){
  for(let i=0;i<count;i++){
    const geo=new THREE.SphereGeometry(.05+Math.random()*.08,5,4);
    const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.5,depthWrite:false}));
    m.position.set(pos.x+(Math.random()-.5)*.7,pos.y+.1+Math.random()*.2,pos.z+(Math.random()-.5)*.7);
    S.scene.add(m); S.fx.push({mesh:m,type:'dust',t:0,dur:.5+Math.random()*.4,vy:.5+Math.random()*.6});
  }
}
function removeUnitModel(u){
  if(!u.group) return;
  u.alive=false;
  const g=u.group;
  g.traverse(o=>{ if((o.isMesh||o.isSprite)&&o.material){ if(Array.isArray(o.material)) o.material.forEach(m=>{m.transparent=true;}); else o.material.transparent=true; }});
  addTween(.8,t=>{ g.position.y=tileToWorld(u.c,u.r).y-.7*t; g.rotation.z=.5*t; g.scale.setScalar(1-.25*t); g.traverse(o=>{ if((o.isMesh||o.isSprite)&&o.material){ if(Array.isArray(o.material)) o.material.forEach(m=>{m.opacity=1-t;}); else o.material.opacity=1-t; }}); },x=>x)
    .then(()=>{ if(S&&S.scene) S.scene.remove(g); });
  spawnDust(tileToWorld(u.c,u.r),1,12,0x8d7a5f);
  addRing(tileToWorld(u.c,u.r),0x9a3f32,.9);
}

/* ---------------- 回合流程 ---------------- */
function showIntro(){
  const screen=$('#screen-battle');
  const el=document.createElement('div'); el.className='battle-intro';
  const ch=S.cfg.title||'战斗';
  el.innerHTML=`<div class="bi-kicker">${S.cfg.kind==='story'?'章回战':'战阵'}</div><div class="bi-title">${ch}</div><div class="bi-sub">${S.cfg.objective?.text||'击败敌军'}</div><div class="bi-line"></div><div class="bi-hint">兵马已列 · 静候鼓声</div>`;
  screen.appendChild(el);
  const bars=$('#battleBars'); if(bars) bars.classList.add('show');
  const bossId=S.cfg.objective?.type==='boss'?S.cfg.objective.boss:null;
  const boss=(bossId&&(S.enemyUnits.find(u=>u.defId===bossId)||(()=>{const d=DATA.GENERALS[bossId]||DATA.MOOKS[bossId];return d?{defId:bossId,portrait:bossId,name:d.name,title:d.title||''}:null;})()))||null;
  const bsrc=boss&&window.AI_ASSETS&&AI_ASSETS.videos&&AI_ASSETS.videos['boss_'+boss.defId];
  const introDelay=1700;
  if(boss) setTimeout(()=>{ if(S&&S.active) showCutin({portrait:boss.portrait,kicker:'敌将登场',title:boss.name,sub:boss.title||'万军之中，取上将首级',enemy:true,video:(!S.isMobile&&!SETTINGS.liteMode)?bsrc:null}); },420);
  if(SETTINGS.reduceMotion){ S.introT=1; if(bars) bars.classList.remove('show'); setTimeout(()=>{ if(!S||!S.active) return; el.classList.add('out'); setTimeout(()=>el.remove(),200); nextRound(); },260); return; }
  addTween(1.35,t=>{ S.introT=t; },x=>x);
  setTimeout(()=>{
    if(!S||!S.active) return;
    el.classList.add('out'); if(bars) bars.classList.remove('show');
    setTimeout(()=>el.remove(),700);
    nextRound();
  },introDelay);
}
function nextRound(){
  if(!S||!S.active||S.ending) return;
  if(!S.playerUnits.some(u=>u.alive)){ finish(false); return; }
  S.round++;
  if(S.cfg.objective?.type==='survive' && S.round>S.cfg.objective.rounds){ finish(true); return; }
  applyRoundEvents();
  S.queue=S.units.filter(u=>u.alive).sort((a,b)=>(b.speed+(Math.random()*.4))-(a.speed+(Math.random()*.4)));
  S.queue.forEach(u=>{u.acted=false;});
  bfeed(`<b>第 ${S.round} 回合</b>　${roundWeatherHint()}`, 'sys');
  updateObjectiveUI();
  nextTurn();
}
function applyRoundEvents(){
  const cfg=S.cfg;
  if(cfg.waves){
    cfg.waves.forEach(w=>{
      if(w.round!==S.round) return;
      w.units.forEach((e,i)=>{
        const id=e.g||e.mook; const pos=e.pos||[[10,4],[9,2],[10,6]][i%3];
        const u=makeUnit(id,'enemy',e.lv||1,{faction:cfg.enemyFaction,boss:e.boss});
        if(u){ const p=findFreeSpot(pos,'enemy'); u.c=p.c;u.r=p.r; addUnit(u,'enemy'); S.enemyUnits.push(u); faceUnit(u,-1); }
      });
      if(w.shout){ bfeed(`<b>${w.shout}</b>`,'enemy'); S.shake=.35; }
    });
  }
  if(cfg.special==='chibiFire' && S.round===3){
    bfeed('<b>东南风起！火船顺江而下，曹军水寨化为火海！</b>','sys');
    S.shake=.7;
    S.enemyUnits.filter(u=>u.alive).forEach(u=>{
      const pos=unitWorld(u);
      fireBurst(pos,16);
      const burn=Math.round(u.maxHp*.12);
      applyDamage(u,burn,null,{silent:false,color:'fire'});
      addBurn(u,{turns:2,dmg:Math.round(u.maxHp*.05)});
    });
    for(let i=0;i<10;i++){ const c=2+Math.floor(Math.random()*(S.cols-4)),r=Math.floor(Math.random()*S.rows); if(tileAt(c,r)==='w'||tileAt(c,r)==='b') addFireZone(c,r); }
    addScreenFlash('#ff7a3a',.18);
  }
  if(cfg.special==='bowangFire' && S.round===2){
    bfeed('<b>博望坡林间火起，曹军阵脚大乱！</b>','sys');
    S.enemyUnits.filter(u=>u.alive&&tileAt(u.c,u.r)==='f').forEach(u=>{
      fireBurst(unitWorld(u),10);
      applyDamage(u,Math.round(u.maxHp*.1),null,{silent:false});
      addBurn(u,{turns:2,dmg:Math.round(u.maxHp*.04)});
    });
    S.shake=.4;
  }
}
function roundWeatherHint(){
  const w=DATA.WEATHERS[S.cfg.weather]; if(!w) return '';
  return {wind:'风助火势，弓骑逞威。',rain:'大雨滂沱，火攻难施。',fog:'浓雾蔽野，远程难及。',snow:'风雪交加，行军艰难。',clear:'天朗气清，正宜决战。'}[w.id]||'';
}
function showPhaseBanner(kicker,title,color){
  if(!S) return;
  const el=$('#phaseBanner'); if(!el) return;
  el.querySelector('.pb-kicker').textContent=kicker||'';
  el.querySelector('.pb-title').textContent=title||'';
  el.style.setProperty('--pb-color',color||'#c9a45f');
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(S.phaseTimer); S.phaseTimer=setTimeout(()=>{ if(S&&S.active) el.classList.remove('show'); },1400);
}
function showCutin({portrait,kicker,title,sub,enemy=false,video=null}){
  if(!S) return;
  const el=$('#battleCutin'); if(!el) return;
  el.className='battle-cutin'+(enemy?' enemy':'');
  const img=el.querySelector('img'); const cv=el.querySelector('video');
  if(video&&cv){ cv.src=video; cv.classList.add('show'); if(img) img.style.display='none'; cv.play().catch(()=>{}); }
  else { if(cv){ cv.classList.remove('show'); cv.removeAttribute('src'); } if(img){ img.style.display=''; img.src=ART.portrait(portrait||'liubei'); } }
  el.querySelector('.cutin-kicker').textContent=kicker||'';
  el.querySelector('.cutin-title').textContent=title||'';
  el.querySelector('.cutin-sub').textContent=sub||'';
  el.classList.add('show');
  clearTimeout(S.cutinTimer); S.cutinTimer=setTimeout(()=>{ if(S&&S.active) el.classList.remove('show'); },1700);
}
function nextTurn(){
  if(!S||!S.active||S.ending||S.overSoon) return;
  if(!S.playerUnits.some(u=>u.alive)){ finish(false); return; }
  if(!S.queue.length){ nextRound(); return; }
  let u=S.queue.shift();
  while(u&&!u.alive){ u=S.queue.shift(); }
  if(!u){ nextRound(); return; }
  S.current=u; S.selected=null; S.mode=null; S.pendingSkill=null; S.canAct=false; S.busy=false;
  u.moved=false; u.movedDist=0; u.prevPos=null;
  if(u.side!==S.lastPhaseSide){ S.lastPhaseSide=u.side; showPhaseBanner(u.side==='player'?'我方行动':u.side==='ally'?'盟军行动':'敌方行动',u.name,u.side==='enemy'?'#cf7866':'#8cc69b'); }
  clearHighlights(); closeSkillPop(); updateHUD(); updateQueue();
  const token=++S.turnToken;
  setTimeout(async()=>{
    try{
      if(!S||!S.active||S.ending||S.turnToken!==token) return;
      // turn-start status
      await turnStartStatus(u);
      if(!S||!S.active||S.ending||!u.alive||S.turnToken!==token) return;
      if(u.status.stun){
        u.status.stun--;
        bfeed(`<b>${u.name}</b> 陷入混乱，无法行动。`,'sys');
        updateHUD(); await bwait(550); finishUnitTurn(u,true); return;
      }
      if(u.side==='player'&&!S.autoBattle) beginPlayerTurn(u);
      else await aiTurn(u);
    }catch(e){ console.error('[battle turn error]',e.stack||e); }
  },240);
}
async function turnStartStatus(u){
  // buff duration
  u.buffs=u.buffs.filter(b=>{ b.turns--; return b.turns>0; });
  if(u.status.burn){
    const dmg=u.status.burn.dmg||Math.round(u.maxHp*.05);
    applyDamage(u,dmg,null,{silent:false});
    u.status.burn.turns--;
    if(u.status.burn.turns<=0) delete u.status.burn;
    bfeed(`<b>${u.name}</b> 被烈焰灼烧，损失 ${dmg} 兵力。`,'sys');
    if(!u.alive){ await bwait(400); return; }
    await bwait(350);
  }
  // standing in fire
  if(S.fireZones.some(f=>f.c===u.c&&f.r===u.r)&&!u.status.burn){
    const dmg=Math.round(u.maxHp*.06); applyDamage(u,dmg,null,{silent:false}); bfeed(`<b>${u.name}</b> 身陷火海，损失 ${dmg} 兵力。`,'sys'); addBurn(u,{turns:1,dmg:Math.round(u.maxHp*.04)}); await bwait(250); if(!u.alive) return;
  }
  // village recovery
  if(tileAt(u.c,u.r)==='v'&&u.hp<u.maxHp){
    const heal=Math.round(u.maxHp*.05); u.hp=Math.min(u.maxHp,u.hp+heal); updateUnitBar(u);
  }
}
function beginPlayerTurn(u){
  S.canAct=true; S.selected=u; u.moved=false; u.acted=false;
  showMoveRange(u); updateHUD(); updateQueue();
  showIntel(u);
  if(S.cfg.chapterId==='ch0'&&SETTINGS.tutorial&&S.tutorialStep===0){ S.tutorialStep=1; setTimeout(()=>showTutorial('你的武将已自动选中。点击<b>发光的蓝色格子</b>移动。','战阵入门'),250); }
}
function finishUnitTurn(u,isAI){
  if(!S||!S.active||S.ending) return;
  if(u) u.acted=true;
  S.canAct=false; S.selected=null; S.mode=null; S.pendingSkill=null; S.busy=false;
  clearHighlights(); closeSkillPop(); closeMobileTargets(); updateHUD(); updateQueue();
  const delay=isAI?300:380;
  setTimeout(()=>{ if(S&&S.active&&!S.ending) nextTurn(); },delay);
}
function scheduleNext(){ setTimeout(()=>{ if(S&&S.active&&!S.ending) nextTurn(); },300); }

/* ---------------- 玩家行动 ---------------- */
function onAction(act){
  if(!S||!S.canAct||!S.current||S.busy||S.paused||S.ending) return;
  const u=S.current;
  if(act==='move'){
    if(u.moved){ toast('本回合已移动'); return; }
    S.mode=null; S.pendingSkill=null; closeSkillPop(); showMoveRange(u); updateHUD(); return;
  }
  if(act==='attack'){
    const targets=validAttackTargets(u);
    if(!targets.length){ toast('射程内没有敌军','bad'); return; }
    S.mode='attack'; S.pendingSkill=null; closeSkillPop(); showAttackRange(u); updateHint(); return;
  }
  if(act==='skill'){
    openSkillPop();
    return;
  }
  if(act==='wait'){
    S.mode=null; S.pendingSkill=null; clearHighlights(); finishUnitTurn(u);
  }
  if(act==='undo'){ undoMove(); }
}
async function undoMove(){
  if(!S||!S.canAct||!S.current||S.busy||S.ending) return;
  const u=S.current; if(!u.moved||!u.prevPos) return;
  const p=u.prevPos; u.prevPos=null; u.moved=false; u.movedDist=0;
  u.c=p.c; u.r=p.r; u.group.position.copy(tileToWorld(p.c,p.r));
  if(S.isMobile){ S.cam.target.set(u.group.position.x,.25,u.group.position.z); S.cam.dist=Math.min(S.cam.dist,24); clampCamTarget(); }
  S.mode=null; S.pendingSkill=null; closeSkillPop(); closeMobileTargets(); clearHighlights();
  showMoveRange(u); updateHUD(); toast('已撤回移动','可重新选择路线。','',1600);
}
function validAttackTargets(u){
  return S.units.filter(e=>e.alive&&isEnemy(u,e)&&inRange(u,e,u.range,u.minRange));
}
function inRange(a,b,range,minRange=1){
  const d=manhattan(a,b); let max=range;
  if(max>1&&tileAt(a.c,a.r)==='h') max++;
  if(S.cfg.weather==='fog'&&max>1) max=Math.max(1,max-1);
  if(S.cfg.weather==='rain'&&a.cls==='archer') max=Math.max(1,max-1);
  return d>=minRange&&d<=max;
}
function showMoveRange(u){
  const md=computeMoveData(u); S.moveData=md;
  clearHighlights(); S.mode='move'; S.suppressTargetSheet=false;
  const tiles=new Set();
  for(let r=0;r<S.rows;r++)for(let c=0;c<S.cols;c++){ if(md.dist[r][c]!==Infinity&&!(c===u.c&&r===u.r)) tiles.add(c+','+r); }
  highlightTiles(tiles,0x3fa9df,.52);
  S.moveTiles=tiles; updateHint();
}
function computeMoveData(u){
  const dist=Array.from({length:S.rows},()=>Array(S.cols).fill(Infinity));
  const prev=Array.from({length:S.rows},()=>Array(S.cols).fill(null));
  dist[u.r][u.c]=0;
  let move=u.move;
  if(S.cfg.weather==='rain'||S.cfg.weather==='snow') move=Math.max(1,move-1);
  const q=[{c:u.c,r:u.r,d:0}];
  while(q.length){
    q.sort((a,b)=>a.d-b.d); const cur=q.shift();
    if(cur.d!==dist[cur.r][cur.c]) continue;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dc,dr])=>{
      const c=cur.c+dc,r=cur.r+dr; if(c<0||r<0||c>=S.cols||r>=S.rows) return;
      const t=DATA.TERRAIN[tileAt(c,r)]||DATA.TERRAIN['.']; if(!t.move) return;
      const occupied=S.units.find(x=>x.alive&&x.c===c&&x.r===r&&x!==u);
      if(occupied&&isEnemy(u,occupied)) return;
      const cost=t.move; const nd=cur.d+cost;
      if(nd<=move&&nd<dist[r][c]){ dist[r][c]=nd; prev[r][c]={c:cur.c,r:cur.r}; q.push({c,r,d:nd}); }
    });
  }
  return {dist,prev,move};
}
function pathTo(md,c,r){
  const path=[]; let cur={c,r};
  while(cur&&!(cur.c===S.current.c&&cur.r===S.current.r)){ path.unshift(cur); cur=md.prev[cur.r]?.[cur.c]; }
  return path;
}
async function moveUnit(u,target,isAI=false){
  if(u.moved) return;
  const md=computeMoveData(u); S.moveData=md; const tc=target.c,tr=target.r;
  if(md.dist[tr]?.[tc]===Infinity) return;
  const occupied=S.units.find(x=>x.alive&&x!==u&&x.c===tc&&x.r===tr);
  if(occupied) return;
  const path=pathTo(md,tc,tr); if(!path.length) return;
  if(!isAI) u.prevPos={c:u.c,r:u.r};
  S.busy=true; S.canAct=false; clearHighlights(); updateHUD();
  const startDist=path.length;
  for(const step of path){
    const from=u.group.position.clone(), to=tileToWorld(step.c,step.r);
    faceToward(u,step);
    await addTween(.17, t=>{ const e=t*t*(3-2*t); u.group.position.lerpVectors(from,to,e); u.group.position.y=to.y+Math.sin(Math.PI*t)*.12; },x=>x);
    u.c=step.c; u.r=step.r; u.group.position.copy(to);
    spawnDust(new THREE.Vector3(to.x,to.y,to.z),.35,2,0x9c8b6c);
  }
  u.moved=true; u.movedDist=startDist;
  S.busy=false;
  if(!isAI){
    S.canAct=true; showAttackRange(u,true); updateHUD();
    if(S.cfg.chapterId==='ch0'&&SETTINGS.tutorial&&S.tutorialStep===1){ S.tutorialStep=2; if(validAttackTargets(u).length) showTutorial('很好。点击<b>「攻击」</b>，再选择红色范围内的敌人。','战阵入门'); else showTutorial('继续向敌军靠近。若无法接敌，可点击<b>「待机」</b>结束此将行动。','战阵入门'); }
    if(!validAttackTargets(u).length && !u.skills.some(s=>(DATA.SKILLS[s]?.cost||0)<=u.rage)){ updateHint('移动完毕，可待机或继续观察。'); }
  }
  updateHUD();
}
function startAttackFromClick(defender){
  closeMobileTargets();
  const u=S.current;
  if(!u||!defender) return;
  if(!validAttackTargets(u).includes(defender)) return;
  performBasicAttack(u,defender).then(()=>{ if(S&&S.active&&!S.ending) finishUnitTurn(u); });
}
function showAttackRange(u,subtle=false){
  S.mode='attack'; S.attackTiles=new Set();
  clearHighlights();
  const tiles=new Set();
  for(let r=0;r<S.rows;r++)for(let c=0;c<S.cols;c++){ const d=Math.abs(c-u.c)+Math.abs(r-u.r); if(d>=u.minRange&&d<=u.range+(tileAt(u.c,u.r)==='h'?1:0)){ tiles.add(c+','+r); } }
  S.suppressTargetSheet=!!subtle;
  highlightTiles(tiles,0xcf4d3e,subtle?.2:.46);
  S.attackTiles=tiles;
  validAttackTargets(u).forEach(t=>{ if(t.selRing) t.selRing.visible=true; });
  updateHint(); if(!subtle) showMobileTargets();
}
function openSkillPop(){
  closeSkillPop();
  const u=S.current; if(!u) return;
  const el=document.createElement('div'); el.className='skill-pop';
  el.innerHTML=u.skills.map(sid=>{
    const sk=DATA.SKILLS[sid]; if(!sk) return '';
    const can=u.rage>=sk.cost;
    const valid=skillHasTarget(u,sk);
    const ic=ART.skillIcon(sid); return `<button class="skill-opt" data-skill="${sid}" ${(!can||!valid)?'disabled':''}>${ic?`<span class="so-icon"><img src="${ic}"></span>`:''}<div class="so-name">${sk.name}<em>${sk.cost} 士气</em></div><div class="so-desc">${sk.desc}${!can?'　<b style="color:#c97866">士气不足</b>':(!valid?'　<b style="color:#c97866">无目标</b>':'')}</div></button>`;
  }).join('')+`<button class="so-cancel" data-skill-cancel>取消</button>`;
  $('#screen-battle').appendChild(el); S.skillPop=el;
  el.addEventListener('click',e=>{
    e.stopPropagation();
    const cancel=e.target.closest('[data-skill-cancel]'); if(cancel){ closeSkillPop(); return; }
    const b=e.target.closest('[data-skill]'); if(!b||b.disabled) return;
    const sk=DATA.SKILLS[b.dataset.skill]; if(!sk) return;
    chooseSkill(sk);
  });
}
function closeSkillPop(){ if(S&&S.skillPop){ S.skillPop.remove(); S.skillPop=null; } }
function skillHasTarget(u,sk){
  const enemies=S.units.filter(x=>x.alive&&isEnemy(u,x));
  const allies=S.units.filter(x=>x.alive&&!isEnemy(u,x)&&x!==u);
  if(sk.target==='allAllies'||sk.target==='self'||sk.target==='areaSelf'||sk.target==='allEnemies') return true;
  if(sk.target==='lowest') return enemies.length>0;
  if(sk.target==='ally') return allies.length>0;
  return enemies.some(e=>inRange(u,e,sk.range||1,1));
}
function chooseSkill(sk){
  const u=S.current; if(!u) return;
  if(u.rage<sk.cost){ toast('士气不足','bad'); return; }
  closeSkillPop();
  if(sk.target==='allAllies'||sk.target==='allEnemies'||sk.target==='self'||sk.target==='areaSelf'||sk.target==='lowest'){
    executeSkill(u,sk,null); return;
  }
  S.mode='skill'; S.pendingSkill=sk; S.skillTiles=new Set();
  clearHighlights();
  const tiles=new Set();
  for(let r=0;r<S.rows;r++)for(let c=0;c<S.cols;c++){ const d=Math.abs(c-u.c)+Math.abs(r-u.r); if(d>=1&&d<=(sk.range||1)) tiles.add(c+','+r); }
  highlightTiles(tiles,0xe0b95c,.4);
  (sk.target==='ally'?S.units.filter(x=>x.alive&&!isEnemy(u,x)&&x!==u):S.units.filter(x=>x.alive&&isEnemy(u,x))).forEach(t=>{ if(t.selRing) t.selRing.visible=true; });
  S.skillTiles=tiles; updateHint(); showMobileTargets();
}
function executeSkill(u,sk,target){
  if(!S||S.busy||S.ending) return;
  closeMobileTargets();
  S.mode=null; S.pendingSkill=null; clearHighlights(); S.canAct=false; S.busy=true;
  performSkill(u,sk,target).then(()=>{ if(S&&S.active&&!S.ending) finishUnitTurn(u); });
}

/* ---------------- AI ---------------- */
async function aiTurn(u){
  if(!S||!S.active||S.ending) return;
  S.canAct=false; S.busy=true; S.selected=u; S.mode=null; clearHighlights(); updateHUD(); updateQueue();
  await bwait(520);
  if(!u.alive||S.ending) return;
  let target=chooseAITarget(u);
  if(!target){ await bwait(300); finishUnitTurn(u,true); return; }
  // heal / buff skill first
  const support=chooseAISupportSkill(u);
  if(support){ await performSkill(u,support.sk,support.target); if(S&&S.active&&!S.ending) finishUnitTurn(u,true); return; }
  // damage skill if in range now
  const skill=chooseAIDamageSkill(u,target);
  if(skill && skill.ready){ await performSkill(u,skill.sk,skill.target); if(S&&S.active&&!S.ending) finishUnitTurn(u,true); return; }
  // move
  if(!inRange(u,target,u.range,u.minRange)){
    const tile=chooseAIMove(u,target);
    if(tile) await moveUnit(u,tile,true);
  }
  if(!S||!S.active||S.ending) return;
  target=chooseAITarget(u);
  const postSkill=target?chooseAIDamageSkill(u,target):null;
  if(postSkill&&postSkill.ready){ await performSkill(u,postSkill.sk,postSkill.target); if(S&&S.active&&!S.ending) finishUnitTurn(u,true); return; }
  if(target && inRange(u,target,u.range,u.minRange)){
    await performBasicAttack(u,target,true);
  } else { await bwait(260); }
  if(S&&S.active&&!S.ending) finishUnitTurn(u,true);
}
function chooseAITarget(u){
  const foes=S.units.filter(x=>x.alive&&isEnemy(u,x));
  if(!foes.length) return null;
  let best=null,bestScore=-1e9;
  foes.forEach(f=>{
    const d=manhattan(u,f);
    let score=100-d*8 + (1-f.hp/f.maxHp)*55;
    if(f.hp<=u.atk*1.1) score+=45;
    if(f.side==='player') score+=8;
    if(f.cls==='strategist') score+=12;
    if(f.isBoss) score-=15;
    if(DATA.CLASSES[u.cls]?.antiCavalry&&f.cls==='cavalry') score+=14;
    bestScore=Math.max(bestScore,score);
    if(score===bestScore) best=f;
  });
  return best;
}
function chooseAISupportSkill(u){
  const skills=u.skills.map(id=>DATA.SKILLS[id]).filter(sk=>sk&&u.rage>=sk.cost);
  const allies=S.units.filter(x=>x.alive&&!isEnemy(u,x));
  for(const sk of skills){
    if(sk.kind==='heal'){
      const hurt=allies.filter(a=>a.hp/a.maxHp<.62).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp);
      if(hurt.length){ return {sk,target:sk.target==='allAllies'?null:(hurt[0]||u)}; }
    }
  }
  return null;
}
function chooseAIDamageSkill(u,target){
  const skills=u.skills.map(id=>DATA.SKILLS[id]).filter(sk=>sk&&sk.kind==='damage'&&u.rage>=sk.cost);
  if(!skills.length) return null;
  const enemies=S.units.filter(x=>x.alive&&isEnemy(u,x));
  for(const sk of skills){
    let t=target;
    if(sk.target==='lowest') t=enemies.slice().sort((a,b)=>a.hp-b.hp)[0];
    if(sk.target==='allEnemies') return {sk,target:null,ready:true};
    if(sk.target==='areaSelf'){ if(enemies.some(e=>manhattan(e,u)<=(sk.range||2))) return {sk,target:null,ready:true}; continue; }
    if(sk.target==='areaEnemy'){
      // score best cluster
      let best=null,bs=0;
      enemies.forEach(e=>{
        if(!inRange(u,e,sk.range||1)) return;
        const n=enemies.filter(x=>manhattan(x,e)<=1).length;
        const s=n*3+(1-e.hp/e.maxHp);
        if(s>bs){bs=s;best=e;}
      });
      if(best) return {sk,target:best,ready:true};
    } else {
      if(t&&inRange(u,t,sk.range||1)) return {sk,target:t,ready:true};
    }
  }
  return null;
}
function chooseAIMove(u,target){
  const md=computeMoveData(u); let best=null,bestScore=-1e9;
  for(let r=0;r<S.rows;r++)for(let c=0;c<S.cols;c++){
    if(md.dist[r][c]===Infinity) continue;
    if(c===u.c&&r===u.r) continue;
    if(S.units.some(x=>x.alive&&x!==u&&x.c===c&&x.r===r)) continue;
    const d=Math.abs(c-target.c)+Math.abs(r-target.r);
    let score=-d*10;
    if(d>=u.minRange&&d<=u.range) score+=120;
    else if(d===u.range+1) score+=50;
    const t=DATA.TERRAIN[tileAt(c,r)]||DATA.TERRAIN['.'];
    score+=t.def*3;
    if(tileAt(c,r)==='v') score+=4;
    if(S.fireZones.some(f=>f.c===c&&f.r===r)) score-=80;
    // prefer flanking
    const adjacentFoes=S.units.filter(x=>x.alive&&isEnemy(u,x)&&Math.abs(x.c-c)+Math.abs(x.r-r)===1).length;
    score+=adjacentFoes*4;
    if(score>bestScore){bestScore=score;best={c,r};}
  }
  return best;
}

/* ---------------- 战斗 ---------------- */
function isEnemy(a,b){ return (a.side==='enemy')!==(b.side==='enemy'); }
function buffSum(u,stat){ return (u.buffs||[]).reduce((s,b)=>s+(b.stat===stat?b.value:0),0); }
function effAtk(u){ let a=u.cls==='strategist'?u.int*1.75+u.atk*.25:u.atk; return a*(1+buffSum(u,'atk')); }
function effDef(u){ return u.def*(1+buffSum(u,'def')); }
function effSpeed(u){ return u.speed*(1+buffSum(u,'speed')); }
function flankCount(att,def){
  return S.units.filter(x=>x.alive&&x!==att&&!isEnemy(att,x)&&manhattan(x,def)===1).length;
}
function baseDamage(att,def,power=1,opts={}){
  let dmg=effAtk(att)*(power||1)-effDef(def)*.6;
  const ac=DATA.CLASSES[att.cls], dc=DATA.CLASSES[def.cls];
  if(ac&&dc){ if(ac.antiCavalry&&def.cls==='cavalry') dmg*=ac.antiCavalry; if(ac.antiArcher&&def.cls==='archer') dmg*=ac.antiArcher; if(ac.antiInfantry&&def.cls==='infantry') dmg*=ac.antiInfantry; }
  const terrain=DATA.TERRAIN[tileAt(def.c,def.r)]; if(terrain?.def) dmg*=1-terrain.def*.045;
  if(tileTop(att.c,att.r)-tileTop(def.c,def.r)>.15) dmg*=1.1;
  if(flankCount(att,def)>0) dmg*=1.1;
  if(att.cls==='cavalry'&&att.movedDist>=3) dmg*=1.16;
  if(def.side==='player'){ const form=DATA.FORMATIONS[S.cfg.formation]; if(form?.rangedDef&&att.range>1) dmg*=1-form.rangedDef; }
  if(S.cfg.weather==='rain'&&opts.fire) dmg*=.35;
  if(S.cfg.weather==='wind'&&opts.fire) dmg*=1.3;
  if(def.equipWeakness==='fire'&&opts.fire) dmg*=1.2;
  return Math.max(10,dmg);
}
function hitChance(att,def,opts={}){
  let acc=.94+(effSpeed(att)-effSpeed(def))*.004;
  if(tileAt(def.c,def.r)==='f') acc-=.06;
  if(S.cfg.weather==='fog'&&att.range>1) acc-=.1;
  if(S.cfg.weather==='rain'&&att.cls==='archer') acc-=.07;
  if(opts.accuracy) acc+=opts.accuracy;
  return clamp(acc,.55,.995);
}
function forecast(att,def,power=1,opts={}){
  const base=baseDamage(att,def,power,opts);
  const crit=clamp((att.crit||.05)+(opts.crit||0),0,.65);
  const counter=(def.alive&&inRange(def,att,def.range,def.minRange))?clamp(def.counter||0,0,1):0;
  return {min:Math.max(1,Math.round(base*.9)),max:Math.max(1,Math.round(base*1.1)),avg:Math.round(base),hit:hitChance(att,def,opts),crit,counter,flank:flankCount(att,def)>0};
}
function resolveHit(att,def,power,opts={}){
  const acc=hitChance(att,def,opts);
  if(Math.random()>acc) return {miss:true,dmg:0,crit:false};
  let dmg=baseDamage(att,def,power,opts)*rand(.9,1.1);
  let crit=false; const critChance=clamp((att.crit||.05)+(opts.crit||0),0,.65);
  if(Math.random()<critChance){ crit=true; dmg*=1.65; }
  dmg=Math.max(10,Math.round(dmg));
  return {miss:false,dmg,crit,flank:flankCount(att,def)>0};
}
async function attackAnimation(att,def){
  faceToward(att,def);
  const start=att.group.position.clone();
  const target=def.group.position.clone();
  const dist=manhattan(att,def);
  if(att.range>1&&dist>1){
    await spawnProjectile(att,def,att.cls==='archer'?'arrow':'orb');
    AUDIO.sfx(att.cls==='archer'?'arrow':'fire');
  } else {
    await bwait(55);
    const dir=target.clone().sub(start).normalize();
    await addTween(.16,t=>{ const e=Math.sin(Math.PI*t); att.group.position.copy(start).addScaledVector(dir,e*.36); },x=>x);
    att.group.position.copy(start);
    addSlash(target,att.side==='enemy'?0xd47a63:0xe7cf8a);
    AUDIO.sfx('sword');
    if(SETTINGS.shake) S.shake=Math.max(S.shake,.18);
  }
}
async function performBasicAttack(att,def,isAI=false){
  if(!att.alive||!def.alive||S.ending) return;
  S.busy=true; updateHUD(); S.mode=null; clearHighlights();
  await attackAnimation(att,def);
  if(!def.alive){ S.busy=false; return; }
  const res=resolveHit(att,def,1,{});
  if(res.miss){
    floatText(unitWorld(def),'闪避','miss');
    bfeed(`<b>${att.name}</b> 的攻击被 <b>${def.name}</b> 闪过。`,'sys');
    AUDIO.sfx('arrow');
  } else {
    S.hitStop=Math.max(S.hitStop,.055);
    applyDamage(def,res.dmg,att,{crit:res.crit,flank:res.flank});
    if(res.crit){ floatCrit(unitWorld(def),'暴击'); S.shake=Math.max(S.shake,.3); addScreenFlash('#ffdca0',.08); }
    bfeed(`<b>${att.name}</b> 对 <b>${def.name}</b> 造成 ${res.dmg} 伤害${res.crit?'（暴击）':''}${res.flank?'（夹击）':''}。`,att.side==='enemy'?'enemy':'player');
    AUDIO.sfx('hit');
  }
  att.rage=Math.min(100,att.rage+14); updateUnitBar(att);
  def.rage=Math.min(100,def.rage+9); updateUnitBar(def);
  await bwait(380);
  // counter
  if(def.alive&&att.alive&&!S.ending&&inRange(def,att,def.range,def.minRange)&&Math.random()<def.counter){
    faceToward(def,att);
    await bwait(180);
    const cr=resolveHit(def,att,.55,{});
    if(!cr.miss){ applyDamage(att,cr.dmg,def,{crit:false}); bfeed(`<b>${def.name}</b> 反击，造成 ${cr.dmg} 伤害。`,def.side==='enemy'?'enemy':'player'); AUDIO.sfx('hit'); }
    else floatText(unitWorld(att),'闪避','miss');
    await bwait(250);
  }
  S.busy=false;
  if(S.cfg.chapterId==='ch0'&&SETTINGS.tutorial&&S.tutorialStep===2&&!isAI){ S.tutorialStep=3; setTimeout(()=>{ showTutorial('战法消耗<b>士气</b>，攻击与受击都会积攒。击败全部敌军即可获胜。','战阵入门'); setTimeout(()=>{ if(S&&S.tutorialStep===3) hideTutorial(); },7000); },500); }
  checkObjective(); updateHUD();
}
async function performSkill(u,sk,target){
  if(!u.alive||S.ending) return;
  const cost=sk.cost||0; if(u.rage<cost) return;
  u.rage-=cost; updateUnitBar(u);
  bfeed(`<b>${u.name}</b> 发动战法「${sk.name}」！`,u.side==='enemy'?'enemy':'player');
  if(!S.autoBattle&&S.speed<3) showCutin({portrait:u.portrait,kicker:sk.kind==='heal'?'战法 · 治疗':'战法',title:sk.name,sub:u.name,enemy:u.side==='enemy'});
  S.shake=Math.max(S.shake,.24); updateHUD();
  const enemies=S.units.filter(x=>x.alive&&isEnemy(u,x));
  const allies=S.units.filter(x=>x.alive&&!isEnemy(u,x));
  let affected=[];
  if(sk.target==='enemy'||sk.target==='ally') affected=target?[target]:[];
  else if(sk.target==='lowest') { const t=enemies.slice().sort((a,b)=>a.hp-b.hp)[0]; affected=t?[t]:[]; }
  else if(sk.target==='areaEnemy'){ if(target){ affected=[target,...enemies.filter(e=>e!==target&&manhattan(e,target)<=1)]; } }
  else if(sk.target==='areaSelf'){ affected=enemies.filter(e=>manhattan(e,u)<=(sk.range||2)); }
  else if(sk.target==='allEnemies'){ affected=enemies.slice(); }
  else if(sk.target==='allAllies'){ affected=allies.slice(); }
  else if(sk.target==='self'){ affected=[u]; }
  // animation
  const center=target?unitWorld(target):unitWorld(u);
  if(sk.fx==='fire'){
    affected.forEach(t=>fireBurst(unitWorld(t),14)); addScreenFlash('#ff8a4c',.1); AUDIO.sfx('fire');
  } else if(sk.fx==='arrow'){
    for(const t of affected.slice(0,4)) await spawnProjectile(u,t,'arrow');
    AUDIO.sfx('arrow');
  } else if(sk.fx==='heal'){
    affected.forEach(t=>healBurst(unitWorld(t))); AUDIO.sfx('heal');
  } else if(sk.fx==='buff'||sk.fx==='wind'){
    affected.forEach(t=>addRing(unitWorld(t),0xe7c884,1.2)); AUDIO.sfx('buff');
  } else {
    addSlash(center,0xe7c884); addRing(center,0xc9a45f,1.1); AUDIO.sfx('heavy');
  }
  await bwait(sk.fx==='arrow'?340:280);
  // apply
  for(const t of affected){
    if(!t.alive) continue;
    if(sk.kind==='damage'){
      if(sk.target==='allAllies') continue;
      const r=resolveHit(u,t,(sk.power||1)*(1+(u.stats?.skill||0)),{crit:sk.crit||0,fire:sk.fx==='fire'});
      if(r.miss){ floatText(unitWorld(t),'闪避','miss'); continue; }
      S.hitStop=Math.max(S.hitStop,.065);
      applyDamage(t,r.dmg,u,{crit:r.crit});
      if(sk.burn) addBurn(t,{turns:sk.burn,dmg:Math.round((u.int||50)*1.15+18)});
      if(sk.debuff) Object.entries(sk.debuff).forEach(([stat,v])=>addBuff(t,{stat,value:v,turns:sk.turns||2,label:statName(stat)}));
      if(sk.stun&&Math.random()<.6){ t.status.stun=1; floatText(unitWorld(t),'混乱','crit'); }
    } else if(sk.kind==='heal'){
      const amount=Math.round((t.maxHp*(sk.power||.2)+((u.int||40)*1.6))*(1+(u.stats?.heal||0)));
      const before=t.hp; t.hp=Math.min(t.maxHp,t.hp+amount); updateUnitBar(t); if(u.stats) u.stats.heal+=t.hp-before; floatText(unitWorld(t),'+'+(t.hp-before),'heal');
      if(sk.id==='rende'){ t.buffs=t.buffs.filter(b=>b.value>0); delete t.status.burn; delete t.status.stun; }
      addHealSpark(unitWorld(t));
    } else if(sk.kind==='buff'){
      if(sk.buff) Object.entries(sk.buff).forEach(([stat,v])=>addBuff(t,{stat,value:v,turns:sk.turns||2,label:statName(stat)}));
      if(sk.rage){ t.rage=Math.min(100,t.rage+sk.rage); updateUnitBar(t); }
      floatText(unitWorld(t),'士气高涨','buff');
    }
    if(sk.healSelf){ const h=Math.round(u.maxHp*sk.healSelf); u.hp=Math.min(u.maxHp,u.hp+h); updateUnitBar(u); floatText(unitWorld(u),'+'+h,'heal'); }
  }
  if(sk.selfBuff) Object.entries(sk.selfBuff).forEach(([stat,v])=>addBuff(u,{stat,value:v,turns:sk.turns||2,label:statName(stat)}));
  if(sk.kind==='damageSelf'){ const d=Math.round(u.maxHp*(sk.power||.1)); applyDamage(u,d,null,{silent:true}); floatText(unitWorld(u),'自损 '+d,'enemy'); if(sk.buff) Object.entries(sk.buff).forEach(([stat,v])=>addBuff(u,{stat,value:v,turns:sk.turns||2,label:statName(stat)})); }
  if(sk.rage&&sk.kind!=='buff'){ u.rage=Math.min(100,u.rage+sk.rage); updateUnitBar(u); }
  await bwait(450);
  checkObjective(); updateHUD();
}
function statName(stat){ return {atk:'攻击',def:'防御',speed:'速度',crit:'暴击'}[stat]||stat; }
function addBuff(u,b){
  u.buffs=u.buffs||[];
  const exist=u.buffs.find(x=>x.stat===b.stat&&x.value===b.value);
  if(exist) exist.turns=Math.max(exist.turns,b.turns); else u.buffs.push({...b});
}
function addBurn(u,opt){ u.status.burn={turns:opt.turns||2,dmg:opt.dmg||Math.round(u.maxHp*.05)}; floatText(unitWorld(u),'灼烧','fire'); }
function applyDamage(target,dmg,source,opts={}){
  if(!target||!target.alive) return;
  target.hp=Math.max(0,target.hp-dmg);
  if(target.sprite&&target.sprite.material){ const mat=target.sprite.material; if(target._baseColor==null) target._baseColor=mat.color.getHex(); mat.color.setHex(0xff9b86); clearTimeout(target._flashTimer); target._flashTimer=setTimeout(()=>{ if(target.sprite&&target.sprite.material) target.sprite.material.color.setHex(target._baseColor); },100); }
  if(source&&source.stats) source.stats.dmg+=dmg;
  if(target.stats) target.stats.taken+=dmg;
  updateUnitBar(target);
  if(!opts.silent) floatText(unitWorld(target),opts.crit?('暴击 '+dmg):('-'+dmg),opts.crit?'crit':(target.side==='enemy'?'':'enemy'));
  if(source&&source.alive){ source.rage=Math.min(100,source.rage+10); updateUnitBar(source); }
  target.rage=Math.min(100,target.rage+8); updateUnitBar(target);
  if(target.hp<=0) killUnit(target,source);
}
function killUnit(u,source){
  if(!u.alive) return;
  u.alive=false;
  if(source){ source.kills++; if(source.stats) source.stats.kills++; }
  if(u.side==='enemy') S.kills++;
  bfeed(`<b>${u.name}</b> ${u.isBoss?'被击破！':'阵亡。'}`,u.side==='enemy'?'player':'enemy');
  removeUnitModel(u);
  if(u.side==='enemy'&&u.isBoss){ S.shake=.6; addScreenFlash('#ffd48a',.15); }
  checkObjective();
}
function checkObjective(){
  if(!S||!S.active||S.ending) return;
  const obj=S.cfg.objective||{type:'eliminate'};
  if(!S.playerUnits.some(u=>u.alive)){ S.overSoon=true; setTimeout(()=>{ if(S&&S.active&&!S.ending) finish(false); },400); return; }
  if(obj.type==='eliminate'){
    const aliveEnemies=S.enemyUnits.filter(u=>u.alive);
    if(!aliveEnemies.length){ S.overSoon=true; setTimeout(()=>{ if(S&&S.active&&!S.ending&&!S.enemyUnits.some(u=>u.alive)) finish(true); },700); }
  } else if(obj.type==='boss'){
    const boss=S.enemyUnits.find(u=>u.defId===obj.boss);
    const pending=(S.cfg.waves||[]).some(w=>w.round>S.round&&w.units.some(x=>(x.g||x.mook)===obj.boss));
    if(boss&&!boss.alive){ S.overSoon=true; setTimeout(()=>{ if(S&&S.active&&!S.ending) finish(true); },700); }
    else if(!boss&&!pending&&!S.enemyUnits.some(u=>u.alive)){ S.overSoon=true; setTimeout(()=>{ if(S&&S.active&&!S.ending) finish(true); },700); }
  } else if(obj.type==='survive'){
    if(S.round>obj.rounds) finish(true);
  }
}

/* ---------------- 表现 ---------------- */
function unitWorld(u){ return new THREE.Vector3(u.group.position.x,u.group.position.y+1.4,u.group.position.z); }
function floatText(pos,text,cls=''){
  if(!SETTINGS.damageNumbers) return;
  const p=pos.clone().project(S.camera);
  const stage=$('#battleStage'); if(!stage) return;
  const r=stage.getBoundingClientRect();
  const x=r.left+(p.x*.5+.5)*r.width, y=r.top+(-p.y*.5+.5)*r.height;
  const el=document.createElement('div'); el.className='dmg-num '+cls; el.textContent=text;
  el.style.left=(x+rand(-12,12))+'px'; el.style.top=(y-10)+'px';
  $('#fxRoot').appendChild(el); setTimeout(()=>el.remove(),1100);
}
function floatCrit(pos,text){
  if(!SETTINGS.damageNumbers) return;
  const p=pos.clone().project(S.camera); const r=$('#battleStage').getBoundingClientRect();
  const el=document.createElement('div'); el.className='crit-word'; el.textContent=text; el.style.left=(r.left+(p.x*.5+.5)*r.width)+'px'; el.style.top=(r.top+(-p.y*.5+.5)*r.height-28)+'px';
  $('#fxRoot').appendChild(el); setTimeout(()=>el.remove(),1000);
}
function addScreenFlash(color,opacity){
  const el=document.createElement('div'); el.className='screen-flash'; el.style.background=color; el.style.opacity=opacity;
  $('#fxRoot').appendChild(el); setTimeout(()=>el.remove(),280);
}
function addRing(pos,color,size){
  const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.75,depthWrite:false,side:THREE.DoubleSide});
  const m=new THREE.Mesh(new THREE.TorusGeometry(.42*size,.024,6,32),mat);
  m.rotation.x=-Math.PI/2; m.position.set(pos.x,pos.y-1.1,pos.z); S.scene.add(m);
  addTween(.55,t=>{ m.scale.setScalar(1+t*1.6); mat.opacity=.75*(1-t); },x=>x).then(()=>S.scene.remove(m));
}
function addSlash(pos,color){
  const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  const m=new THREE.Mesh(new THREE.RingGeometry(.32,.95,24,1,0,Math.PI*1.25),mat);
  m.position.copy(pos); m.position.y+=.12; m.rotation.x=-Math.PI/2; m.rotation.z=rand(0,6);
  S.scene.add(m);
  addTween(.3,t=>{ m.scale.setScalar(.7+t*.8); mat.opacity=.9*(1-t); },x=>x).then(()=>S.scene.remove(m));
}
function fireBurst(pos,count=12){
  for(let i=0;i<count;i++){
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:ART.ember(),color:pick([0xffb35e,0xff7a36,0xffd28a]),transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending}));
    sp.position.copy(pos); sp.position.x+=rand(-.3,.3); sp.position.z+=rand(-.3,.3); sp.scale.setScalar(rand(.18,.5));
    S.scene.add(sp); S.particles.push({sprite:sp,vx:rand(-.6,.6),vy:rand(.8,2),vz:rand(-.6,.6),life:rand(.5,1.1),max:1.1,gravity:-1.5});
  }
  for(let i=0;i<4;i++){ const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:ART.smoke(),color:0x4a4138,transparent:true,opacity:.3,depthWrite:false})); sp.position.copy(pos); sp.position.y+=.4; sp.scale.setScalar(rand(.5,1)); S.scene.add(sp); S.particles.push({sprite:sp,vx:rand(-.2,.2),vy:rand(.4,.9),vz:rand(-.2,.2),life:rand(.7,1.3),max:1.3,gravity:-.2}); }
}
function healBurst(pos){
  for(let i=0;i<12;i++){
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:ART.ember(),color:pick([0x9fe0ae,0xd4f0b0,0xe7df9a]),transparent:true,opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending}));
    sp.position.copy(pos); sp.position.x+=rand(-.3,.3); sp.position.z+=rand(-.3,.3); sp.scale.setScalar(rand(.1,.26));
    S.scene.add(sp); S.particles.push({sprite:sp,vx:rand(-.2,.2),vy:rand(.8,1.6),vz:rand(-.2,.2),life:rand(.6,1.1),max:1.1,gravity:.2});
  }
}
function addHealSpark(pos){ for(let i=0;i<5;i++){ const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:ART.ember(),color:0xa8e0b4,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending})); sp.position.copy(pos); sp.position.y+=rand(0,.8); sp.scale.setScalar(.12); S.scene.add(sp); S.particles.push({sprite:sp,vx:rand(-.1,.1),vy:rand(.4,.8),vz:rand(-.1,.1),life:.6,max:.6,gravity:.1}); } }
function spawnProjectile(att,def,type){
  return new Promise(res=>{
    const from=unitWorld(att); const to=unitWorld(def);
    let mesh;
    if(type==='arrow'){
      const g=new THREE.CylinderGeometry(.012,.012,.42,4); mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xe7d8b0}));
      mesh.rotation.z=Math.PI/2;
    } else {
      mesh=new THREE.Mesh(new THREE.SphereGeometry(.1,8,6),new THREE.MeshBasicMaterial({color:0xffa85e}));
    }
    mesh.position.copy(from); S.scene.add(mesh);
    addTween(.32,t=>{ const e=t; mesh.position.lerpVectors(from,to,e); mesh.position.y+=Math.sin(Math.PI*t)*.5; },x=>x).then(()=>{ S.scene.remove(mesh); res(); });
  });
}
function addFireZone(c,r){
  if(S.fireZones.some(f=>f.c===c&&f.r===r)) return;
  const pos=tileToWorld(c,r);
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.7,.7),new THREE.MeshBasicMaterial({color:0xff6a2e,transparent:true,opacity:.35,depthWrite:false,blending:THREE.AdditiveBlending}));
  mesh.rotation.x=-Math.PI/2; mesh.position.set(pos.x,pos.y+.05,pos.z); S.scene.add(mesh); S.fireZones.push({c,r,mesh,phase:rand(0,6)});
  fireBurst(new THREE.Vector3(pos.x,pos.y+.5,pos.z),4);
}

/* ---------------- 手机 / 镜头 ---------------- */
function clampCamTarget(){
  if(!S) return;
  const t=1.04;
  const hx=(S.cols-1)*t/2+1.4, hz=(S.rows-1)*t/2+1.4;
  S.cam.target.x=clamp(S.cam.target.x,-hx,hx);
  S.cam.target.z=clamp(S.cam.target.z,-hz,hz);
}
function cameraPreset(kind){
  if(!S) return;
  if(kind==='fit'){
    const tan=Math.tan(THREE.MathUtils.degToRad(S.camera.fov/2));
    const dw=(S.cols*1.04+2.4)/(2*tan*Math.max(.32,S.camera.aspect));
    const dh=(S.rows*1.04+2.4)/(2*tan);
    S.cam.dist=clamp(Math.max(dw,dh)*1.06,8,38);
    S.cam.phi=S.isMobile?.66:.9;
    S.cam.target.set(0,.25,0);
  } else if(kind==='focus'){
    const u=S.current||S.playerUnits[0];
    if(u){ const p=tileToWorld(u.c,u.r); S.cam.target.set(p.x,.25,p.z); S.cam.dist=S.isMobile?13.2:12.4; S.cam.phi=S.isMobile?.78:.9; }
  } else if(kind==='in'){ S.cam.dist=clamp(S.cam.dist-2.2,8,38); }
  else if(kind==='out'){ S.cam.dist=clamp(S.cam.dist+2.2,8,38); }
  clampCamTarget(); drawMiniMap();
}
function panCamera(dx,dy){
  if(!S) return;
  const sc=S.cam.dist*.00155, th=S.cam.theta;
  const right=new THREE.Vector3(-Math.sin(th),0,Math.cos(th));
  const fwd=new THREE.Vector3(-Math.cos(th),0,-Math.sin(th));
  S.cam.target.addScaledVector(right,-dx*sc);
  S.cam.target.addScaledVector(fwd,dy*sc);
  clampCamTarget(); drawMiniMap();
}
function focusCameraOnUnits(list){
  if(!S||!S.isMobile||!list||!list.length) return;
  let sx=0,sz=0; list.forEach(u=>{ sx+=u.group.position.x; sz+=u.group.position.z; });
  sx/=list.length; sz/=list.length;
  S.cam.target.set(sx,.25,sz);
  let span=0;
  list.forEach(u=>{ const dx=u.group.position.x-sx,dz=u.group.position.z-sz; span=Math.max(span,Math.hypot(dx,dz)); });
  const land=window.innerWidth>window.innerHeight;
  S.cam.dist=clamp(Math.max(land?10.5:23.5,span*1.35+(land?6:15.2)),land?10.5:23.5,land?19:29);
  clampCamTarget(); drawMiniMap();
}
function focusCameraOnTiles(tiles,u){
  if(!S||!S.isMobile||!tiles||!tiles.size) return;
  let minC=99,maxC=-1,minR=99,maxR=-1;
  tiles.forEach(k=>{ const [c,r]=k.split(',').map(Number); minC=Math.min(minC,c);maxC=Math.max(maxC,c);minR=Math.min(minR,r);maxR=Math.max(maxR,r); });
  if(u){ minC=Math.min(minC,u.c);maxC=Math.max(maxC,u.c);minR=Math.min(minR,u.r);maxR=Math.max(maxR,u.r); }
  const t=1.04;
  const cx=((minC+maxC)/2-(S.cols-1)/2)*t, cz=((minR+maxR)/2-(S.rows-1)/2)*t;
  const spanX=(maxC-minC+1)*t, spanZ=(maxR-minR+1)*t;
  const tan=Math.tan(THREE.MathUtils.degToRad(S.camera.fov/2));
  const dw=spanX/(2*tan*Math.max(.34,S.camera.aspect));
  const dh=spanZ/(2*tan);
  S.cam.target.set(cx,.25,cz);
  S.cam.dist=clamp(Math.max(dw,dh)*1.18+1.5,10.5,24);
  clampCamTarget(); drawMiniMap();
}
function drawMiniMap(){
  if(!S||!S.isMobile) return;
  const cv=$('#battleMinimap'); if(!cv||!S.grid) return;
  const ctx=cv.getContext('2d'); const W=cv.width,H=cv.height;
  ctx.clearRect(0,0,W,H);
  const cw=W/S.cols, ch=H/S.rows;
  for(let r=0;r<S.rows;r++)for(let c=0;c<S.cols;c++){
    const t=DATA.TERRAIN[tileAt(c,r)]||DATA.TERRAIN['.'];
    const col='#'+(t.color||0x666666).toString(16).padStart(6,'0');
    ctx.fillStyle=col; ctx.globalAlpha=.9; ctx.fillRect(c*cw,r*ch,cw+.4,ch+.4);
    ctx.globalAlpha=.12; ctx.strokeStyle='#0a0f0c'; ctx.strokeRect(c*cw,r*ch,cw,ch);
  }
  ctx.globalAlpha=1;
  S.units.filter(u=>u.alive).forEach(u=>{
    const x=(u.c+.5)*cw,y=(u.r+.5)*ch;
    ctx.beginPath(); ctx.arc(x,y,u.side==='enemy'?3.4:3.8,0,Math.PI*2);
    ctx.fillStyle=u.side==='enemy'?'#d36b5c':u.side==='ally'?'#d8b45f':'#79c596'; ctx.fill();
    if(u===S.current){ ctx.strokeStyle='#ffe2a3'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.arc(x,y,6.2,0,Math.PI*2); ctx.stroke(); }
  });
  const tx=((S.cam.target.x/1.04)+(S.cols-1)/2+.5)*cw, ty=((S.cam.target.z/1.04)+(S.rows-1)/2+.5)*ch;
  ctx.strokeStyle='rgba(255,238,196,.85)'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(tx-6,ty); ctx.lineTo(tx+6,ty); ctx.moveTo(tx,ty-6); ctx.lineTo(tx,ty+6); ctx.stroke();
  ctx.strokeStyle='rgba(255,238,196,.3)'; ctx.strokeRect(1,1,W-2,H-2);
}
function showMobileInfo(u){
  if(!S||!S.isMobile||!u||!u.alive) return;
  const el=$('#mobileInfo'); if(!el) return;
  const hp=clamp(u.hp/u.maxHp*100,0,100);
  el.innerHTML=`<button class="mic-close" data-mic-close>✕</button><div class="mic-head"><img src="${ART.portrait(u.portrait)}"><div><div class="mic-name">${u.name}</div><div class="mic-sub">${u.side==='enemy'?'敌军':u.side==='ally'?'盟军':'我军'} · ${DATA.CLASSES[u.cls]?.name||''} · Lv.${u.lv}</div></div></div>
    <div class="mic-bars"><div class="mic-row"><span>兵力</span><span>${Math.ceil(u.hp)} / ${u.maxHp}</span></div><div class="mic-bar ${u.side==='enemy'?'enemy':''}"><i style="width:${hp}%"></i></div><div class="mic-row"><span>士气</span><span>${Math.floor(u.rage)}</span></div><div class="mic-bar"><i style="width:${u.rage}%;background:linear-gradient(90deg,#8e6a2d,#e7c884)"></i></div></div>`;
  el.classList.add('open');
  $('[data-mic-close]',el).onclick=()=>el.classList.remove('open');
  clearTimeout(S.micTimer); S.micTimer=setTimeout(()=>{ if(el) el.classList.remove('open'); },6000);
}
function closeMobileTargets(){ const el=$('#mobileTargets'); if(el){ el.classList.remove('open'); el.innerHTML=''; } S&&(S.mobileTargets=[]); }
function showMobileTargets(){
  if(!S||!S.isMobile||!S.canAct||!S.current||!S.mode){ closeMobileTargets(); return; }
  S.suppressTargetSheet=false;
  closeMobileQueue();
  const u=S.current; let list=[]; let title='选择目标';
  if(S.mode==='attack'){ list=validAttackTargets(u); title='选择攻击目标'; }
  else if(S.mode==='skill'&&S.pendingSkill){
    const sk=S.pendingSkill; title=`「${sk.name}」目标`;
    if(sk.target==='enemy'||sk.target==='areaEnemy') list=S.units.filter(x=>x.alive&&isEnemy(u,x)&&validSkillTarget(u,sk,x));
    else if(sk.target==='ally') list=S.units.filter(x=>x.alive&&!isEnemy(u,x)&&x!==u&&validSkillTarget(u,sk,x));
    else { closeMobileTargets(); return; }
  } else { closeMobileTargets(); return; }
  const el=$('#mobileTargets'); if(!el) return;
  el.innerHTML=`<div class="mts-head"><span>${title} · 点选或直接点战场</span><button data-mts-cancel>取消</button></div><div class="mts-list">${list.length?list.map(t=>{ let fc=null; if(S.mode==='attack') fc=forecast(u,t,1); else if(S.mode==='skill'&&S.pendingSkill){ const sk=S.pendingSkill; if(sk.kind==='damage') fc=forecast(u,t,sk.power||1,{crit:sk.crit||0,fire:sk.fx==='fire'}); } return `<button class="mts-card ${t.side==='enemy'?'enemy':''}" data-mts-uid="${t.uid}"><img src="${ART.portrait(t.portrait)}"><div class="mts-name">${t.name}</div><div class="mts-hp">兵力 <b>${Math.ceil(t.hp)}</b></div>${fc?`<div class="mts-dmg">预计 <b>${fc.min}-${fc.max}</b> · ${Math.round(fc.hit*100)}%</div>`:''}</button>`; }).join(''):'<div class="mts-empty">当前没有可选目标，请靠近敌军或取消。</div>'}</div>`;
  el.classList.add('open');
  S.mobileTargets=list;
  hideTutorial();
  if(list.length) focusCameraOnUnits([u,...list]);
  $('[data-mts-cancel]',el).onclick=()=>cancelTargeting();
  $$('[data-mts-uid]',el).forEach(b=>b.onclick=()=>{
    const t=list.find(x=>x.uid===b.dataset.mtsUid); if(!t) return;
    closeMobileTargets();
    if(S.mode==='attack') startAttackFromClick(t);
    else if(S.mode==='skill'&&S.pendingSkill) executeSkill(u,S.pendingSkill,t);
  });
}
function cancelTargeting(){
  if(!S) return;
  S.mode=null; S.pendingSkill=null; closeSkillPop(); closeMobileTargets(); clearHighlights();
  if(S.current&&S.canAct&&!S.current.moved) showMoveRange(S.current); else updateHUD();
}
function setupMobileBattle(){
  if(!S||!S.isMobile) return;
  const all=S.units.filter(u=>u.alive);
  if(all.length){ let ax=0,az=0; all.forEach(u=>{ax+=u.group.position.x;az+=u.group.position.z;}); ax/=all.length; az/=all.length; S.cam.target.set(ax,.25,az); S.cam.dist=window.innerWidth>window.innerHeight?14.5:30; clampCamTarget(); }
  drawMiniMap();
  const tip=$('#rotateTip'); if(tip){ if(window.innerWidth<window.innerHeight){ tip.classList.remove('hide'); setTimeout(()=>tip.classList.add('hide'),5000); } else tip.classList.add('hide'); }
  // keep the full-board mobile view; player can use 聚焦/全图
  drawMiniMap();
}

function updateSpeedButtons(){
  if(!S) return;
  $$('.battle-speed [data-speed]').forEach(b=>b.classList.toggle('active',Number(b.dataset.speed)===S.speed));
}
function updateAutoButton(){
  const b=$('#battleAuto'); if(!b) return;
  b.classList.toggle('active',!!S.autoBattle);
  b.textContent=S.autoBattle?'自动中':'自动';
  b.title=S.autoBattle?'关闭自动战斗（A）':'开启自动战斗（A）';
}
function setAutoBattle(on){
  if(!S||S.ending) return;
  on=!!on;
  if(on===S.autoBattle){ updateAutoButton(); return; }
  S.autoBattle=on;
  if(on){
    S.prevSpeed=S.speed;
    if(S.speed<2) S.speed=2;
    hideTutorial(); closeMobileTargets(); closeSkillPop();
    toast('自动战斗已开启','AI 将接管我方行动，再点一次可关闭。','good',2200);
    showPhaseBanner('自动战斗','AI 接管我方','#c9a45f');
    AUDIO.sfx('ui');
  } else {
    if(S.prevSpeed) S.speed=S.prevSpeed;
    S.prevSpeed=null;
    toast('自动战斗已关闭','下一名武将开始由你指挥。','',2200);
    AUDIO.sfx('ui');
  }
  updateSpeedButtons(); updateAutoButton(); updateHUD();
  // if it is currently the player's turn, hand this unit to the AI immediately
  if(on&&S.current&&S.current.side==='player'&&S.canAct&&!S.busy&&!S.paused){
    S.canAct=false; closeMobileTargets(); aiTurn(S.current);
  }
}

/* ---------------- 界面 ---------------- */
function initUI(){
  const stage=$('#battleStage');
  const w=DATA.WEATHERS[S.cfg.weather]||DATA.WEATHERS.clear;
  const chEl=$('#battleChapter'), objEl=$('#battleObjective'), weEl=$('#battleWeather');
  if(chEl) chEl.textContent=S.cfg.title||'战阵';
  if(objEl) objEl.textContent=S.cfg.objective?.text||'击败敌军';
  if(weEl) weEl.innerHTML=`<span class="weather-ico">${w.icon}</span><span>${w.name}</span>`;
  const pause=$('#battlePause'); pause.onclick=()=>{ if(window.UI) UI.openPause(); };
  $$('.battle-speed [data-speed]').forEach(b=>{ b.onclick=()=>{ S.speed=Number(b.dataset.speed); updateSpeedButtons(); }; });
  const autoBtn=$('#battleAuto'); if(autoBtn){ autoBtn.onclick=()=>setAutoBattle(!S.autoBattle); }
  const turnChip=$('#mobileTurnChip'); if(turnChip){ turnChip.onclick=openMobileQueue; }
  $$('[data-mq-close]').forEach(b=>b.onclick=closeMobileQueue);
  updateSpeedButtons(); updateAutoButton();
  const actions=$('#battleActions');
  S.actionsHandler=e=>{ const b=e.target.closest('[data-act]'); if(b&&!b.disabled) onAction(b.dataset.act); };
  actions.addEventListener('click',S.actionsHandler); S.listeners.push({el:actions,type:'click',fn:S.actionsHandler});
  // mobile controls
  $$('.bm-cam button').forEach(b=>{ b.onclick=()=>cameraPreset(b.dataset.cam); });
  const mini=$('#battleMinimap');
  if(mini){
    const onMini=e=>{
      e.preventDefault(); e.stopPropagation();
      if(!S||S.ending) return;
      const r=mini.getBoundingClientRect(); const nx=clamp((e.clientX-r.left)/r.width,0,1), ny=clamp((e.clientY-r.top)/r.height,0,1);
      const c=Math.round(nx*(S.cols-1)), rr=Math.round(ny*(S.rows-1));
      const p=tileToWorld(c,rr); S.cam.target.set(p.x,.25,p.z); clampCamTarget();
      if(S.cam.dist>18) S.cam.dist=15.5;
      drawMiniMap();
    };
    mini.addEventListener('pointerdown',onMini); S.listeners.push({el:mini,type:'pointerdown',fn:onMini});
  }
  const mt=$('#mobileTargets');
  if(mt){ const h=e=>{ if(e.target.closest('[data-mts-cancel]')) cancelTargeting(); }; mt.addEventListener('click',h); S.listeners.push({el:mt,type:'click',fn:h}); }
  $('#mobileTargets')?.classList.remove('open');
  $('#mobileInfo')?.classList.remove('open');
  $('#battleFeed').innerHTML='';
  $('#battleIntel').innerHTML='<div class="intel-empty">将鼠标移至武将<br>查看军情</div>';
  $('#battleTutorial').classList.add('hidden');
  $('#fxRoot').innerHTML='';
  updateHUD(); updateObjectiveUI(); updateQueue(); updateCommand();
}
function updateObjectiveUI(){
  if(!S) return;
  const obj=S.cfg.objective||{};
  let text=obj.text||'击败敌军', pct=0, note='';
  if(obj.type==='survive'){
    text=`${obj.text}　第 ${Math.min(S.round,obj.rounds)} / ${obj.rounds} 回合`;
    pct=Math.min(1,S.round/obj.rounds); note=`${Math.max(0,obj.rounds-S.round)} 回合`;
  } else if(obj.type==='boss'){
    const boss=S.enemyUnits.find(u=>u.defId===obj.boss);
    pct=boss?clamp(boss.hp/boss.maxHp,0,1):0; note=boss?`${Math.ceil(boss.hp)} / ${boss.maxHp}`:'主将已破';
  } else {
    const total=Math.max(1,S.enemyUnits.length), alive=S.enemyUnits.filter(u=>u.alive).length;
    pct=clamp(1-alive/total,0,1); note=`敌军 ${alive} / ${total}`;
  }
  const el=$('#battleObjective');
  if(el) el.innerHTML=`${text}<span class="bo-progress" title="${note}"><i style="width:${Math.round(pct*100)}%"></i></span>`;
  const w=DATA.WEATHERS[S.cfg.weather]||DATA.WEATHERS.clear;
  const we=$('#battleWeather'); if(we) we.innerHTML=`<span class="weather-ico">${w.icon}</span><span>${w.name} · ${w.desc}</span>`;
}
function updateHUD(){
  if(!S) return;
  updateQueue(); updateCommand(); updateActions(); updateObjectiveUI(); updateAutoButton();
  if(S.isMobile){
    const chip=$('#mobileTurnChip');
    if(chip){
      if(S.ending) chip.textContent='战斗结束';
      else if(S.current&&S.current.alive) chip.textContent=(S.current.side==='player'?'我方 · ':S.current.side==='ally'?'盟军 · ':'敌方 · ')+S.current.name+`　第${S.round}回合`;
      else chip.textContent=`第${S.round}回合 · 整军待命`;
    }
    if((S.mode==='attack'||S.mode==='skill')&&!S.suppressTargetSheet) showMobileTargets(); else closeMobileTargets();
    drawMiniMap(); updateMobileQueue();
  }
}
function updateMobileQueue(){
  if(!S||!S.isMobile) return;
  const listEl=$('#mqList'); if(!listEl) return;
  const list=[]; if(S.current&&S.current.alive) list.push(S.current);
  S.queue.filter(u=>u.alive).forEach(u=>{ if(list.length<10&&!list.includes(u)) list.push(u); });
  listEl.innerHTML=list.map((u,i)=>`<div class="mq-item ${u.side} ${i===0?'active':''}"><img src="${ART.portrait(u.portrait)}"><div><b>${u.name}</b><small>${u.side==='enemy'?'敌军':u.side==='ally'?'盟军':'我军'} · ${Math.ceil(u.hp)}兵</small></div><span>${i===0?'行动中':'待命'}</span></div>`).join('');
  const title=$('#mqTitle'); if(title) title.textContent=`行动序 · 第 ${S.round} 回合`;
}
function openMobileQueue(){
  if(!S||!S.isMobile||S.ending) return;
  updateMobileQueue(); const el=$('#mobileQueue'); if(el) el.classList.add('open');
}
function closeMobileQueue(){ const el=$('#mobileQueue'); if(el) el.classList.remove('open'); }
function updateQueue(){
  const el=$('#queueList'); if(!el||!S) return;
  const list=[];
  if(S.current&&S.current.alive) list.push(S.current);
  S.queue.filter(u=>u.alive).forEach(u=>{ if(list.length<9) list.push(u); });
  el.innerHTML=list.map((u,i)=>`<div class="queue-item ${u.side} ${i===0?'active':''}" style="${i===0?'':'opacity:'+Math.max(.35,.8-i*.08)}">
    <span class="qi-side"></span><img src="${ART.portrait(u.portrait)}"><span class="qi-name">${u.name}</span></div>`).join('');
  const round=document.createElement('div'); round.className='queue-round'; round.textContent='第 '+S.round+' 回合'; el.appendChild(round);
}
function updateCommand(){
  const el=$('#battleCommand'); if(!el||!S) return;
  const u=S.current;
  if(!u||!u.alive){ el.innerHTML='<div class="bc-main"><div class="bc-name-row"><span class="bc-name">整军待命</span></div><div class="bc-hint" style="border:0;width:auto;padding:0">静候战鼓。</div></div>'; return; }
  const hp=Math.max(0,u.hp/u.maxHp*100), rage=Math.min(100,u.rage);
  const buffs=(u.buffs||[]).map(b=>`<span class="buff-chip ${b.value<0?'bad':''}">${b.label}${b.value>0?'+':''}${Math.round(b.value*100)}%</span>`).join('')+(u.status.burn?'<span class="buff-chip bad">灼烧</span>':'')+(u.status.stun?'<span class="buff-chip bad">混乱</span>':'');
  const hint=S.mode==='attack'?'选择攻击目标':S.mode==='skill'?`选择「${S.pendingSkill?.name||'战法'}」目标`:S.mode==='move'?'点击蓝色格子移动':S.canAct?'选择行动，或点击格子移动':'敌军行动中…';
  el.innerHTML=`<div class="bc-portrait"><img src="${ART.portrait(u.portrait)}"></div>
    <div class="bc-main"><div class="bc-name-row"><span class="bc-name">${u.name}</span><span class="bc-class">${DATA.CLASSES[u.cls]?.name||''} · Lv.${u.lv}</span></div>
      <div class="bc-hp-wrap"><span style="font-size:8px;color:var(--muted)">兵力</span><div class="bar hp"><i style="width:${hp}%"></i></div><span class="bc-hp-text"><b>${Math.ceil(u.hp)}</b> / ${u.maxHp}</span></div>
      <div class="bc-rage-wrap"><span style="font-size:8px;color:var(--muted)">士气</span><div class="bar rage"><i style="width:${rage}%"></i></div><span class="bc-rage-text">${Math.floor(u.rage)} / 100</span></div>
      <div class="bc-buffs">${buffs}</div></div>
    <div class="bc-hint">${hint}</div>`;
}
function updateActions(){
  const el=$('#battleActions'); if(!el||!S) return;
  const u=S.current;
  if(!S.canAct||!u||!u.alive||S.ending){ el.innerHTML=''; return; }
  const canAtk=validAttackTargets(u).length>0;
  const canSk=u.skills.some(sid=>{ const sk=DATA.SKILLS[sid]; return sk&&u.rage>=sk.cost&&skillHasTarget(u,sk); });
  el.innerHTML=`
    <button class="action-btn move" data-act="move" ${u.moved?'disabled':''}>移动<small>MOVE</small></button>
    <button class="action-btn attack" data-act="attack" ${canAtk?'':'disabled'}>攻击<small>ATTACK</small></button>
    <button class="action-btn skill" data-act="skill" ${canSk?'':'disabled'}>战法<small>TACTIC</small></button>
    ${u.moved&&u.prevPos?'<button class="action-btn undo" data-act="undo">撤回<small>UNDO</small></button>':''}
    <button class="action-btn wait" data-act="wait">待机<small>WAIT</small></button>`;
}
function updateHint(text){
  const hint=text||(S.mode==='attack'?'已进入攻击选择：点击红色范围内的敌军。':S.mode==='skill'?`已进入战法选择：点击目标。`:S.canAct?'点击蓝色格子移动，或选择行动。':'敌军行动中…');
  const el=document.querySelector('.bc-hint'); if(el) el.textContent=hint;
  const bh=$('#battleHint'); if(bh) bh.textContent=S.canAct?'拖拽旋转视角 · 滚轮缩放 · Space 待机 · Esc 取消':'观战中 · 拖拽旋转视角';
}
function updateUnitBar(u){
  if(!u||!u.barCv) return;
  const c=u.barCv.getContext('2d'); const W=u.barCv.width,H=u.barCv.height;
  c.clearRect(0,0,W,H);
  c.fillStyle='rgba(8,12,9,.88)'; c.fillRect(0,2,W,H-4);
  c.strokeStyle='rgba(220,205,175,.35)'; c.lineWidth=2; c.strokeRect(1,3,W-2,H-6);
  const ratio=clamp(u.hp/u.maxHp,0,1);
  const col=u.side==='enemy'?'#c96555':(ratio<.3?'#d09a54':'#79bd8d');
  c.fillStyle=col; c.fillRect(4,6,(W-8)*ratio,H-12);
  const rr=clamp(u.rage/100,0,1);
  c.fillStyle='rgba(224,187,105,.85)'; c.fillRect(4,H-5,(W-8)*rr,2);
  if(u.barTex) u.barTex.needsUpdate=true;
  if(S&&S.selected===u||S.hoverUnit===u) showIntel(u);
  if(S&&S.current===u) updateCommand();
}
function showIntel(u){
  const el=$('#battleIntel'); if(!el) return;
  if(!u||!u.alive){ el.innerHTML='<div class="intel-empty">将鼠标移至武将<br>查看军情</div>'; return; }
  const cls=DATA.CLASSES[u.cls]||{}, terr=DATA.TERRAIN[tileAt(u.c,u.r)]||{};
  const buffs=(u.buffs||[]).map(b=>`<span class="buff-chip ${b.value<0?'bad':''}">${b.label}${b.value>0?'+':''}${Math.round(b.value*100)}%</span>`).join('')+(u.status.burn?`<span class="buff-chip bad">灼烧 ${u.status.burn.turns}</span>`:'')+(u.status.stun?'<span class="buff-chip bad">混乱</span>':'');
  const skills=u.skills.map(sid=>DATA.SKILLS[sid]?.name).filter(Boolean).join(' · ');
  let fcHtml='';
  const atk=S.current;
  if(atk&&atk.alive&&atk.side==='player'&&u.side==='enemy'&&(S.canAct||S.mode==='attack'||S.mode==='skill')){
    let power=1, opts={};
    if(S.mode==='skill'&&S.pendingSkill){ const sk=S.pendingSkill; if(validSkillTarget(atk,sk,u)){ power=sk.power||1; opts={crit:sk.crit||0,fire:sk.fx==='fire'}; } else power=0; }
    if(power>0){
      const f=forecast(atk,u,power,opts);
      fcHtml=`<div class="intel-forecast"><span>预计伤害 <b>${f.min}-${f.max}</b></span><span>命中 <b>${Math.round(f.hit*100)}%</b></span><span>暴击 <b>${Math.round(f.crit*100)}%</b></span>${f.counter?`<span>反击 <b>${Math.round(f.counter*100)}%</b></span>`:''}${f.flank?'<span>夹击</span>':''}</div>`;
    }
  }
  el.innerHTML=`<div class="intel-head"><img src="${ART.portrait(u.portrait)}"><div><div class="intel-name">${u.name}</div><div class="intel-sub">${u.side==='enemy'?'敌军':u.side==='ally'?'盟军':'我军'} · ${cls.name||''} · Lv.${u.lv}${u.isBoss?' · 主将':''}</div></div></div>
    <div class="intel-hp"><div class="intel-hp-row"><span>兵力</span><b>${Math.ceil(u.hp)} / ${u.maxHp}</b></div><div class="bar hp ${u.side==='enemy'?'enemy':''}"><i style="width:${clamp(u.hp/u.maxHp*100,0,100)}%"></i></div>
    <div class="intel-hp-row" style="margin-top:5px"><span>士气</span><b>${Math.floor(u.rage)} / 100</b></div><div class="bar rage"><i style="width:${u.rage}%"></i></div></div>
    <div class="intel-stats"><span>攻击 <b>${Math.round(effAtk(u))}</b></span><span>防御 <b>${Math.round(effDef(u))}</b></span><span>射程 <b>${u.minRange>1?u.minRange+'-':''}${u.range}</b></span><span>移动 <b>${u.move}</b></span><span>暴击 <b>${Math.round((u.crit||0)*100)}%</b></span><span>地形 <b>${terr.name||'—'}</b></span></div>
    ${fcHtml}
    ${S.threatUnit===u?'<div class="intel-threat">已显示该敌军的移动 + 攻击威胁范围</div>':''}
    <div class="intel-buffs">${buffs||'<span style="font-size:8px;color:rgba(169,158,133,.4)">无状态</span>'}</div>
    <div style="font-size:8px;color:rgba(169,158,133,.55);margin-top:7px;line-height:1.6">战法：${skills||'无'}</div>`;
}
function threatTiles(u){
  const md=computeMoveData(u); const set=new Set();
  for(let r=0;r<S.rows;r++)for(let c=0;c<S.cols;c++){
    if(md.dist[r][c]===Infinity) continue;
    let max=u.range+(tileAt(c,r)==='h'?1:0);
    if(S.cfg.weather==='fog'&&max>1) max=Math.max(1,max-1);
    if(S.cfg.weather==='rain'&&u.cls==='archer') max=Math.max(1,max-1);
    for(let rr=0;rr<S.rows;rr++)for(let cc=0;cc<S.cols;cc++){
      const d=Math.abs(cc-c)+Math.abs(rr-r);
      if(d>=u.minRange&&d<=max) set.add(cc+','+rr);
    }
  }
  return set;
}
function showThreat(u){
  if(!S||!u||!u.alive||S.threatUnit===u) return;
  hideThreat();
  const tiles=threatTiles(u); if(!tiles.size) return;
  const g=new THREE.Group(); S.threatGroup=g; S.threatUnit=u; S.scene.add(g);
  const geo=new THREE.PlaneGeometry(.98,.98);
  tiles.forEach(key=>{
    const [c,r]=key.split(',').map(Number); if(!isPassable(c,r)&&tileAt(c,r)!=='w') return;
    const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0x9b6bd6,transparent:true,opacity:.26,depthWrite:false,side:THREE.DoubleSide}));
    m.rotation.x=-Math.PI/2; const p=tileToWorld(c,r); m.position.set(p.x,p.y+.042,p.z); g.add(m);
  });
}
function hideThreat(){
  if(!S) return;
  if(S.threatGroup){ S.threatGroup.clear(); S.scene.remove(S.threatGroup); S.threatGroup=null; }
  S.threatUnit=null;
}
function clearHighlights(){
  if(!S) return;
  hideThreat();
  if(S.highlightGroup){ S.highlightGroup.clear(); S.scene.remove(S.highlightGroup); S.highlightGroup=null; }
  if(S.pathLine){ S.scene.remove(S.pathLine); S.pathLine=null; }
  S.units.forEach(u=>{ if(u.selRing) u.selRing.visible=false; });
  S.attackTiles=new Set(); S.skillTiles=new Set();
  closeMobileTargets();
}
function highlightTiles(tiles,color,opacity){
  if(S.highlightGroup){ S.highlightGroup.clear(); S.scene.remove(S.highlightGroup); }
  const g=new THREE.Group(); S.highlightGroup=g; S.scene.add(g);
  const geo=new THREE.PlaneGeometry(.98,.98);
  tiles.forEach(key=>{
    const [c,r]=key.split(',').map(Number); if(!isPassable(c,r)&&tileAt(c,r)!=='w') return;
    const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide});
    const m=new THREE.Mesh(geo,mat); m.rotation.x=-Math.PI/2; const p=tileToWorld(c,r); m.position.set(p.x,p.y+.045,p.z); m.userData.base=opacity; g.add(m);
  });
}
function showTutorial(text,kicker='战阵入门'){
  const el=$('#battleTutorial'); if(!el) return;
  el.classList.remove('hidden'); el.innerHTML=`<div class="tut-kicker">${kicker}</div><div class="tut-text">${text}</div><button class="tut-close" data-tut-close>✕</button><div class="tut-arrow"></div>`;
  $('[data-tut-close]',el).onclick=()=>{ el.classList.add('hidden'); };
  if(S&&S.isMobile){ clearTimeout(S.tutTimer); S.tutTimer=setTimeout(()=>{ if(S&&S.active) el.classList.add('hidden'); },7000); }
}
function hideTutorial(){ const el=$('#battleTutorial'); if(el) el.classList.add('hidden'); }

/* ---------------- 输入 / 拾取 ---------------- */
function bindBattleEvents(){
  const cv=S.renderer.domElement;
  const ray=new THREE.Raycaster(); S.raycaster=ray;
  const add=(el,type,fn,opt)=>{ el.addEventListener(type,fn,opt); S.listeners.push({el,type,fn}); };
  S.pointers=new Map();
  let down=false,startX=0,startY=0,lastX=0,lastY=0,startTime=0,dragged=false,pinchStart=0;
  const reset=()=>{ down=false;dragged=false;pinchStart=0;S.pointers.clear(); };
  add(cv,'pointerdown',e=>{
    if(!S||S.paused||S.ending) return;
    if(e.pointerType==='mouse'&&e.button!==0) return;
    try{ cv.setPointerCapture?.(e.pointerId); }catch(err){}
    S.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(S.pointers.size===1){
      down=true; dragged=false; startX=lastX=e.clientX; startY=lastY=e.clientY; startTime=performance.now();
    } else if(S.pointers.size===2){
      const p=[...S.pointers.values()]; pinchStart=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y); dragged=true;
    }
  });
  add(cv,'pointermove',e=>{
    if(!S||S.ending) return;
    if(S.pointers.has(e.pointerId)) S.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(S.pointers.size>=2){
      const p=[...S.pointers.values()]; const d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
      if(pinchStart>0&&d>0){ S.cam.dist=clamp(S.cam.dist/(d/pinchStart),8,38); pinchStart=d; drawMiniMap(); }
      dragged=true; return;
    }
    if(down){
      const dx=e.clientX-lastX,dy=e.clientY-lastY;
      if(Math.abs(e.clientX-startX)+Math.abs(e.clientY-startY)>10) dragged=true;
      if(dragged){
        if(S.isMobile) panCamera(dx,dy);
        else { S.cam.theta-=dx*.006; S.cam.phi=clamp(S.cam.phi+dy*.004,.5,1.18); }
        lastX=e.clientX; lastY=e.clientY;
      }
    }
    if(!down||!dragged) hoverAt(e);
  });
  add(cv,'pointerup',e=>{
    if(!S) return;
    const had=S.pointers.has(e.pointerId); S.pointers.delete(e.pointerId);
    if(S.pointers.size===0){
      if(had&&down&&!dragged&&performance.now()-startTime<700&&!S.paused&&!S.ending) clickAt(e);
      reset();
    } else if(S.pointers.size===1){
      const p=[...S.pointers.values()][0]; lastX=p.x; lastY=p.y;
    }
  });
  add(cv,'pointercancel',reset);
  add(cv,'contextmenu',e=>e.preventDefault());
  add(cv,'pointerleave',()=>{ if(S&&S.hoverUnit){ S.hoverUnit=null; showIntel(S.selected||S.current); } hideThreat(); });
  add(cv,'wheel',e=>{ if(!S) return; e.preventDefault(); S.cam.dist=clamp(S.cam.dist+e.deltaY*.012,8,38); drawMiniMap(); },{passive:false});
  add(window,'resize',()=>resizeBattle());
  add(document,'keydown',e=>{
    if(!S||!S.active||S.ending) return;
    if($('#modalRoot')?.classList.contains('open')) return;
    if(e.key==='Escape'){
      if(S.mode){ cancelTargeting(); }
      else if(window.UI) UI.openPause();
    } else if(e.key===' '){ e.preventDefault(); if(S.canAct&&!S.autoBattle) onAction('wait'); }
    else if(e.key==='a'||e.key==='A'){ e.preventDefault(); setAutoBattle(!S.autoBattle); }
    else if(e.key==='z'||e.key==='Z'){ e.preventDefault(); if(S.canAct&&S.current?.moved) undoMove(); }
    else if(e.key==='1'){ if(S.canAct) onAction('move'); }
    else if(e.key==='2'){ if(S.canAct) onAction('attack'); }
    else if(e.key==='3'){ if(S.canAct) onAction('skill'); }
    else if(e.key==='4'){ if(S.canAct) onAction('wait'); }
  });
}
function projectScreen(v){
  const p=v.clone().project(S.camera); if(p.z>1) return null;
  const r=S.renderer.domElement.getBoundingClientRect();
  return {x:r.left+(p.x*.5+.5)*r.width,y:r.top+(-p.y*.5+.5)*r.height};
}
function pointerRay(e){
  const rect=S.renderer.domElement.getBoundingClientRect();
  const p=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
  S.raycaster.setFromCamera(p,S.camera);
  const hits=S.raycaster.intersectObjects(S.pickables,false);
  if(hits.length){ const uid=hits[0].object.userData.uid; const u=S.units.find(x=>x.uid===uid&&x.alive); if(u) return {unit:u}; }
  // forgiving tap picking for small screens
  const threshold=S.isMobile?32:18; let near=null,nd=threshold;
  S.units.forEach(u=>{
    if(!u.alive||!u.group) return;
    const sp=projectScreen(new THREE.Vector3(u.group.position.x,u.group.position.y+1.1,u.group.position.z));
    if(!sp) return;
    const d=Math.hypot(sp.x-e.clientX,sp.y-e.clientY);
    if(d<nd){ nd=d; near=u; }
  });
  if(near) return {unit:near};
  const th=S.raycaster.intersectObjects(S.tilePick,false);
  if(th.length){ const {c,r}=th[0].object.userData; return {tile:{c,r}}; }
  // nearest tile centre fallback
  let best=null,bd=S.isMobile?34:16;
  for(let r=0;r<S.rows;r++)for(let c=0;c<S.cols;c++){
    const sp=projectScreen(tileToWorld(c,r)); if(!sp) continue;
    const d=Math.hypot(sp.x-e.clientX,sp.y-e.clientY);
    if(d<bd){ bd=d; best={c,r}; }
  }
  if(best) return {tile:best};
  return null;
}
function hoverAt(e){
  const hit=pointerRay(e); if(!hit) return;
  if(hit.unit){
    if(S.hoverUnit!==hit.unit){ S.hoverUnit=hit.unit; showIntel(hit.unit); }
    if(S.canAct&&S.mode!=='attack'&&S.mode!=='skill'&&hit.unit.side==='enemy'){ showThreat(hit.unit); showIntel(hit.unit); } else hideThreat();
    S.hoverTile={c:hit.unit.c,r:hit.unit.r};
    updateHoverTile(hit.unit.c,hit.unit.r);
  } else if(hit.tile){
    S.hoverUnit=null; hideThreat(); S.hoverTile=hit.tile;
    updateHoverTile(hit.tile.c,hit.tile.r);
    if(S.moveData&&S.canAct&&S.moveTiles?.has(hit.tile.c+','+hit.tile.r)) previewPath(hit.tile.c,hit.tile.r);
  }
}
function updateHoverTile(c,r){
  if(!S) return;
  if(S.hoverMesh){ S.scene.remove(S.hoverMesh); S.hoverMesh=null; }
  if(c==null) return;
  const p=tileToWorld(c,r);
  const m=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.0),new THREE.MeshBasicMaterial({color:0xf2dfb4,transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide}));
  m.rotation.x=-Math.PI/2; m.position.set(p.x,p.y+.055,p.z); S.scene.add(m); S.hoverMesh=m;
}
function previewPath(c,r){
  if(!S.current||!S.moveData) return;
  const path=pathTo(S.moveData,c,r); if(!path.length) return;
  if(S.pathLine){ S.scene.remove(S.pathLine); S.pathLine=null; }
  const pts=[new THREE.Vector3(S.current.group.position.x,S.current.group.position.y+.08,S.current.group.position.z)];
  path.forEach(p=>{ const w=tileToWorld(p.c,p.r); pts.push(new THREE.Vector3(w.x,w.y+.08,w.z)); });
  const geo=new THREE.BufferGeometry().setFromPoints(pts);
  const line=new THREE.Line(geo,new THREE.LineDashedMaterial({color:0xe7c884,dashSize:.18,gapSize:.12,transparent:true,opacity:.85}));
  line.computeLineDistances(); S.scene.add(line); S.pathLine=line;
}
function clickAt(e){
  if(!S||!S.active||S.busy||S.paused||S.ending) return;
  if($('#modalRoot')?.classList.contains('open')) return;
  const hit=pointerRay(e); if(!hit) return;
  const u=S.current;
  if(hit.unit){
    const target=hit.unit;
    if(S.mode==='attack'&&u&&S.canAct){
      if(validAttackTargets(u).includes(target)){ startAttackFromClick(target); return; }
      toast('目标不在攻击范围','bad'); return;
    }
    if(S.mode==='skill'&&u&&S.canAct){
      const sk=S.pendingSkill;
      if(sk&&validSkillTarget(u,sk,target)){ executeSkill(u,sk,target); return; }
      toast('目标无效','bad'); return;
    }
    if(target===u){ showMoveRange(u); showIntel(target); showMobileInfo(target); return; }
    showIntel(target); showMobileInfo(target);
    return;
  }
  if(hit.tile&&u&&S.canAct){
    const {c,r}=hit.tile;
    if(S.moveTiles?.has(c+','+r)&&!u.moved&&tileAt(c,r)!=='w'&&!S.units.some(x=>x.alive&&x!==u&&x.c===c&&x.r===r)){
      moveUnit(u,{c,r}); return;
    }
    if(S.mode==='attack'||S.mode==='skill'){ cancelTargeting(); }
  }
}
function validSkillTarget(u,sk,target){
  if(!target||!target.alive) return false;
  if(sk.target==='enemy'||sk.target==='areaEnemy') return isEnemy(u,target)&&manhattan(u,target)<=(sk.range||1)&&manhattan(u,target)>=1;
  if(sk.target==='ally') return !isEnemy(u,target)&&target!==u&&manhattan(u,target)<=(sk.range||3);
  if(sk.target==='lowest') return isEnemy(u,target);
  return false;
}

/* ---------------- 镜头 / 渲染 ---------------- */
function updateCamera(dt){
  if(!S) return;
  clampCamTarget();
  const e=S.introT<1?(1-Math.pow(1-S.introT,3)):1;
  const theta=S.cam.theta, phi=S.introT<1?(.55+(S.cam.phi-.55)*e):S.cam.phi;
  const dist=S.introT<1?(25+(S.cam.dist-25)*e):S.cam.dist;
  const target=S.cam.target;
  const x=target.x+Math.sin(phi)*Math.cos(theta)*dist;
  const z=target.z+Math.sin(phi)*Math.sin(theta)*dist;
  const y=target.y+Math.cos(phi)*dist;
  S.camera.position.set(x,y,z);
  if(S.shake>0&&SETTINGS.shake&&!SETTINGS.reduceMotion){ S.camera.position.x+=rand(-1,1)*S.shake*.14; S.camera.position.y+=rand(-1,1)*S.shake*.09; }
  S.shake=Math.max(0,S.shake-dt*2.4);
  S.camera.lookAt(target);
}
function renderLoop(now){
  if(!S||!S.active) return;
  S.loop=requestAnimationFrame(renderLoop);
  const dt=Math.min(.055,(now-(S.lastFrame||now))/1000); S.lastFrame=now;
  if(S.paused){ S.renderer.render(S.scene,S.camera); return; }
  if(S.hitStop>0){ S.hitStop=Math.max(0,S.hitStop-dt); S.renderer.render(S.scene,S.camera); return; }
  S.time+=dt;
  // tweens
  for(let i=S.tweens.length-1;i>=0;i--){
    const tw=S.tweens[i]; tw.t+=dt*S.speed; const p=Math.min(1,tw.t/tw.dur); tw.fn(tw.ease(p));
    if(p>=1){ S.tweens.splice(i,1); tw.res(); }
  }
  updateCamera(dt);
  // particles
  for(let i=S.particles.length-1;i>=0;i--){
    const p=S.particles[i]; p.life-=dt; p.sprite.position.x+=p.vx*dt; p.sprite.position.y+=p.vy*dt; p.sprite.position.z+=p.vz*dt; p.vy+=p.gravity*dt; p.sprite.material.opacity=Math.max(0,p.life/p.max);
    if(p.life<=0){ S.scene.remove(p.sprite); S.particles.splice(i,1); }
  }
  // units idle, bars
  S.units.forEach((u,i)=>{
    if(!u.alive||!u.group) return;
    if(!S.busy&&S.current!==u){ u.group.position.y=tileToWorld(u.c,u.r).y+Math.sin(S.time*2.1+i)*.012; }
    if(u.bar){
      u.bar.visible=!!u.alive;
      const active=(u===S.current||u===S.hoverUnit||u===S.selected);
      const sc=S.isMobile?(active?.85:.7):(active?1:.86);
      u.bar.scale.set(.9*sc,.15*sc,1);
      u.bar.material.opacity=active?1:.9;
    }
    if(u.selRing){ u.selRing.rotation.z+=dt*1.2; const s=1+Math.sin(S.time*3)*.035; u.selRing.scale.set(s,s,1); }
    if(u.cape){ u.cape.rotation.x=.08+Math.sin(S.time*2+i)*.05; }
  });
  if(S.currentMarker){ const cu=S.current; if(cu&&cu.alive){ S.currentMarker.visible=true; const wp=cu.group.position; S.currentMarker.position.set(wp.x,wp.y+2.55+Math.sin(S.time*3)*.08,wp.z); S.currentMarker.rotation.y+=dt*1.6; } else S.currentMarker.visible=false; }
  // highlight pulse
  if(S.highlightGroup){ S.highlightGroup.children.forEach((m,i)=>{ if(m.material) m.material.opacity=(m.userData.base||.2)*(.82+Math.sin(S.time*2.6+i*.4)*.18); }); }
  // hover tile
  if(S.hoverMesh){ S.hoverMesh.material.opacity=.14+Math.sin(S.time*4)*.05; }
  // fire zones
  S.fireZones.forEach((f,i)=>{ if(f.mesh){ f.mesh.material.opacity=.22+Math.sin(S.time*5+i)*.12; f.mesh.scale.setScalar(.92+Math.sin(S.time*4+i)*.06); } });
  // banners
  S.bannerMeshes.forEach((b,i)=>{
    const arr=b.mesh.geometry.attributes.position.array, base=b.base;
    for(let j=0;j<arr.length;j+=3){ const x=base[j],y=base[j+1]; const w=(x+.17)/.34; arr[j]=x+Math.sin(S.time*2.6+b.phase+y*2)*.025*w; arr[j+2]=Math.sin(S.time*2.1+b.phase+y*2.5)*.04*w; }
    b.mesh.geometry.attributes.position.needsUpdate=true;
  });
  // clouds & birds & dust
  S.clouds.forEach(c=>{ c.position.x+=c.userData.speed*dt; if(c.position.x>28) c.position.x=-28; });
  S.birds?.forEach(b=>{ b.position.x+=dt*1.2; b.position.y+=Math.sin(S.time*2+b.userData.phase)*dt*.2; if(b.position.x>20) b.position.x=-20; b.rotation.y=Math.sin(S.time*.8+b.userData.phase)*.08; });
  if(S.dust){ S.dust.rotation.y+=dt*.012; }
  if(S.weatherPts){ const p=S.weatherPts.geometry.attributes.position; const snow=S.weatherPts.userData.snow; for(let i=0;i<p.count;i++){ let y=p.getY(i)-(snow?.55:2.3)*dt; let x=p.getX(i)+Math.sin(S.time*1.2+i)*dt*(snow?.3:.06); if(y<0){ y=8.5; x=(Math.random()-.5)*18; } p.setY(i,y); p.setX(i,x); } p.needsUpdate=true; }
  S.waterMats?.forEach((w,i)=>{ w.position.y=w.userData.base+Math.sin(S.time*1.4+i)*.012; });
  if(S.isMobile){ S.miniAcc=(S.miniAcc||0)+dt; if(S.miniAcc>.22){ S.miniAcc=0; drawMiniMap(); } }
  S.renderer.render(S.scene,S.camera);
}
function resizeBattle(){
  if(!S||!S.renderer) return;
  S.isMobile=isMobileView();
  const stage=$('#battleStage'); const w=stage.clientWidth,h=stage.clientHeight;
  S.camera.aspect=w/h; S.camera.updateProjectionMatrix(); S.renderer.setSize(w,h,false);
  drawMiniMap();
}
function applyQuality(){
  if(!S||!S.renderer) return;
  S.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,S.isMobile?1.4:(SETTINGS.quality==='low'?1:SETTINGS.quality==='medium'?1.4:2)));
  S.renderer.shadowMap.enabled=SETTINGS.quality!=='low';
  resizeBattle();
}

/* ---------------- 结束 ---------------- */
function finish(victory,opts={}){
  if(!S||S.ending) return;
  S.ending=true; S.paused=false; S.canAct=false; S.busy=true; S.mode=null; closeSkillPop(); clearHighlights();
  hideTutorial(); closeMobileTargets();
  const pb=$('#phaseBanner'); if(pb) pb.classList.remove('show');
  const cu=$('#battleCutin'); if(cu) cu.classList.remove('show');
  const bv=$('#bossVideo'); if(bv){ bv.pause(); bv.classList.remove('show'); bv.removeAttribute('src'); }
  closeMobileQueue();
  const mi=$('#mobileInfo'); if(mi) mi.classList.remove('open');
  updateHUD();
  AUDIO.sfx(victory?'victory':'defeat');
  // victory camera
  addTween(1.2,t=>{ S.cam.dist=17.2-3.5*t; S.cam.phi=.88-.1*t; },x=>x);
  const banner=document.createElement('div'); banner.className='battle-result-banner';
  banner.innerHTML=`<div class="result-word ${victory?'':'defeat'}">${victory?'大 捷':'败 北'}</div><div class="result-sub">${victory?(S.cfg.objective?.text||'克敌制胜'):'胜败乃兵家常事'}</div>`;
  $('#screen-battle').appendChild(banner);
  const stats=resultStats(victory);
  setTimeout(()=>{ if(S&&S.active) showResultModal(victory,stats,opts); },1500);
}
function resultStats(victory){
  const alive=S.playerUnits.filter(u=>u.alive);
  const hpRatio=alive.length?alive.reduce((s,u)=>s+u.hp/u.maxHp,0)/alive.length:0;
  const units=S.playerUnits.map(u=>({name:u.name,portrait:u.portrait,cls:u.cls,alive:u.alive,hp:u.hp,maxHp:u.maxHp,dmg:Math.round(u.stats?.dmg||0),taken:Math.round(u.stats?.taken||0),heal:Math.round(u.stats?.heal||0),kills:u.stats?.kills||0}));
  const mvp=units.slice().sort((a,b)=>(b.dmg+b.kills*90+b.heal*.5)-(a.dmg+a.kills*90+a.heal*.5))[0];
  return {rounds:S.round,kills:S.kills,survivors:alive.length,total:S.playerUnits.length,hpRatio,victory,units,mvp,auto:!!S.autoBattle};
}
function showResultModal(victory,stats,opts){
  if(!S||!S.active) return;
  const canRetry=!victory&&S.cfg.allowRetry&&!opts.retreat;
  const title=victory?'战斗胜利':'战斗失败';
  const kicker=victory?'克敌制胜':'兵败如山';
  const body=`<div style="display:flex;justify-content:center;gap:28px;padding:8px 0 18px"><div style="text-align:center"><div style="font-family:Georgia,serif;font-size:28px;color:var(--gold-2)">${stats.rounds}</div><div style="font-size:9px;color:var(--muted)">回合</div></div>
    <div style="text-align:center"><div style="font-family:Georgia,serif;font-size:28px;color:var(--gold-2)">${stats.kills}</div><div style="font-size:9px;color:var(--muted)">斩将</div></div>
    <div style="text-align:center"><div style="font-family:Georgia,serif;font-size:28px;color:var(--gold-2)">${stats.survivors}<span style="font-size:14px;color:var(--muted)">/${stats.total}</span></div><div style="font-size:9px;color:var(--muted)">存活</div></div>
    <div style="text-align:center"><div style="font-family:Georgia,serif;font-size:28px;color:var(--gold-2)">${Math.round(stats.hpRatio*100)}%</div><div style="font-size:9px;color:var(--muted)">余力</div></div></div>
    ${stats.mvp?`<div class="result-mvp"><img src="${ART.portrait(stats.mvp.portrait)}"><div class="rm-info"><div class="rm-kicker">${victory?'本阵首功':'力战之将'}${stats.auto?' · 自动战斗':''}</div><div class="rm-name">${stats.mvp.name}</div><div class="rm-stats"><span>伤害 <b>${stats.mvp.dmg}</b></span><span>斩将 <b>${stats.mvp.kills}</b></span>${stats.mvp.heal?`<span>治疗 <b>${stats.mvp.heal}</b></span>`:''}</div></div></div>`:''}
    <div style="text-align:center;font-size:10px;line-height:1.8;color:var(--muted)">${victory?'三军振奋，威震敌胆。':'收拾残部，来日再战。'}</div>`;
  const footer=victory?`<button class="mbtn primary" data-result-done>继续</button>`:
    (canRetry?`<button class="mbtn" data-result-retry>重新布阵</button><button class="mbtn" data-result-done>返回大地图</button>`:`<button class="mbtn primary" data-result-done>返回大地图</button>`);
  UI.openModal({ narrow:true,persistent:true,hideClose:true,kicker,title,sub:S.cfg.title||'',render:()=>({body,footer}),
    onMount:root=>{
      $('[data-result-done]',root)?.addEventListener('click',()=>{ endBattle({victory,retry:false,stats}); UI.closeModal(); });
      $('[data-result-retry]',root)?.addEventListener('click',()=>{ endBattle({victory:false,retry:true,stats}); UI.closeModal(); });
    },
    onClose:()=>{ if(S&&S.active) endBattle({victory,retry:false,stats}); }});
}
function endBattle(result){
  if(!S||S.resultHandled) return;
  S.resultHandled=true;
  const cb=S.onEnd; const cfg=S.cfg;
  const final=Object.assign({},result,{cfg,resultStats:result.stats});
  cleanup();
  if(cb) setTimeout(()=>cb(final),10);
}
function pause(){ if(S&&S.active&&!S.ending) S.paused=true; }
function resume(){ if(S) S.paused=false; }
function retreat(){
  if(!S||!S.active||S.ending) return;
  finish(false,{retreat:true});
}

return { start, pause, resume, retreat, applyQuality, get active(){return !!(S&&S.active);}, get paused(){return !!(S&&S.paused);}, get ending(){return !!(S&&S.ending);}, get state(){return S;}, devWin(){ if(S&&S.active&&!S.ending){ S.enemyUnits.forEach(u=>{u.hp=1;}); finish(true); } }, devLose(){ if(S&&S.active&&!S.ending){ S.playerUnits.forEach(u=>{u.hp=0;u.alive=false;}); finish(false); } }, devRefresh(){ updateHUD(); } };
})();

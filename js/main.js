/* ============================================================
   烽火三国 · 启动与主菜单
   3D 水墨山河 / 主循环 / 流程编排
   ============================================================ */
const MENU = (() => {
'use strict';
let renderer, scene, camera, canvas, clock, raf=null, active=true, ready=false;
let clouds=[], banners=[], embers=null, warrior=null, t=0, mouse={x:0,y:0}, targetMouse={x:0,y:0};
const glows=[];
function init(){
  canvas=document.getElementById('menu3d');
  if(!canvas || !window.THREE) return;
  try{
    renderer=new THREE.WebGLRenderer({canvas, antialias:true, alpha:true, powerPreference:'high-performance'});
    renderer.setClearColor(0x000000,0);
    renderer.outputEncoding=THREE.sRGBEncoding;
    renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.02;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, window.innerWidth<=900?1.35:(SETTINGS.quality==='low'?1:SETTINGS.quality==='medium'?1.4:2)));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    scene=new THREE.Scene(); scene.fog=new THREE.FogExp2(0x101814, .028);
    camera=new THREE.PerspectiveCamera(38, window.innerWidth/window.innerHeight, .1, 200);
    camera.position.set(0,3.6,12); camera.lookAt(0,1.3,-2);
    clock=new THREE.Clock();
    buildScene();
    buildUI3D();
    window.addEventListener('resize', resize);
    document.addEventListener('pointermove', e=>{ targetMouse.x=(e.clientX/window.innerWidth-.5)*2; targetMouse.y=(e.clientY/window.innerHeight-.5)*2; });
    ready=true; loop();
    document.addEventListener('screen:changed', e=>{ active=e.detail==='menu'; if(active&&!raf) loop(); });
  }catch(e){ console.warn('Menu 3D unavailable',e); }
}
function buildScene(){
  const hemi=new THREE.HemisphereLight(0x9fb8a8, 0x0a0e0c, .85); scene.add(hemi);
  const key=new THREE.DirectionalLight(0xffdfae, 1.35); key.position.set(-7,10,5); scene.add(key);
  const rim=new THREE.DirectionalLight(0x7fb4a0, .85); rim.position.set(6,4,-8); scene.add(rim);
  // sun/moon glow
  const moonTex=ART.cloud(77);
  const moon=new THREE.Sprite(new THREE.SpriteMaterial({map:moonTex, color:0xcfb77e, transparent:true, opacity:.18, depthWrite:false, fog:false, blending:THREE.AdditiveBlending}));
  moon.position.set(-7.5,6.2,-28); moon.scale.set(22,22,1); scene.add(moon);
  const moonSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:ART.moon(),transparent:true,depthWrite:false,fog:false,opacity:.95}));
  moonSprite.position.set(-7.5,6.2,-29); moonSprite.scale.set(6.4,6.4,1); scene.add(moonSprite);
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:ART.cloud(88), color:0xe2c88d, transparent:true, opacity:.12, depthWrite:false, fog:false, blending:THREE.AdditiveBlending}));
  halo.position.copy(moonSprite.position); halo.position.z+=.2; halo.scale.set(9,9,1); scene.add(halo);
  // mountain ridges
  const layers=[
    {z:-46, h:16, col:0x1c2b24, op:.9, seed:11},
    {z:-34, h:12, col:0x15231c, op:.95, seed:23},
    {z:-22, h:8.5, col:0x0f1a15, op:1, seed:37},
    {z:-12, h:5.4, col:0x0a1310, op:1, seed:53}
  ];
  layers.forEach((L,idx)=>{
    const shape=new THREE.Shape(); const rnd=ART.mulberry32(L.seed); const w=58;
    shape.moveTo(-w/2,0);
    let x=-w/2; const steps=10;
    while(x<w/2){ const nx=x+w/steps; const peak=L.h*(.35+rnd()*.85)*(idx===0?1.2:1); const mid=(x+nx)/2; shape.lineTo(mid,L.h*(.2+rnd()*.9)); shape.lineTo(nx,L.h*(.15+rnd()*.35)); x=nx; }
    shape.lineTo(w/2,0); shape.lineTo(-w/2,0);
    const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({color:L.col, transparent:true, opacity:L.op, side:THREE.DoubleSide, fog:true}));
    mesh.position.set(0,-1.5,L.z); mesh.scale.y=1; scene.add(mesh);
    // mist band
    const mist=new THREE.Mesh(new THREE.PlaneGeometry(60,3), new THREE.MeshBasicMaterial({map:ART.cloud(30+idx), transparent:true, opacity:.22, depthWrite:false, fog:false, blending:THREE.AdditiveBlending}));
    mist.position.set(0,L.h*.22-1.2,L.z+.8); scene.add(mist);
  });
  // ground
  const ground=new THREE.Mesh(new THREE.CircleGeometry(24,64), new THREE.MeshStandardMaterial({color:0x0b130f, roughness:1, metalness:0}));
  ground.rotation.x=-Math.PI/2; ground.position.y=-1.35; scene.add(ground);
  const ground2=new THREE.Mesh(new THREE.RingGeometry(10,24,64), new THREE.MeshBasicMaterial({color:0x22352a, transparent:true, opacity:.18, side:THREE.DoubleSide}));
  ground2.rotation.x=-Math.PI/2; ground2.position.y=-1.33; scene.add(ground2);
  // rocks
  for(let i=0;i<14;i++){
    const r=ART.mulberry32(100+i);
    const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.4+r()*1.4,0), new THREE.MeshStandardMaterial({color:0x1a211b, roughness:1, flatShading:true}));
    rock.position.set(-10+r()*20, -1.4+r()*.3, -3-r()*7); rock.scale.y=.45+r()*.5; rock.rotation.set(r()*3,r()*3,r()*3); scene.add(rock);
  }
  // banners
  const positions=[[-13,-1.2,-10,.54],[-15,-1.2,-14,.45],[10.6,-1.2,-8,.58],[12.4,-1.2,-13,.74]];
  positions.forEach((p,i)=>{
    const g=new THREE.Group(); g.position.set(p[0],p[1],p[2]); g.scale.setScalar(p[3]);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,6.2,6), new THREE.MeshStandardMaterial({color:0x2b2418, roughness:.9}));
    pole.position.y=3.1; g.add(pole);
    const top=new THREE.Mesh(new THREE.ConeGeometry(.1,.35,6), new THREE.MeshStandardMaterial({color:0xb99a56, metalness:.5, roughness:.5}));
    top.position.y=6.3; g.add(top);
    const tex=ART.banner(i%2?'蜀':'漢', i%2?'#3f7a56':'#782f27');
    const geo=new THREE.PlaneGeometry(1.7,2.55,10,16);
    const mat=new THREE.MeshStandardMaterial({map:tex, transparent:true, side:THREE.DoubleSide, roughness:.9, alphaTest:.05});
    const cloth=new THREE.Mesh(geo,mat); cloth.position.set(.9,4.65,0); g.add(cloth);
    banners.push({cloth, geo, phase:i*1.7, base:geo.attributes.position.array.slice()});
    scene.add(g);
  });
  // clouds
  for(let i=0;i<11;i++){
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:ART.cloud(i+1), transparent:true, opacity:.11+Math.random()*.11, depthWrite:false, fog:false, color:0xdfe5db}));
    s.position.set(-22+Math.random()*44, .5+Math.random()*7, -12-Math.random()*22);
    s.scale.set(10+Math.random()*16, 4+Math.random()*7, 1); s.userData.speed=.08+Math.random()*.15;
    scene.add(s); clouds.push(s);
  }
  // embers
  const N=260, pos=new Float32Array(N*3);
  for(let i=0;i<N;i++){ pos[i*3]=(Math.random()-.5)*22; pos[i*3+1]=-1+Math.random()*10; pos[i*3+2]=-3+Math.random()*10; }
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  const mat=new THREE.PointsMaterial({map:ART.ember(), size:.16, transparent:true, opacity:.75, depthWrite:false, blending:THREE.AdditiveBlending, color:0xffb968, sizeAttenuation:true});
  embers=new THREE.Points(geo,mat); scene.add(embers);
  // lone warrior
  // lone warrior intentionally omitted; keep the landscape breathing
  // grass tufts
  for(let i=0;i<80;i++){
    const r=ART.mulberry32(300+i);
    const blade=new THREE.Mesh(new THREE.ConeGeometry(.025,.22,3), new THREE.MeshBasicMaterial({color:0x2a3c2b}));
    blade.position.set(-10+r()*20,-1.33,-2-r()*8); blade.rotation.z=(r()-.5)*.4; scene.add(blade);
  }
}
function buildWarrior(){
  const g=new THREE.Group();
  const dark=new THREE.MeshStandardMaterial({color:0x1a241e, roughness:.88, metalness:.08});
  const cloth=new THREE.MeshStandardMaterial({color:0x23332a, roughness:.92});
  const trim=new THREE.MeshStandardMaterial({color:0xb08a45, roughness:.45, metalness:.5, emissive:0x2a1b08, emissiveIntensity:.4});
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.3,.44,1.6,6), cloth); body.position.y=1.0; g.add(body);
  const skirt=new THREE.Mesh(new THREE.ConeGeometry(.6,.9,6), dark); skirt.position.y=.35; g.add(skirt);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.24,12,10), dark); head.position.y=2.03; g.add(head);
  const helm=new THREE.Mesh(new THREE.ConeGeometry(.3,.5,6), dark); helm.position.y=2.24; g.add(helm);
  const crest=new THREE.Mesh(new THREE.BoxGeometry(.04,.45,.12), trim); crest.position.set(0,2.5,.02); g.add(crest);
  const cape=new THREE.Mesh(new THREE.PlaneGeometry(1.05,2.0,4,6), new THREE.MeshStandardMaterial({color:0x4a2220, roughness:1, side:THREE.DoubleSide, emissive:0x1a0806, emissiveIntensity:.5}));
  cape.position.set(0,1.1,-.35); cape.rotation.x=.12; g.add(cape);
  // spear
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.025,.03,3.9,5), new THREE.MeshStandardMaterial({color:0x2b2318, roughness:.8}));
  pole.position.set(.62,1.35,.1); pole.rotation.z=-.1; g.add(pole);
  const blade=new THREE.Mesh(new THREE.ConeGeometry(.1,.6,4), new THREE.MeshStandardMaterial({color:0xaab0a8, metalness:.7, roughness:.35}));
  blade.position.set(.62+3.9*.05,3.4,.1); g.add(blade);
  // shoulder plates
  [-.38,.38].forEach(x=>{ const p=new THREE.Mesh(new THREE.SphereGeometry(.22,8,6,0,Math.PI*2,0,Math.PI/2), dark); p.position.set(x,1.62,0); p.scale.set(1,.6,1); g.add(p); });
  return g;
}
function buildUI3D(){}
function resize(){
  if(!renderer) return;
  const w=window.innerWidth,h=window.innerHeight;
  renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix();
}
function applyQuality(){
  if(!renderer) return;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, window.innerWidth<=900?1.35:(SETTINGS.quality==='low'?1:SETTINGS.quality==='medium'?1.4:2)));
  resize();
}
function loop(){
  if(!ready) return;
  raf=requestAnimationFrame(loop);
  if(!active){ raf=null; return; }
  const dt=Math.min(clock.getDelta(),.05); t+=dt;
  mouse.x+=(targetMouse.x-mouse.x)*.03; mouse.y+=(targetMouse.y-mouse.y)*.03;
  const camX=Math.sin(t*.035)*.7 + mouse.x*.9;
  const camY=3.55 + Math.sin(t*.045)*.18 - mouse.y*.35;
  camera.position.x=camX; camera.position.y=camY; camera.position.z=11.6+Math.cos(t*.03)*.3;
  camera.lookAt(0,1.25,-2.5);
  clouds.forEach((c,i)=>{ c.position.x+=c.userData.speed*dt; if(c.position.x>24) c.position.x=-24; c.material.opacity=.09+Math.sin(t*.25+i)*.03+.05; });
  banners.forEach(b=>{
    const arr=b.geo.attributes.position.array, base=b.base;
    for(let i=0;i<arr.length;i+=3){
      const x=base[i], y=base[i+1];
      const w=(x+ .85)/1.7;
      arr[i]=x + Math.sin(t*2.2+b.phase+y*1.6)*.06*w;
      arr[i+2]=Math.sin(t*1.7+b.phase+y*2.1)*.12*w;
      arr[i+1]=y+Math.sin(t*1.2+b.phase+x*2)*.015;
    }
    b.geo.attributes.position.needsUpdate=true;
  });
  if(embers){ const p=embers.geometry.attributes.position; for(let i=0;i<p.count;i++){ let y=p.getY(i)+dt*(.18+((i*37)%100)/300); let x=p.getX(i)+Math.sin(t*.7+i)*dt*.03; if(y>9){ y=-1; x=(Math.random()-.5)*22; } p.setY(i,y); p.setX(i,x); } p.needsUpdate=true; }
  renderer.render(scene,camera);
}
function show(){ active=true; if(!raf) loop(); }
function hide(){ active=false; }
function start(){ show(); }
return {init, show, hide, applyQuality};
})();

const GAME = (() => {
'use strict';
let initialized=false;
function boot(){
  if(initialized) return; initialized=true;
  UI.init();
  MENU.init();
  UI.showScreen('menu');
  UI.updateMenu();
  AUDIO.setVolumes(SETTINGS.music, SETTINGS.sfx);
  on('achievement', e=>UI.achievement(e.detail||e));
  // boot fade
  const b=document.getElementById('bootScreen');
  setTimeout(()=>{ if(b){ b.classList.add('gone'); setTimeout(()=>b.remove(),850); } }, 260);
  // screen music
  on('screen:changed', e=>{
    const s=e.detail;
    if(!AUDIO.ready){ AUDIO.init(); }
    if(s==='menu'){ MENU.show(); if(AUDIO.ready) AUDIO.startMusic('menu'); }
    else MENU.hide();
    if(s==='campaign' && AUDIO.ready) AUDIO.startMusic('campaign');
  });
}
function startNew(diff){
  CORE.newGame(diff);
  CORE.saveGame('auto');
  UI.updateMenu();
  UI.showScreen('campaign');
  MENU.hide();
  CAMPAIGN.enter();
  setTimeout(()=>{
    const ch=DATA.CHAPTERS[0];
    UI.playStory(ch,'pre',()=>{
      CAMPAIGN.enter();
      CAMPAIGN.runChapter('ch0',{pre:false});
    });
  }, 500);
}
function loadFromSlot(slot){
  const ok=CORE.loadGame(slot);
  if(!ok){ UI.toast('读取失败','存档损坏或不存在。','bad'); return; }
  UI.showScreen('campaign');
  MENU.hide();
  CAMPAIGN.enter();
  UI.toast('征程继续',`第 ${GS.turn} 回合 · ${CORE.dateLabel()}`,'good');
  setTimeout(()=>{ if(AUDIO.ready) AUDIO.startMusic('campaign'); },300);
}
function toMenu(){
  UI.showScreen('menu');
  MENU.show();
  UI.updateMenu();
  if(AUDIO.ready) AUDIO.startMusic('menu');
}
function startCampaignFromBattle(){
  UI.showScreen('campaign');
  CAMPAIGN.enter();
}
return { boot, startNew, loadFromSlot, toMenu, startCampaignFromBattle };
})();

window.addEventListener('DOMContentLoaded', ()=>{
  // scripts are at the end of body, DOM is ready; still defer a tick for fonts
  setTimeout(()=>GAME.boot(), 30);
});
if(window.AI_ASSETS&&AI_ASSETS.misc){
  const a=document.getElementById('menuArt'); const v=document.getElementById('menuVideo');
  const showArt=()=>{ if(v) v.classList.remove('show'); if(a&&AI_ASSETS.misc.menu){ a.style.backgroundImage=`url('${AI_ASSETS.misc.menu}')`; a.classList.add('show'); } };
  if(v&&AI_ASSETS.misc.menuVideo&&window.innerWidth>900&&!SETTINGS.liteMode){ v.src=AI_ASSETS.misc.menuVideo; v.classList.add('show'); v.onerror=showArt; const pr=v.play(); if(pr&&pr.catch) pr.catch(showArt); }
  else showArt();
}
window.UI=UI; window.MENU=MENU; window.CORE=CORE; window.DATA=DATA; window.ART=ART; window.AUDIO=AUDIO; window.GAME=GAME; window.BATTLE=BATTLE; window.CAMPAIGN=CAMPAIGN; window.SETTINGS=SETTINGS;
window.TK={ CORE, UI, SETTINGS, get GS(){return GS;}, DATA, ART, AUDIO, MENU, GAME, BATTLE, CAMPAIGN };

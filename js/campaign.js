/* ============================================================
   烽火三国 · 天下
   山河舆图 / 城池经营 / 出征 / 回合 / 章回推进
   ============================================================ */
const CAMPAIGN = (() => {
'use strict';
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const MAPW=1000, MAPH=720;
let canvas, ctx, dpr=1, view={scale:1,ox:0,oy:0,w:0,h:0};
let staticCanvas=null, staticKey='';
let hoverCity=null, selectedCity=null, attackMode=false, mouse={x:0,y:0}, cityHits=[];
let mapDrag=null, mapDragged=false;
let mapLoop=null, lastDraw=0, mapTime=0, mapZoom=1, mapInited=false;
let aiQueue=[], busy=false, inBattle=false, bound=false;
let pendingStory=null;
const isNarrow=()=>window.innerWidth<=900;
function setCitySheet(open){
  const p=$('#cityPanel'); if(!p) return;
  p.classList.toggle('open',!!open);
  const b=$('#mobileCityToggle'); if(b) b.style.display=open?'none':'flex';
}

/* ---------------- 进入 ---------------- */
function enter(){
  if(!GS) return;
  canvas=$('#mapCanvas');
  if(window.AI_ASSETS&&AI_ASSETS.misc&&AI_ASSETS.misc.parchment){ const mp=$('#mapPaper'); if(mp){ mp.style.backgroundImage=`url('${AI_ASSETS.misc.parchment}')`; mp.classList.add('show'); } }
  if(!bound) bind();
  resizeMap();
  updateHUD();
  if(!selectedCity || !GS.cities[selectedCity] || GS.cities[selectedCity].owner!=='shu'){ const pc=CORE.playerCities()[0]; if(pc) selectedCity=pc.id; }
  if(selectedCity && GS.cities[selectedCity]) renderCityPanel(selectedCity);
  if(isNarrow()){ setCitySheet(false); const b=$('#mobileCityToggle'); if(b) b.style.display='flex'; }
  updateHint();
  startLoop();
  if(GS.flags.needCh3 && !GS.flags.ch3Offered && !inBattle){
    GS.flags.ch3Offered=true;
    setTimeout(()=>{ if(!inBattle) runChapter('ch3'); },1000);
  }
}
function startLoop(){
  if(mapLoop) return;
  const tick=ts=>{
    mapLoop=requestAnimationFrame(tick);
    if(!document.getElementById('screen-campaign')?.classList.contains('active')) return;
    if(ts-lastDraw<40) return;
    lastDraw=ts; mapTime=ts/1000; drawMap();
  };
  mapLoop=requestAnimationFrame(tick);
}
function bind(){
  bound=true;
  window.addEventListener('resize',()=>{ if(document.getElementById('screen-campaign').classList.contains('active')) resizeMap(); });
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0) return;
    const r=canvas.getBoundingClientRect(); mapDrag={x:e.clientX,y:e.clientY,ox:view.ox,oy:view.oy,moved:false};
    try{canvas.setPointerCapture?.(e.pointerId);}catch(err){}
    mapDragged=false;
  });
  canvas.addEventListener('pointermove',e=>{
    const r=canvas.getBoundingClientRect(); mouse.x=e.clientX-r.left; mouse.y=e.clientY-r.top;
    if(mapDrag){
      const dx=e.clientX-mapDrag.x, dy=e.clientY-mapDrag.y;
      if(Math.abs(dx)+Math.abs(dy)>6){
        mapDrag.moved=true; mapDragged=true;
        const mapW=MAPW*view.scale, mapH=MAPH*view.scale;
        let ox=mapDrag.ox+dx, oy=mapDrag.oy+dy;
        if(mapW>view.w) ox=Math.max(view.w-mapW,Math.min(0,ox)); else ox=(view.w-mapW)/2;
        if(mapH>view.h) oy=Math.max(view.h-mapH,Math.min(0,oy)); else oy=(view.h-mapH)/2;
        view.ox=ox; view.oy=oy; staticKey=''; drawMap();
        $('#mapTooltip').classList.remove('show');
      }
      if(mapDrag.moved) return;
    }
    const hit=hitCity(mouse.x,mouse.y);
    hoverCity=hit?hit.id:null;
    const tip=$('#mapTooltip');
    if(hit){
      const c=GS.cities[hit.id], st=DATA.CITIES[hit.id], fac=DATA.FACTIONS[c.owner];
      tip.innerHTML=`<b>${st.name}</b><div class="mt-owner" style="color:${fac?.color||'#999'}">${fac?.name||'无主'} · ${st.region}</div>
        <div class="mt-row"><span>兵力</span><span>${CORE.fmt(c.troops)}</span></div>
        <div class="mt-row"><span>城防</span><span>${c.defenses}</span></div>
        <div class="mt-row"><span>治安</span><span>${Math.round(c.order)}</span></div>`;
      tip.classList.add('show');
      const shell=$('#mapShell').getBoundingClientRect();
      let tx=mouse.x+18, ty=mouse.y+16;
      if(tx>shell.width-190) tx=mouse.x-190;
      if(ty>shell.height-120) ty=mouse.y-110;
      tip.style.left=tx+'px'; tip.style.top=ty+'px';
      canvas.style.cursor='pointer';
    } else {
      tip.classList.remove('show'); canvas.style.cursor=attackMode?'crosshair':'grab';
    }
  });
  canvas.addEventListener('pointerup',()=>{ mapDrag=null; setTimeout(()=>{mapDragged=false;},60); });
  canvas.addEventListener('pointercancel',()=>{ mapDrag=null; mapDragged=false; });
  canvas.addEventListener('pointerleave',()=>{ hoverCity=null; $('#mapTooltip').classList.remove('show'); });
  canvas.addEventListener('click',e=>{
    if(mapDragged){ mapDragged=false; return; }
    const r=canvas.getBoundingClientRect(); const x=e.clientX-r.left, y=e.clientY-r.top;
    const hit=hitCity(x,y);
    if(hit) onCityClick(hit.id);
    else if(attackMode){ attackMode=false; updateHint(); drawMap(); }
  });
  $$('.tool-btn').forEach(b=>b.addEventListener('click',()=>onTool(b.dataset.tool)));
  $('#btnEndTurn').addEventListener('click',endTurn);
  $('#mobileCityToggle')?.addEventListener('click',()=>{ if(!selectedCity){ const pc=CORE.playerCities()[0]; if(pc) selectedCity=pc.id; } if(selectedCity) renderCityPanel(selectedCity); setCitySheet(true); });
  $$('#mapZoom [data-zoom]').forEach(b=>b.addEventListener('click',()=>{ if(b.dataset.zoom==='in') mapZoom=Math.min(2,mapZoom+.25); else if(b.dataset.zoom==='out') mapZoom=Math.max(1,mapZoom-.25); else mapZoom=1; resizeMap(); }));
  $('#btnStoryLog').addEventListener('click',openChapterLog);
  $('#btnHelp').addEventListener('click',()=>UI.openHelp());
  document.addEventListener('screen:changed',()=>{ const tip=document.querySelector('#mapTooltip'); if(tip) tip.classList.remove('show'); });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && attackMode && !$('#modalRoot').classList.contains('open')){ attackMode=false; updateHint(); }
  });
}

/* ---------------- 尺寸 ---------------- */
function resizeMap(){
  if(!canvas) return;
  const shell=$('#mapShell'); const r=shell.getBoundingClientRect();
  dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.max(300,Math.round(r.width*dpr)); canvas.height=Math.max(240,Math.round(r.height*dpr));
  canvas.style.width=r.width+'px'; canvas.style.height=r.height+'px';
  ctx=canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
  const w=r.width,h=r.height;
  if(!mapInited){ mapInited=true; if(isNarrow()) mapZoom=1.35; }
  const pad=Math.max(12,Math.min(w,h)*.035);
  const fit=Math.min((w-pad*2)/MAPW,(h-pad*2)/MAPH);
  const scale=fit*mapZoom;
  let ox=(w-MAPW*scale)/2, oy=(h-MAPH*scale)/2;
  if(MAPW*scale>w) ox=Math.max(w-MAPW*scale,Math.min(0,ox));
  if(MAPH*scale>h) oy=Math.max(h-MAPH*scale,Math.min(0,oy));
  else if(isNarrow()) oy=8;
  view={w,h,scale,ox,oy,zoom:mapZoom};
  staticKey=''; staticCanvas=null;
  drawMap();
}
const X=x=>view.ox+x*MAPW*view.scale;
const Y=y=>view.oy+y*MAPH*view.scale;
function cityPos(id){ const st=DATA.CITIES[id]; return {x:X(st.x),y:Y(st.y)}; }
function hitCity(x,y){
  let best=null, bd=30;
  cityHits.forEach(h=>{ const d=Math.hypot(x-h.x,y-h.y); if(d<bd){ best=h; bd=d; } });
  return best;
}

/* ---------------- 舆图 ---------------- */
function makeStatic(){
  const w=view.w,h=view.h;
  const cv=document.createElement('canvas'); cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr);
  const c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0);
  // 绢底
  const bg=c.createLinearGradient(0,0,w,h); bg.addColorStop(0,'#d9c9a7'); bg.addColorStop(.45,'#cbb992'); bg.addColorStop(1,'#b9a67e');
  c.fillStyle=bg; c.fillRect(0,0,w,h);
  // paper fibres
  const rnd=ART.mulberry32(20240815);
  for(let i=0;i<2400;i++){ c.fillStyle=`rgba(${rnd()>.5?'255,248,228':'70,52,28'},${.015+rnd()*.045})`; c.fillRect(rnd()*w,rnd()*h,1,1); }
  for(let i=0;i<16;i++){ c.strokeStyle='rgba(94,74,44,.035)'; c.lineWidth=1; c.beginPath(); const y=rnd()*h; c.moveTo(0,y); c.bezierCurveTo(w*.3,y+rnd()*8,w*.6,y-rnd()*8,w,y+rnd()*4); c.stroke(); }
  // 海
  const sea=c.createLinearGradient(w*.7,0,w,h); sea.addColorStop(0,'#a9bcae'); sea.addColorStop(.5,'#93aba1'); sea.addColorStop(1,'#78968f');
  c.fillStyle=sea; c.fillRect(0,0,w,h);
  for(let i=0;i<28;i++){ c.strokeStyle=`rgba(238,244,230,${.05+rnd()*.08})`; c.lineWidth=1.2; const y=view.oy+(0.05+rnd()*.86)*MAPH*view.scale; const x=view.ox+(.78+rnd()*.2)*MAPW*view.scale; const len=(20+rnd()*60)*view.scale; c.beginPath(); c.moveTo(x,y); c.quadraticCurveTo(x+len*.5,y-3,x+len,y); c.stroke(); }
  // 陆地
  c.save();
  const land=new Path2D();
  land.moveTo(X(.02),Y(.08));
  land.bezierCurveTo(X(.18),Y(.01),X(.45),Y(.02),X(.70),Y(.035));
  land.bezierCurveTo(X(.80),Y(.02),X(.86),Y(.10),X(.855),Y(.21));
  land.bezierCurveTo(X(.90),Y(.28),X(.865),Y(.36),X(.88),Y(.43));
  land.bezierCurveTo(X(.85),Y(.49),X(.91),Y(.56),X(.865),Y(.63));
  land.bezierCurveTo(X(.90),Y(.72),X(.83),Y(.82),X(.75),Y(.90));
  land.bezierCurveTo(X(.63),Y(.96),X(.49),Y(.93),X(.38),Y(.965));
  land.bezierCurveTo(X(.25),Y(.94),X(.15),Y(.88),X(.10),Y(.77));
  land.bezierCurveTo(X(.03),Y(.65),X(.05),Y(.51),X(.025),Y(.39));
  land.bezierCurveTo(X(.00),Y(.26),X(.035),Y(.17),X(.02),Y(.08));
  land.closePath();
  const landGrad=c.createLinearGradient(0,0,w,h); landGrad.addColorStop(0,'#d3c39e'); landGrad.addColorStop(.4,'#cbbb92'); landGrad.addColorStop(1,'#b4a279');
  c.fillStyle=landGrad; c.fill(land);
  c.strokeStyle='rgba(74,58,34,.42)'; c.lineWidth=1.6; c.stroke(land);
  c.clip(land);
  // 州郡淡彩
  function wash(x,y,rx,ry,col,a){ const g=c.createRadialGradient(x,y,0,x,y,Math.max(rx,ry)); g.addColorStop(0,col); g.addColorStop(1,'rgba(0,0,0,0)'); c.globalAlpha=a; c.fillStyle=g; c.beginPath(); c.ellipse(x,y,rx,ry,0,0,Math.PI*2); c.fill(); c.globalAlpha=1; }
  wash(X(.56),Y(.24),X(.18)-X(0),Y(.16)-Y(0),'rgba(130,145,95,.5)',.5);
  wash(X(.35),Y(.39),X(.22)-X(0),Y(.13)-Y(0),'rgba(186,160,102,.5)',.55);
  wash(X(.68),Y(.62),X(.24)-X(0),Y(.18)-Y(0),'rgba(103,140,108,.45)',.5);
  wash(X(.23),Y(.62),X(.16)-X(0),Y(.17)-Y(0),'rgba(111,142,91,.5)',.5);
  // 山脉
  function ridge(cx,cy,width,height,seed,color,alpha){
    const r=ART.mulberry32(seed); const n=7; const step=width/n;
    c.beginPath(); c.moveTo(cx-width/2,cy);
    for(let i=0;i<n;i++){ const x=cx-width/2+i*step; const h=height*(.35+r()*.75); c.lineTo(x+step*.35,cy-h); c.lineTo(x+step*.52,cy-h*(.4+r()*.25)); c.lineTo(x+step,cy-h*(.15+r()*.3)); }
    c.lineTo(cx+width/2,cy); c.closePath();
    const g=c.createLinearGradient(cx,cy-height,cx,cy); g.addColorStop(0,color); g.addColorStop(1,'rgba(70,70,55,.12)');
    c.globalAlpha=alpha; c.fillStyle=g; c.fill(); c.globalAlpha=1;
    c.strokeStyle='rgba(52,50,38,.28)'; c.lineWidth=1; c.stroke();
    // brush texture
    c.strokeStyle='rgba(245,238,216,.1)'; for(let i=0;i<5;i++){ const x=cx-width/2+r()*width; c.beginPath(); c.moveTo(x,cy-height*.1); c.lineTo(x+r()*20-10,cy-height*(.35+r()*.45)); c.stroke(); }
  }
  ridge(X(.16),Y(.40),X(.24)-X(0),Y(.16)-Y(0),31,'rgba(99,101,78,.55)',.8);
  ridge(X(.27),Y(.32),X(.12)-X(0),Y(.19)-Y(0),17,'rgba(86,91,69,.55)',.75);
  ridge(X(.20),Y(.55),X(.13)-X(0),Y(.12)-Y(0),41,'rgba(91,99,76,.45)',.8);
  ridge(X(.32),Y(.46),X(.10)-X(0),Y(.08)-Y(0),55,'rgba(104,103,76,.4)',.7);
  ridge(X(.28),Y(.78),X(.17)-X(0),Y(.10)-Y(0),67,'rgba(88,99,76,.4)',.65);
  ridge(X(.48),Y(.86),X(.20)-X(0),Y(.08)-Y(0),79,'rgba(96,105,80,.32)',.6);
  // 森林
  function tree(x,y,s){ c.fillStyle='rgba(62,82,55,.45)'; c.beginPath(); c.moveTo(x,y-s); c.lineTo(x+s*.55,y+s*.35); c.lineTo(x-s*.55,y+s*.35); c.closePath(); c.fill(); c.strokeStyle='rgba(45,60,40,.4)'; c.beginPath(); c.moveTo(x,y+s*.35); c.lineTo(x,y+s*.7); c.stroke(); }
  const forestSpots=[[.40,.53,.11],[.47,.48,.08],[.33,.70,.12],[.55,.80,.13],[.72,.50,.07],[.62,.42,.06],[.23,.67,.08],[.52,.26,.06]];
  forestSpots.forEach((f,fi)=>{ const rr=ART.mulberry32(400+fi); for(let i=0;i<32;i++){ const a=rr()*Math.PI*2, rad=Math.sqrt(rr()); const fx=X(f[0]+Math.cos(a)*rad*f[2]), fy=Y(f[1]+Math.sin(a)*rad*f[2]*.7); tree(fx,fy,(3+rr()*4)*view.scale); } });
  // 河川
  function river(points,width,col1,col2){
    c.lineCap='round'; c.lineJoin='round';
    c.strokeStyle='rgba(80,108,106,.3)'; c.lineWidth=width*2.1; c.beginPath(); points.forEach((p,i)=>i?c.lineTo(X(p[0]),Y(p[1])):c.moveTo(X(p[0]),Y(p[1]))); c.stroke();
    c.strokeStyle=col1; c.lineWidth=width; c.beginPath(); points.forEach((p,i)=>i?c.lineTo(X(p[0]),Y(p[1])):c.moveTo(X(p[0]),Y(p[1]))); c.stroke();
    c.strokeStyle=col2; c.lineWidth=Math.max(1,width*.32); c.beginPath(); points.forEach((p,i)=>i?c.lineTo(X(p[0]),Y(p[1])):c.moveTo(X(p[0]),Y(p[1]))); c.stroke();
  }
  river([[.17,.29],[.28,.30],[.36,.27],[.46,.30],[.53,.28],[.62,.30],[.72,.35],[.80,.36],[.855,.38]],9*view.scale,'rgba(112,145,145,.8)','rgba(218,229,214,.45)');
  river([[.10,.61],[.22,.63],[.32,.62],[.42,.66],[.52,.62],[.60,.66],[.68,.61],[.78,.62],[.86,.58]],12*view.scale,'rgba(96,134,136,.8)','rgba(218,231,216,.45)');
  // lakes
  c.fillStyle='rgba(108,142,140,.55)'; c.beginPath(); c.ellipse(X(.555),Y(.695),X(.045)-X(0),Y(.026)-Y(0),-.15,0,Math.PI*2); c.fill();
  c.beginPath(); c.ellipse(X(.70),Y(.675),X(.036)-X(0),Y(.02)-Y(0),.1,0,Math.PI*2); c.fill();
  // 道路
  const drawn=new Set();
  Object.values(DATA.CITIES).forEach(a=>{
    (a.adjacent||[]).forEach(bid=>{
      const key=[a.id,bid].sort().join('|'); if(drawn.has(key)) return; drawn.add(key);
      const b=DATA.CITIES[bid]; if(!b) return;
      const x1=X(a.x),y1=Y(a.y),x2=X(b.x),y2=Y(b.y);
      const mx=(x1+x2)/2,my=(y1+y2)/2; const h=ART.hash(key); const off=((h%100)/100-.5)*44*view.scale;
      const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1; const px=-dy/len*off,py=dx/len*off;
      c.save(); c.strokeStyle='rgba(93,72,42,.34)'; c.lineWidth=Math.max(1,1.3*view.scale); c.setLineDash([2.5*view.scale,6*view.scale]); c.lineDashOffset=0;
      c.beginPath(); c.moveTo(x1,y1); c.quadraticCurveTo(mx+px,my+py,x2,y2); c.stroke(); c.restore();
    });
  });
  // 州名
  c.save(); c.textAlign='center'; c.fillStyle='rgba(74,57,33,.22)'; c.font=`${Math.round(22*view.scale)}px "STKaiti","KaiTi",serif`;
  if(!isNarrow()) [[.64,.17,'幽州'],[.60,.30,'冀州'],[.44,.37,'司隶'],[.57,.48,'豫州'],[.76,.44,'徐州'],[.46,.63,'荆州'],[.78,.66,'扬州'],[.20,.55,'益州'],[.30,.42,'凉州']].forEach(l=>c.fillText(l[2],X(l[0]),Y(l[1])));
  c.fillStyle='rgba(74,57,33,.10)'; c.font=`${Math.round(74*view.scale)}px "STKaiti","KaiTi",serif`; c.fillText('汉',X(.18),Y(.24));
  c.restore();
  // 水纹高光
  c.strokeStyle='rgba(255,248,226,.12)'; for(let i=0;i<55;i++){ const x=X(.08+Math.random()*.15),y=Y(.25+Math.random()*.5); c.beginPath(); c.moveTo(x,y); c.lineTo(x+20*view.scale,y); c.stroke(); }
  c.restore(); // clip land
  // 外沿墨迹
  c.save(); c.globalAlpha=.15; c.strokeStyle='#43331d'; c.lineWidth=8; c.strokeRect(0,0,w,h); c.globalAlpha=.35; c.lineWidth=1; c.strokeRect(10,10,w-20,h-20); c.restore();
  // 图名与印
  c.save(); c.fillStyle='rgba(67,50,27,.8)'; c.font=`${Math.round(16*view.scale)}px "STKaiti","KaiTi",serif`; c.fillText('汉末十三州舆图',X(.035),Y(.06));
  c.fillStyle='rgba(148,45,34,.82)'; c.fillRect(X(.90),Y(.055),30*view.scale,30*view.scale); c.fillStyle='#f0dfc0'; c.font=`${Math.round(15*view.scale)}px "STKaiti","KaiTi",serif`; c.textAlign='center'; c.fillText('漢',X(.90)+15*view.scale,Y(.055)+21*view.scale);
  c.restore();
  // mobile lower-sea decoration
  if(isNarrow()){
    c.save();
    c.globalAlpha=.13; c.fillStyle='#243f34'; c.textAlign='center';
    c.font=`${Math.round(30*view.scale)}px "STKaiti","KaiTi",serif`;
    ['江','山','如','画','一','时','多','少','豪','杰'].forEach((ch,i)=>c.fillText(ch,view.w*.78,view.h*.66+i*Math.round(31*view.scale)));
    c.globalAlpha=.18; c.strokeStyle='#345548'; c.lineWidth=1;
    c.beginPath(); c.arc(view.w*.78,view.h*.87,Math.min(view.w,view.h)*.13,0,Math.PI*2); c.stroke();
    c.beginPath(); c.arc(view.w*.78,view.h*.87,Math.min(view.w,view.h)*.1,0,Math.PI*2); c.stroke();
    c.beginPath(); c.moveTo(view.w*.78,view.h*.73); c.lineTo(view.w*.78,view.h*.99); c.moveTo(view.w*.64,view.h*.87); c.lineTo(view.w*.92,view.h*.87); c.stroke();
    c.fillStyle='#345548'; c.font=`${Math.round(9*view.scale)}px "STKaiti",serif`; c.fillText('北',view.w*.78,view.h*.74);
    c.globalAlpha=.10; c.strokeStyle='#e9ddc2';
    for(let i=0;i<7;i++){ c.beginPath(); c.arc(view.w*.78,view.h*.87,Math.min(view.w,view.h)*(.15+i*.035),Math.PI*1.1,Math.PI*1.9); c.stroke(); }
    c.restore();
  }
  staticCanvas=cv; staticKey=w+'x'+h;
}

function drawMap(){
  if(!ctx||!GS) return;
  if(!staticCanvas||staticKey!==view.w+'x'+view.h) makeStatic();
  ctx.clearRect(0,0,view.w,view.h);
  ctx.drawImage(staticCanvas,0,0,view.w,view.h);
  drawAnimatedWater();
  drawClouds();
  drawCityLinks();
  drawCities();
  drawMapVignette();
}

function drawAnimatedWater(){
  const t=mapTime; ctx.save(); ctx.lineCap='round';
  const rivers=[[[.17,.29],[.28,.30],[.36,.27],[.46,.30],[.53,.28],[.62,.30],[.72,.35],[.80,.36],[.855,.38]],[[.10,.61],[.22,.63],[.32,.62],[.42,.66],[.52,.62],[.60,.66],[.68,.61],[.78,.62],[.86,.58]]];
  rivers.forEach((pts,ri)=>{
    ctx.strokeStyle='rgba(237,244,225,.28)'; ctx.lineWidth=1.4*view.scale; ctx.setLineDash([3*view.scale,14*view.scale]); ctx.lineDashOffset=-(t*(12+ri*5))%200;
    ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(X(p[0]),Y(p[1])):ctx.moveTo(X(p[0]),Y(p[1]))); ctx.stroke();
  });
  ctx.restore();
}
function drawClouds(){
  const t=mapTime;
  for(let i=0;i<5;i++){
    const cx=((mapTime*(3+i*.7)+i*260)%(view.w+300))-150;
    const cy=Y(.12+i*.16)+Math.sin(mapTime*.2+i)*10;
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,90*view.scale);
    g.addColorStop(0,'rgba(250,246,232,.16)'); g.addColorStop(.5,'rgba(250,246,232,.07)'); g.addColorStop(1,'rgba(250,246,232,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(cx,cy,110*view.scale,30*view.scale,0,0,Math.PI*2); ctx.fill();
  }
}
function drawCityLinks(){
  if(!selectedCity) return;
  const sel=DATA.CITIES[selectedCity]; if(!sel) return;
  const from=cityPos(selectedCity);
  const isPlayer=GS.cities[selectedCity].owner==='shu';
  sel.adjacent.forEach(id=>{
    const c=GS.cities[id]; if(!c) return;
    const to=cityPos(id);
    const hostile=isPlayer && c.owner!=='shu';
    if(attackMode && hostile){
      const t=mapTime;
      ctx.save(); ctx.strokeStyle='rgba(166,53,43,.7)'; ctx.lineWidth=2.2; ctx.setLineDash([7,5]); ctx.lineDashOffset=-t*28;
      ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(to.x,to.y); ctx.stroke(); ctx.restore();
      // arrowhead
      const ang=Math.atan2(to.y-from.y,to.x-from.x), mx=(from.x+to.x)/2,my=(from.y+to.y)/2;
      ctx.save(); ctx.translate(mx,my); ctx.rotate(ang); ctx.fillStyle='rgba(166,53,43,.8)'; ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(-4,5); ctx.lineTo(-4,-5); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  });
}

function drawCities(){
  cityHits=[];
  Object.values(DATA.CITIES).forEach((st,i)=>{
    const c=GS.cities[st.id]; if(!c) return;
    const narrow=window.innerWidth<=900;
    const p=cityPos(st.id), k=Math.max(.8,Math.min(1.38,view.scale*1.22));
    const fac=DATA.FACTIONS[c.owner]||{color:'#8a7749',short:'—'};
    const isSel=selectedCity===st.id, isHov=hoverCity===st.id, isPlayer=c.owner==='shu';
    cityHits.push({id:st.id,x:p.x,y:p.y,r:28*k});
    // selected / hover halo
    if(isSel||isHov){
      const r=(36+Math.sin(mapTime*3)*3)*k;
      ctx.save(); ctx.strokeStyle=isSel?'rgba(231,200,132,.95)':'rgba(255,250,235,.5)'; ctx.lineWidth=isSel?2:1;
      ctx.setLineDash(isSel?[6,4]:[2,4]); ctx.lineDashOffset=isSel?-mapTime*20:0;
      ctx.beginPath(); ctx.arc(p.x,p.y-4*k,r,0,Math.PI*2); ctx.stroke(); ctx.restore();
    }
    if(isPlayer){
      ctx.save(); ctx.strokeStyle='rgba(79,139,107,.4)'; ctx.lineWidth=1; ctx.setLineDash([1,5]); ctx.beginPath(); ctx.arc(p.x,p.y-4*k,(30+Math.sin(mapTime*2+i)*2)*k,0,Math.PI*2); ctx.stroke(); ctx.restore();
    }
    // 阴影
    ctx.save(); ctx.fillStyle='rgba(40,28,14,.2)'; ctx.beginPath(); ctx.ellipse(p.x,p.y+13*k,24*k,7*k,0,0,Math.PI*2); ctx.fill(); ctx.restore();
    // 城基
    ctx.save();
    ctx.fillStyle='#c6b48d'; ctx.strokeStyle='rgba(57,42,23,.7)'; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.rect(p.x-23*k,p.y-5*k,46*k,15*k); ctx.fill(); ctx.stroke();
    // 城垛
    for(let j=0;j<7;j++){ ctx.fillStyle='#d3c29a'; ctx.fillRect(p.x-23*k+j*6.6*k,p.y-8*k,4.2*k,3*k); }
    // 城门
    ctx.fillStyle='rgba(52,38,22,.8)'; ctx.beginPath(); ctx.moveTo(p.x-6*k,p.y+10*k); ctx.lineTo(p.x-6*k,p.y+1*k); ctx.quadraticCurveTo(p.x,p.y-5*k,p.x+6*k,p.y+1*k); ctx.lineTo(p.x+6*k,p.y+10*k); ctx.closePath(); ctx.fill();
    // 双阙
    ctx.fillStyle=fac.color; ctx.globalAlpha=.85; ctx.fillRect(p.x-26*k,p.y-14*k,8*k,9*k); ctx.fillRect(p.x+18*k,p.y-14*k,8*k,9*k);
    ctx.globalAlpha=1; ctx.strokeStyle='rgba(57,42,23,.6)'; ctx.strokeRect(p.x-26*k,p.y-14*k,8*k,9*k); ctx.strokeRect(p.x+18*k,p.y-14*k,8*k,9*k);
    // 旗
    const wave=Math.sin(mapTime*2.3+i)*2*k;
    ctx.strokeStyle='rgba(49,36,20,.8)'; ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(p.x+25*k,p.y-12*k); ctx.lineTo(p.x+25*k,p.y-45*k); ctx.stroke();
    ctx.fillStyle=fac.color; ctx.beginPath(); ctx.moveTo(p.x+25*k,p.y-45*k); ctx.lineTo(p.x+41*k+wave,p.y-41*k); ctx.lineTo(p.x+25*k,p.y-33*k); ctx.closePath(); ctx.fill();
    if(!narrow){ ctx.fillStyle='rgba(250,242,220,.9)'; ctx.font=`${Math.round(10*k)}px "STKaiti","KaiTi",serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(fac.short.slice(0,1),p.x+32*k+wave*.5,p.y-39*k); }
    // 名牌
    const pw=(narrow?55:72)*k, ph=(narrow?23:31)*k;
    ctx.fillStyle='rgba(18,23,19,.9)'; roundRect(ctx,p.x-pw/2,p.y+18*k,pw,ph,3*k); ctx.fill();
    ctx.strokeStyle=isPlayer?'rgba(201,164,95,.6)':'rgba(220,210,186,.3)'; ctx.lineWidth=1; roundRect(ctx,p.x-pw/2,p.y+18*k,pw,ph,3*k); ctx.stroke();
    ctx.fillStyle='#efe4cb'; ctx.font=`${Math.round((narrow?12.5:15)*k)}px "STKaiti","KaiTi",serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(st.name,p.x,p.y+(narrow?30:29)*k);
    if(!narrow){ ctx.fillStyle=isPlayer?'#9bc9ae':'#c8b795'; ctx.font=`${Math.round(8.5*k)}px "PingFang SC",sans-serif`; ctx.fillText(`兵 ${CORE.fmt(c.troops)}`,p.x,p.y+41*k); }
    // 目标标识
    const target=chapterTarget();
    if(target===st.id && !GS.flags.victory){
      const pulse=.5+Math.sin(mapTime*3)*.5; ctx.save(); ctx.translate(p.x,p.y-62*k); ctx.rotate(Math.PI/4); ctx.strokeStyle=`rgba(167,53,43,${.55+pulse*.35})`; ctx.lineWidth=1.5; ctx.strokeRect(-7*k,-7*k,14*k,14*k); ctx.restore();
      ctx.fillStyle='rgba(142,44,34,.88)'; ctx.font=`${Math.round(9*k)}px "STKaiti",serif`; ctx.textAlign='center'; ctx.fillText('目标',p.x,p.y-51*k);
    }
    ctx.restore();
  });
}
function drawMapVignette(){
  const g=ctx.createRadialGradient(view.w/2,view.h/2,Math.min(view.w,view.h)*.25,view.w/2,view.h/2,Math.max(view.w,view.h)*.72);
  g.addColorStop(0,'rgba(30,20,8,0)'); g.addColorStop(1,'rgba(30,20,8,.28)');
  ctx.fillStyle=g; ctx.fillRect(0,0,view.w,view.h);
  // floating dust
  const t=mapTime; for(let i=0;i<18;i++){ const x=(i*173+t*8)%view.w, y=(i*97+Math.sin(t*.5+i)*20+view.h*.2)%view.h; ctx.fillStyle='rgba(255,245,220,.22)'; ctx.beginPath(); ctx.arc(x,y,.8,0,Math.PI*2); ctx.fill(); }
}
function roundRect(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }

/* ---------------- HUD ---------------- */
function updateHUD(){
  if(!GS) return;
  const inc=CORE.incomeSummary(), troops=CORE.totalTroops(), cities=CORE.playerCities().length;
  $('#campDate').textContent=`${CORE.dateLabel()} · 第 ${GS.turn} 回合`;
  $('#campRes').innerHTML=[
    ['gold','金',CORE.fmt(GS.gold),`+${inc.gold}/回合`],['food','粮',CORE.fmt(GS.food),`${inc.netFood>=0?'+':''}${inc.netFood}/回合`],
    ['troop','兵',CORE.fmt(troops),`${cities} 城`],['tech','策',Math.floor(GS.techPoints),`+${inc.tech}/回合`],['fame','望',CORE.fmt(GS.fame),'声望']
  ].map(([k,c,v,s])=>`<div class="res-item ${k}"><span class="res-icon">${c}</span><div><div class="res-val">${v}</div><div class="res-cap">${s}</div></div></div>`).join('');
  $('#orderPips').innerHTML=Array.from({length:GS.maxOrders},(_,i)=>`<span class="order-pip ${i<GS.orders?'on':''}"></span>`).join('');
  $('#ordersHint').textContent=`本回合剩余 ${GS.orders} 次出征`;
  renderChapterCard(); renderObjective(); renderLog();
  UI.updateMenu();
}
function chapterTarget(){
  if(!GS) return null;
  if(!GS.chapterDone.includes('ch0')) return 'zhuojun';
  const ch=DATA.CHAPTERS[GS.chapter];
  if(!ch) return null;
  return { ch1:'luoyang', ch2:'xinye', ch4:'chibi', ch5:'hanzhong' }[ch.id]||null;
}
function renderChapterCard(){
  const ch=DATA.CHAPTERS[GS.chapter];
  const done=GS.chapterDone.length, total=DATA.CHAPTERS.length;
  let html;
  if(GS.flags.victory){
    html=`<div class="chapter-kicker">汉室复兴</div><div class="chapter-title">天下归心</div><div class="chapter-sub">最终回 · 已达成</div><div class="chapter-bar"><i style="width:100%"></i></div><div class="chapter-desc">汉中之战已定，蜀汉基业鼎成。桃园一诺，终成千古佳话。</div>`;
  } else if(ch){
    html=`<div class="chapter-kicker">${ch.no} · 章回</div><div class="chapter-title">${ch.title}</div><div class="chapter-sub">${ch.subtitle}</div><div class="chapter-bar"><i style="width:${done/total*100}%"></i></div><div class="chapter-desc">${chapterDesc(ch)}</div>`;
  } else {
    html=`<div class="chapter-kicker">群雄逐鹿</div><div class="chapter-title">天下未定</div><div class="chapter-bar"><i style="width:${done/total*100}%"></i></div><div class="chapter-desc">章回已尽，山河仍待英雄。</div>`;
  }
  $('#chapterCard').innerHTML=html;
}
function chapterDesc(ch){
  return {ch0:'桃园结义，涿郡起兵。首战黄巾，以立军威。',ch1:'董卓乱政，虎牢关前。三英战吕布，收复旧都。',ch2:'三顾茅庐，卧龙出山。博望坡一把火，烧退曹仁。',ch3:'曹操南征，百姓相随。长坂坡上，单骑救主。',ch4:'孙刘联盟，东风乍起。赤壁江面，火烧连营。',ch5:'定军山下，老将扬威。汉中之争，毕其功于一役。'}[ch.id]||'';
}
function renderObjective(){
  const ch=DATA.CHAPTERS[GS.chapter];
  let title='',sub='',btn='';
  if(GS.flags.victory){ title='兴复汉室'; sub='天下已定。你可继续经营城池，或再启新的征程。'; }
  else if(!GS.chapterDone.includes('ch0')){ title='出阵涿郡城外'; sub='黄巾军来犯，刘备率关羽、张飞迎战。'; btn=`<button class="oc-btn" data-launch-chapter="ch0">出 阵</button>`; }
  else if(ch){
    title=ch.objective; sub=ch.hint;
    if(ch.id==='ch2' && GS.cities.xinye.owner==='shu') btn=`<button class="oc-btn" data-launch-chapter="ch2">迎战曹仁</button>`;
    if(ch.id==='ch3') btn=`<button class="oc-btn" data-launch-chapter="ch3">迎战曹操</button>`;
    if(ch.id==='ch1' && adjacentOwned('luoyang')) btn=`<button class="oc-btn" data-launch-chapter="ch1">兵发虎牢关</button>`;
    if(ch.id==='ch4' && adjacentOwned('chibi')) btn=`<button class="oc-btn" data-launch-chapter="ch4">决战赤壁</button>`;
    if(ch.id==='ch5' && adjacentOwned('hanzhong')) btn=`<button class="oc-btn" data-launch-chapter="ch5">兵发定军山</button>`;
  } else {
    title='天下未定'; sub='继续攻取城池，扩张势力。';
  }
  $('#objectiveCard').innerHTML=`<div class="oc-label">当前目标</div><div class="oc-main">${title}</div><div class="oc-sub">${sub}</div>${btn}`;
  $$('[data-launch-chapter]').forEach(b=>b.onclick=()=>{ const id=b.dataset.launchChapter; runChapter(id,{pre:true}); });
}
function renderLog(){
  const lines=GS.log.slice(0,7).map(l=>`<div class="log-line ${l.t==='red'?'red':(l.t==='green'||l.t==='chapter'?'green':'')}"><b>${l.turn?'·':'◆'}</b><span>${UI.esc(l.text)}</span></div>`).join('');
  $('#campLog').innerHTML=`<div class="camp-log-title"><span>军 情 纪 要</span><span>第 ${GS.turn} 回合</span></div><div class="log-lines">${lines}</div>`;
}
function adjacentOwned(id){ return (DATA.CITIES[id]?.adjacent||[]).some(x=>GS.cities[x]?.owner==='shu'); }

/* ---------------- 城池面板 ---------------- */
function onCityClick(id){
  const c=GS.cities[id]; if(!c) return;
  if(attackMode){
    if(c.owner!=='shu' && selectedCity && (DATA.CITIES[selectedCity]?.adjacent||[]).includes(id)){
      openAttackConfirm(selectedCity,id); return;
    }
    if(c.owner==='shu'){ attackMode=false; selectedCity=id; updateHint(); renderCityPanel(id); return; }
  }
  selectedCity=id;
  if(c.owner!=='shu') attackMode=false;
  updateHint(); renderCityPanel(id); drawMap();
  if(isNarrow()) setCitySheet(true);
}
function updateHint(){
  const el=$('#mapHint');
  if(attackMode) el.textContent='出阵：点击相邻的敌方城池';
  else if(selectedCity) el.textContent=`已选 ${DATA.CITIES[selectedCity].name} · 可查看内政或出征`;
  else el.textContent='选择城池，运筹天下';
}
function renderCityPanel(id){
  const st=DATA.CITIES[id], c=GS.cities[id]; if(!st||!c) return;
  const fac=DATA.FACTIONS[c.owner]||{name:'无主',short:'—',color:'#999'};
  const player=c.owner==='shu';
  const inc=CORE.cityIncome(c);
  const cap=CORE.cityTroopCap(c);
  const gov=c.governor?CORE.getGen(c.governor):null;
  const govS=gov?CORE.genStats(gov):null;
  const generals=(st.generals||[]).filter(g=>DATA.GENERALS[g]&&CORE.genDef(g));
  let body='';
  if(player){
    const buildRows=Object.values(DATA.BUILDINGS).map(b=>{
      const lv=c.buildings[b.id]||0, max=lv>=b.max, cost=CORE.buildCost(b.id,lv+1), can=GS.gold>=cost&&!max;
      return `<button class="building" data-build="${b.id}" ${max?'disabled':''} title="${b.desc} · 升级耗金 ${cost}">
        <span class="b-icon">${ART.buildingIcon(b.id)?`<img src="${ART.buildingIcon(b.id)}">`:b.icon}</span><span class="b-info"><span class="b-name">${b.name}</span><span class="b-lv">${Array.from({length:b.max},(_,i)=>`<i class="${i<lv?'on':''}"></i>`).join('')}</span></span>
        <span style="font-size:8px;color:${max?'var(--muted)':'var(--gold)'}">${max?'满':'↑'+cost}</span></button>`;
    }).join('');
    body=`<div class="city-scroll">
      <div class="city-section">
        <div class="section-head"><span>城 池 概 况</span><span>${st.region} · ${st.terrain==='plain'?'平原':st.terrain==='forest'?'林地':st.terrain==='river'?'水乡':st.terrain==='hill'?'山地':'城池'}</span></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${cityBar('兵力',c.troops,cap,`${CORE.fmt(c.troops)} / ${CORE.fmt(cap)}`,'#8cc69b')}
          ${cityBar('城防',c.defenses,20+(c.buildings.wall||0)*4,`${c.defenses} / ${20+(c.buildings.wall||0)*4}`,'#9ab6c7')}
          ${cityBar('治安',c.order,100,`${Math.round(c.order)} / 100`,'#d0b169')}
          ${cityBar('民心',c.morale,100,`${Math.round(c.morale)} / 100`,'#c98d78')}
        </div>
        <div style="display:flex;gap:14px;margin-top:10px;font-size:9px;color:var(--muted)"><span>金 +${inc.gold}</span><span>粮 +${inc.food}</span><span>科技 +${inc.tech}</span></div>
      </div>
      <div class="city-section"><div class="section-head"><span>军 政</span><span>兵营上限 ${CORE.fmt(cap)}</span></div>
        <div class="city-actions">
          <button class="city-btn" data-recruit>征兵 +500</button>
          <button class="city-btn" data-relieve>开仓赈济</button>
          <button class="city-btn" data-patrol>巡查治安</button>
          <button class="city-btn" data-repair>修缮城防</button>
          <button class="city-btn wide" data-tavern>招 贤 馆</button>
          <button class="city-btn wide danger" data-sortie>出 征</button>
        </div></div>
      <div class="city-section"><div class="section-head"><span>营 造</span><span>点击升级</span></div><div class="building-grid">${buildRows}</div></div>
      <div class="city-section"><div class="section-head"><span>太 守</span><span>${govS?`政治 ${govS.pol} · 魅力 ${govS.charm}`:'未委任'}</span></div>
        <div class="governor-row">${gov?`<img class="gov-portrait" src="${ART.portrait(gov.id)}">`:`<div class="gov-portrait" style="display:grid;place-items:center;color:var(--muted);font-family:var(--font-kai)">空</div>`}
          <div class="gov-info"><div class="gov-name">${gov?DATA.GENERALS[gov.id].name:'虚位以待'}</div><div class="gov-bonus">${gov?'太守加成：金 +'+Math.round(govS.pol/4.2)+'% · 粮 +'+Math.round(govS.pol/5)+'% · 治安 +'+Math.round(govS.charm/20):'委任文官可提升城池产出'}</div></div>
          <button class="gov-btn" data-gov>委任</button></div>
      </div>
    </div>`;
  } else {
    const gens=generals.length?generals.map(g=>{ const d=DATA.GENERALS[g]; return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px dashed rgba(201,164,95,.1)"><img src="${ART.portrait(g)}" style="width:30px;height:36px;object-fit:cover;object-position:top;border:1px solid rgba(201,164,95,.2)"><div><div style="font-family:var(--font-kai);font-size:13px;color:var(--paper)">${d.name}</div><div style="font-size:8px;color:var(--muted)">${DATA.CLASSES[d.class].name} · ${d.title||''}</div></div></div>`; }).join(''):'<div style="font-size:9px;color:var(--muted)">守将不详</div>';
    const froms=(st.adjacent||[]).filter(x=>GS.cities[x]?.owner==='shu');
    body=`<div class="city-scroll">
      <div class="city-section"><div class="section-head"><span>敌 情</span><span>${fac.name}</span></div>
        <div style="display:flex;flex-direction:column;gap:7px">
          ${cityBar('守军',c.troops,CORE.cityTroopCap(c),CORE.fmt(c.troops),'#cf7866')}
          ${cityBar('城防',c.defenses,40,`${c.defenses} / 40`,'#9ab6c7')}
          ${cityBar('治安',c.order,100,`${Math.round(c.order)} / 100`,'#d0b169')}
        </div>
        <div style="font-size:9px;color:var(--muted);margin-top:8px;line-height:1.7">${st.desc}</div>
      </div>
      <div class="city-section"><div class="section-head"><span>守 将</span><span>${gens.length} 人</span></div>${gens}</div>
      <div class="city-section"><div class="section-head"><span>攻 城</span><span>需相邻我军城池</span></div>
        ${froms.length?`<div style="display:flex;flex-direction:column;gap:5px">${froms.map(f=>`<button class="city-btn" data-attack-from="${f}" style="display:flex;justify-content:space-between"><span>${DATA.CITIES[f].name}出发</span><span>${CORE.fmt(GS.cities[f].troops)}兵</span></button>`).join('')}</div>`:`<div style="font-size:9px;color:var(--muted)">尚无接壤的我军城池。</div>`}
      </div>
    </div>`;
  }
  $('#cityPanel').innerHTML=`<div class="city-head"><div class="ch-kicker">${st.region} · ${player?'我方城池':'敌方城池'}</div><h2>${st.name}</h2><div class="city-owner ${c.owner}">${player?'刘备军':fac.name}</div><button class="city-close" data-close-city>✕</button></div>
    <div class="city-stats">
      <div class="city-stat"><span>驻军</span><b>${CORE.fmt(c.troops)}</b></div>
      <div class="city-stat"><span>城防</span><b>${c.defenses}</b></div>
      <div class="city-stat"><span>治安</span><b>${Math.round(c.order)}<small> /100</small></b></div>
      <div class="city-stat"><span>产出</span><b>${inc.gold}<small> 金</small></b></div>
    </div>${body}`;
  bindCityPanel();
}
function cityBar(label,val,max,text,color){
  return `<div><div style="display:flex;justify-content:space-between;font-size:9px;color:var(--muted);margin-bottom:3px"><span>${label}</span><span>${text}</span></div><div class="city-bar"><i style="width:${Math.max(2,Math.min(100,val/max*100))}%;background:${color}"></i></div></div>`;
}
function bindCityPanel(){
  const p=$('#cityPanel');
  $('[data-close-city]',p)?.addEventListener('click',()=>{ if(isNarrow()){ setCitySheet(false); return; } selectedCity=null; attackMode=false; renderEmptyPanel(); updateHint(); drawMap(); });
  const head=$('.city-head',p); if(head) head.addEventListener('click',e=>{ if(isNarrow()&&!e.target.closest('.city-close')) setCitySheet(true); });
  $$('[data-build]',p).forEach(b=>b.addEventListener('click',()=>{
    const r=CORE.upgradeBuilding(selectedCity,b.dataset.build);
    UI.toast(r.ok?'营造完成':'无法营造',r.msg,r.ok?'good':'bad');
    if(r.ok){ AUDIO.sfx('coin'); updateHUD(); renderCityPanel(selectedCity); drawMap(); }
  }));
  $('[data-recruit]',p)?.addEventListener('click',()=>{
    const r=CORE.recruitTroops(selectedCity,500); UI.toast(r.ok?'征兵':'无法征兵',r.msg,r.ok?'good':'bad');
    if(r.ok){ AUDIO.sfx('march'); updateHUD(); renderCityPanel(selectedCity); }
  });
  $('[data-relieve]',p)?.addEventListener('click',()=>{ const r=CORE.relieve(selectedCity); UI.toast(r.ok?'赈济':'无法赈济',r.msg,r.ok?'good':'bad'); updateHUD(); renderCityPanel(selectedCity); });
  $('[data-patrol]',p)?.addEventListener('click',()=>{ const r=CORE.patrol(selectedCity); UI.toast(r.ok?'巡查':'无法巡查',r.msg,r.ok?'good':'bad'); updateHUD(); renderCityPanel(selectedCity); });
  $('[data-repair]',p)?.addEventListener('click',()=>{ const r=CORE.repairCity(selectedCity); UI.toast(r.ok?'修城':'无法修城',r.msg,r.ok?'good':'bad'); updateHUD(); renderCityPanel(selectedCity); });
  $('[data-sortie]',p)?.addEventListener('click',()=>{
    const enemies=(DATA.CITIES[selectedCity].adjacent||[]).filter(x=>GS.cities[x]?.owner!=='shu');
    if(!enemies.length){ UI.toast('无仗可打','此城没有相邻的敌方城池。','bad'); return; }
    attackMode=true; updateHint(); if(isNarrow()) setCitySheet(false); UI.toast('择敌而击','点击相邻的敌方城池，或再次点击出征取消。'); drawMap();
  });
  $('[data-gov]',p)?.addEventListener('click',openGovernorPicker);
  $('[data-tavern]',p)?.addEventListener('click',openTavern);
  $$('[data-attack-from]',p).forEach(b=>b.addEventListener('click',()=>openAttackConfirm(b.dataset.attackFrom,selectedCity)));
}
function renderEmptyPanel(){
  $('#cityPanel').innerHTML=`<div class="panel-empty"><div class="empty-seal">城</div><p>点选城池<br>查看军情与内政</p></div>`;
}
function openTavern(){ UI.openTavern(); }
function openGovernorPicker(){
  const list=CORE.playerGenerals();
  UI.openModal({ narrow:true, title:'委任太守', kicker:DATA.CITIES[selectedCity].name, sub:'文治之才可提升钱粮与治安',
    render:()=>({ body:`<div style="display:flex;flex-direction:column;gap:5px;max-height:50vh;overflow-y:auto">
      <button class="deploy-card" data-gov-id="" style="padding:10px"><div class="dc-info"><div class="dc-name">不设太守</div><div class="dc-meta"><span>取消当前委任</span></div></div></button>
      ${list.map(g=>{ const s=CORE.genStats(g), d=DATA.GENERALS[g.id]; return `<button class="deploy-card" data-gov-id="${g.id}" style="display:flex;align-items:center;padding:6px"><img src="${ART.portrait(g.id)}" style="width:44px;height:54px;object-fit:cover;object-position:top"><div class="dc-info"><div class="dc-name">${d.name}</div><div class="dc-meta"><span>政治 ${s.pol}</span><span>魅力 ${s.charm}</span></div><div style="font-size:8px;color:var(--jade-2);margin-top:2px">金+${Math.round(s.pol/4.2)}% 粮+${Math.round(s.pol/5)}%</div></div></button>`; }).join('')}
      </div>`, footer:`<button class="mbtn" data-close>取消</button>` }),
    onMount:root=>{ $$('[data-gov-id]',root).forEach(b=>b.addEventListener('click',()=>{ CORE.setGovernor(selectedCity,b.dataset.govId||null); UI.closeModal(); renderCityPanel(selectedCity); updateHUD(); })); }});
}

/* ---------------- 出征 ---------------- */
function openAttackConfirm(from,target){
  const fromC=GS.cities[from], t=GS.cities[target]; if(!fromC||!t) return;
  const story=storyAttackFor(target);
  if(story==='blocked'){ attackMode=false; updateHint(); return; }
  if(story){ attackMode=false; updateHint(); runChapter(story,{pre:true}); return; }
  const enemyUnits=CORE.cityDefenders(target,{count:5});
  const st=DATA.CITIES[target], map=DATA.MAPS[st.chart];
  const weather=chooseWeather(target);
  const committed=Math.round(fromC.troops*.7);
  UI.openDeployment({
    kicker:'临阵点兵', title:`出征 · ${st.name}`, sub:`${DATA.CITIES[from].name} → ${st.name}　·　敌军 ${DATA.FACTIONS[t.owner]?.name||''}`,
    enemyFaction:t.owner, enemies:enemyUnits, troops:committed, allowTroops:false,
    objectiveText:'击溃守军，攻占城池', mapName:map?.name||'', weatherName:DATA.WEATHERS[weather].name,
    onCancel:()=>{ attackMode=false; updateHint(); },
    onLaunch:({ids,formation})=>{
      attackMode=false;
      startCityBattle(from,target,ids,formation,weather,enemyUnits,committed);
    }
  });
}
function storyAttackFor(target){
  const ch=DATA.CHAPTERS[GS.chapter]; if(!ch) return null;
  if(target==='luoyang'&&ch.id==='ch1') return 'ch1';
  if(target==='chibi'){ if(!GS.chapterDone.includes('ch3')){ UI.toast('时机未到','先完成长坂坡之战。','bad'); return 'blocked'; } if(ch.id==='ch4') return 'ch4'; }
  if(target==='hanzhong'){ if(!GS.chapterDone.includes('ch4')){ UI.toast('时机未到','先取得赤壁大捷。','bad'); return 'blocked'; } if(ch.id==='ch5') return 'ch5'; }
  return null;
}
function chooseWeather(cityId){
  const st=DATA.CITIES[cityId];
  const pool=st.terrain==='river'?['rain','fog','wind','clear','clear']:st.terrain==='forest'?['wind','clear','fog','clear']:st.terrain==='hill'?['clear','wind','fog','rain']:['clear','clear','wind','rain'];
  return UI.pick?UI.pick(pool):pool[Math.floor(Math.random()*pool.length)];
}
function startCityBattle(from,target,ids,formation,weather,enemies,committed){
  const st=DATA.CITIES[target], fromSt=DATA.CITIES[from];
  GS.stats.battles++;
  GS.orders=Math.max(0,GS.orders-1);
  const cfg={
    kind:'attack', cityId:target, fromCity:from, title:`${st.name}攻城战`, subtitle:`${DATA.FACTIONS[GS.cities[target].owner]?.name||'敌军'}守军`,
    map:st.chart, time:'day', weather, enemyFaction:GS.cities[target].owner,
    enemies:enemies.map((e,i)=>({...e,pos:null})), playerIds:ids, formation,
    objective:{type:'eliminate',text:'击溃守军，攻占城池'}, allowRetry:false,
    onEnd:result=>{
      inBattle=false;
      if(result.victory){
        const src=GS.cities[from];
        src.troops=Math.max(0,src.troops-Math.round(committed*.52));
        const cap=Math.round(committed*.36);
        CORE.captureCity(target,'shu',{troops:cap});
        CORE.applyRewards({exp:100+st.level*28,gold:120,food:160},'攻城战利');
        playerIdsGain(ids, 100+st.level*28);
        GS.stats.wins++;
        CORE.saveGame('auto');
        UI.showScreen('campaign'); enter();
        UI.toast('攻城大捷',`已夺取${st.name}。`, 'good');
        checkAfterCapture(target);
      } else {
        const src=GS.cities[from];
        src.troops=Math.max(0,src.troops-Math.round(committed*.62));
        CORE.addLog('red',`${fromSt.name}出征${st.name}失利，损兵折将。`);
        CORE.saveGame('auto'); UI.showScreen('campaign'); enter();
        UI.toast('攻城失利',`${st.name}守军击退了我军。`,'bad');
      }
    }
  };
  UI.showScreen('battle');
  if(AUDIO.ready) AUDIO.startMusic('battle');
  BATTLE.start(cfg, result=>{ inBattle=false; cfg.onEnd(result); });
  inBattle=true;
}
function playerIdsGain(ids,amount){ ids.forEach(id=>{ const g=CORE.getGen(id); if(g) CORE.gainExp(g,amount); }); }
function checkAfterCapture(id){
  if(id==='xinye' && GS.chapterDone.includes('ch1') && !GS.chapterDone.includes('ch2')){
    setTimeout(()=>runChapter('ch2',{pre:true}),900);
  }
}

/* ---------------- 章回 ---------------- */
function storyBattleConfig(ch){
  const key=ch.battleKey, sb=DATA.STORY_BATTLES[key]; if(!sb) return null;
  const map=DATA.MAPS[sb.map];
  return { sb, map };
}
function preRecruitFor(ch){
  const map={ch2:['zhugeliang',5],ch3:['zhaoyun',6],ch4:['huangzhong',7],ch5:['machao',8]};
  const rec=map[ch.id];
  if(rec && !GS.roster.includes(rec[0])) CORE.addGeneral(rec[0],rec[1]);
  if(ch.id==='ch3') GS.flags.ch3Offered=true;
}
function runChapter(chId,opts={}){
  if(!GS || inBattle) return;
  if($('#storyRoot').classList.contains('open')||$('#modalRoot').classList.contains('open')) return;
  const ch=DATA.CHAPTERS.find(c=>c.id===chId); if(!ch) return;
  if(GS.chapterDone.includes(chId)) return;
  if(!GS.chapterDone.includes('ch0') && chId!=='ch0') return;
  preRecruitFor(ch);
  const proceed=()=>{
    if(!document.getElementById('screen-campaign').classList.contains('active')) UI.showScreen('campaign');
    enter();
    openStoryDeployment(ch);
  };
  if(opts.pre===false){ proceed(); }
  else UI.playStory(ch,'pre',proceed);
}
function openStoryDeployment(ch){
  const conf=storyBattleConfig(ch); if(!conf) return;
  const sb=conf.sb;
  const enemies=sb.enemies.map(e=>({...e}));
  UI.openDeployment({
    kicker:'章回战', title:`${ch.no} · ${ch.title}`, sub:sb.intro||ch.subtitle,
    enemyFaction:sb.enemyFaction, enemies, allowTroops:false,
    objectiveText:sb.objective.text, mapName:conf.map?.name||'', weatherName:DATA.WEATHERS[sb.weather]?.name||'晴',
    onLaunch:({ids,formation})=>startStoryBattle(ch,ids,formation)
  });
}
function startStoryBattle(ch,ids,formation){
  const conf=storyBattleConfig(ch); if(!conf) return;
  const sb=conf.sb;
  const cfg={
    kind:'story', chapterId:ch.id, cityId:CHAPTER_CAPTURE[ch.id]||null, title:`${ch.no} · ${ch.title}`,
    map:sb.map, time:sb.time, weather:sb.weather, enemyFaction:sb.enemyFaction,
    enemies:sb.enemies.map(e=>({...e})), allies:sb.allies?sb.allies.map(a=>({...a})):[],
    waves:sb.waves?UI.clone?UI.clone(sb.waves):JSON.parse(JSON.stringify(sb.waves)):[],
    playerIds:ids, formation, objective:sb.objective, special:sb.special, allowRetry:true,
    onEnd:result=>handleStoryEnd(ch,result)
  };
  GS.stats.battles++;
  UI.showScreen('battle');
  if(AUDIO.ready) AUDIO.startMusic('battle');
  BATTLE.start(cfg, result=>handleStoryEnd(ch,result));
  inBattle=true;
}
const CHAPTER_CAPTURE={ch1:'luoyang',ch4:'chibi',ch5:'hanzhong'};
function handleStoryEnd(ch,result){
  inBattle=false;
  if(result.retry){
    UI.showScreen('campaign'); enter();
    setTimeout(()=>openStoryDeployment(ch),200);
    return;
  }
  if(!result.victory){
    CORE.addLog('red',`${ch.no}「${ch.title}」失利，整军再战。`);
    GS.flags['retry_'+ch.id]=true;
    CORE.saveGame('auto'); UI.showScreen('campaign'); enter();
    UI.toast('战败','可在大地图章回目标处重新挑战。','bad');
    return;
  }
  // capture story target
  const cap=CHAPTER_CAPTURE[ch.id];
  if(cap && GS.cities[cap].owner!=='shu'){
    const troops = 3200 + ch.id.charCodeAt(2)*100;
    CORE.captureCity(cap,'shu',{troops});
  }
  GS.stats.wins++;
  UI.showScreen('campaign'); enter();
  UI.playStory(ch,'post',()=>{
    const before={gold:GS.gold,food:GS.food,fame:GS.fame,tech:GS.techPoints};
    CORE.completeChapter(ch.id);
    if(ch.id==='ch2'){ GS.flags.needCh3=true; GS.flags.ch3Offered=false; }
    if(ch.id==='ch3'){ GS.flags.needCh3=false; GS.flags.ch3Offered=true; }
    CORE.saveGame('auto');
    UI.updateMenu(); updateHUD();
    const r=ch.rewards||{};
    UI.toast('章回完成',`${ch.no}「${ch.title}」 · 获得 ${r.gold||0} 金、${r.food||0} 粮、${r.tech||0} 科技点。`,'good',4500);
    if(ch.id==='ch5'){
      GS.flags.victory=true; CORE.victoryEnding(); CORE.checkAchievements(); CORE.saveGame('auto');
      updateHUD(); drawMap();
      setTimeout(showEnding,800);
    } else {
      setTimeout(()=>{ updateHUD(); if(ch.id==='ch1' && GS.cities.xinye.owner==='shu') checkAfterCapture('xinye'); },500);
    }
  });
}

/* ---------------- 回合 ---------------- */
function endTurn(){
  if(!GS || busy || inBattle) return;
  if($('#modalRoot').classList.contains('open')) return;
  busy=true; attackMode=false; selectedCity=null; renderEmptyPanel();
  const btn=$('#btnEndTurn'); btn.disabled=true; btn.querySelector('span').textContent='推演中';
  AUDIO.sfx('march');
  const res=CORE.turnIncome();
  UI.toast('回合结算',`收入 ${res.inc.gold} 金 · ${res.inc.food} 粮${res.shortage?' · 粮草告急！':''}`,res.shortage?'bad':'good');
  updateHUD(); drawMap();
  setTimeout(()=>{
    try{
      const ev=CORE.rollEvent();
      if(ev) showEvent(ev,()=>{ aiQueue=CORE.aiPlanAttacks(); nextAI(); });
      else { aiQueue=CORE.aiPlanAttacks(); nextAI(); }
    }catch(err){ console.error('turn error',err); busy=false; const b=$('#btnEndTurn'); if(b){b.disabled=false;b.querySelector('span').textContent='结束回合';} updateHUD(); }
  },650);
}
function showEvent(ev,done){
  const apply=idx=>{
    const choice=ev.choices[idx];
    const changes=CORE.applyEventEffect(choice.effect||{});
    UI.closeModal();
    UI.toast(ev.title,choice.result+(changes.length?'　'+changes.join('　'):''),'good',4500);
    updateHUD(); drawMap(); setTimeout(done,350);
  };
  UI.openModal({ narrow:true, persistent:true, kicker:'天下事', title:ev.title, sub:ev.icon+' · 随机事件',
    render:()=>({ body:`<div style="font-size:12px;line-height:1.9;color:#c8bda5;margin-bottom:14px">${ev.text}</div>
      <div style="display:flex;flex-direction:column;gap:6px">${ev.choices.map((c,i)=>`<button class="city-btn" data-choice="${i}" style="text-align:left;padding:10px 12px"><div style="font-family:var(--font-kai);font-size:15px;color:var(--paper)">${c.label}</div><div style="font-size:8px;color:var(--muted);margin-top:2px">${c.hint}</div></button>`).join('')}</div>`,footer:'' }),
    onMount:root=>{ $$('[data-choice]',root).forEach(b=>b.addEventListener('click',()=>apply(Number(b.dataset.choice)))); }});
}
function nextAI(){
  if(!aiQueue.length){ finishTurn(); return; }
  const atk=aiQueue.shift();
  // skip if target already lost
  if(GS.cities[atk.to]?.owner!=='shu'){ nextAI(); return; }
  const from=DATA.CITIES[atk.from], to=DATA.CITIES[atk.to];
  const chance=CORE.resolveAutoBattle(atk).chance;
  UI.openModal({ narrow:true, persistent:true, kicker:'军情急报', title:'敌军来犯', sub:`${DATA.FACTIONS[atk.faction]?.name||'敌军'}自${from.name}出兵`,
    render:()=>({ body:`<div style="text-align:center;padding:8px 0 16px"><div style="font-family:var(--font-kai);font-size:22px;color:#e3b3a7">${from.name} → ${to.name}</div><div style="font-size:10px;color:var(--muted);margin-top:8px;line-height:1.8">敌军约 ${CORE.fmt(GS.cities[atk.from].troops)} 兵，守军 ${CORE.fmt(GS.cities[atk.to].troops)} 兵。<br>据城而守，胜算约 <b style="color:var(--gold-2)">${Math.round(chance*100)}%</b>。</div></div>
      <div style="display:flex;flex-direction:column;gap:6px"><button class="city-btn" data-defend style="padding:12px">亲自迎战 · 进入战场</button><button class="city-btn" data-auto style="padding:12px">委任守将 · 自动结算</button></div>
      <div style="font-size:9px;color:var(--muted);margin-top:10px;line-height:1.7">亲自迎战可最大化胜算，但若战败，城池将失守。</div>`, footer:'' }),
    onMount:root=>{
      $('[data-defend]',root).addEventListener('click',()=>{ UI.closeModal(); startDefenseBattle(atk); });
      $('[data-auto]',root).addEventListener('click',()=>{ UI.closeModal(); autoDefend(atk); });
    }});
}
function autoDefend(atk){
  const out=CORE.resolveAutoBattle(atk);
  if(out.win){
    const c=GS.cities[atk.to]; c.troops=Math.round(c.troops*.78); c.morale=Math.min(100,c.morale+4);
    GS.cities[atk.from].troops=Math.round(GS.cities[atk.from].troops*.7);
    GS.stats.wins++; GS.fame+=2; CORE.addLog('green',`${DATA.CITIES[atk.to].name}守军击退${DATA.FACTIONS[atk.faction]?.name}。`);
    UI.toast('守城成功',`${DATA.CITIES[atk.to].name}安然无恙。`,'good');
  } else {
    CORE.captureCity(atk.to,atk.faction,{troops:Math.round(GS.cities[atk.from].troops*.4)});
    UI.toast('城池失守',`${DATA.CITIES[atk.to].name}被${DATA.FACTIONS[atk.faction]?.name}攻陷。`,'bad',4500);
  }
  CORE.saveGame('auto'); updateHUD(); drawMap();
  setTimeout(nextAI,500);
}
function startDefenseBattle(atk){
  const st=DATA.CITIES[atk.to], fromSt=DATA.CITIES[atk.from];
  const enemyUnits=CORE.cityDefenders(atk.from,{count:5});
  const weather=chooseWeather(atk.to);
  UI.openDeployment({
    kicker:'守城战', title:`守卫 · ${st.name}`, sub:`${DATA.FACTIONS[atk.faction]?.name||'敌军'}自${fromSt.name}来犯`,
    enemyFaction:atk.faction, enemies:enemyUnits, troops:GS.cities[atk.to].troops, allowTroops:false,
    objectiveText:'击退全部敌军', mapName:DATA.MAPS[st.chart]?.name||'', weatherName:DATA.WEATHERS[weather].name,
    onCancel:()=>{ autoDefend(atk); },
    onLaunch:({ids,formation})=>{
      const cfg={kind:'defense',cityId:atk.to,fromCity:atk.from,title:`${st.name}守城战`,map:st.chart,time:'dusk',weather,
        enemyFaction:atk.faction,enemies:enemyUnits,playerIds:ids,formation,
        objective:{type:'eliminate',text:'击退全部敌军'},allowRetry:false,
        onEnd:result=>{
          inBattle=false;
          const c=GS.cities[atk.to];
          if(result.victory){
            c.troops=Math.round(c.troops*.82); c.morale=Math.min(100,c.morale+5); GS.stats.wins++; GS.fame+=3;
            GS.cities[atk.from].troops=Math.round(GS.cities[atk.from].troops*.65);
            CORE.applyRewards({gold:120,food:140,exp:90},'守城战利'); playerIdsGain(ids,90);
            UI.toast('守城成功',`${st.name}守住了。`,'good');
          } else {
            CORE.captureCity(atk.to,atk.faction,{troops:Math.round(GS.cities[atk.from].troops*.4)});
            UI.toast('城池失守',`${st.name}落入敌手。`,'bad',4500);
          }
          GS.stats.battles++; CORE.saveGame('auto'); UI.showScreen('campaign'); enter(); updateHUD();
          setTimeout(nextAI,600);
        }};
      UI.showScreen('battle'); if(AUDIO.ready) AUDIO.startMusic('battle');
      BATTLE.start(cfg,cfg.onEnd); inBattle=true;
    }
  });
}
function finishTurn(){
  busy=false; inBattle=false;
  const btn=$('#btnEndTurn'); btn.disabled=false; btn.querySelector('span').textContent='结束回合';
  CORE.saveGame('auto'); updateHUD(); drawMap(); UI.updateMenu();
  if(!CORE.playerCities().length){ showGameOver(); return; }
  if(GS.flags.needCh3 && !GS.flags.ch3Offered && !GS.flags.victory){
    GS.flags.ch3Offered=true; GS.flags.needCh3=true;
    CORE.saveGame('auto');
    setTimeout(()=>runChapter('ch3',{pre:true}),900);
  }
}

/* ---------------- 工具 / 菜单 ---------------- */
function onTool(tool){
  if(tool==='roster') UI.openRoster();
  else if(tool==='tech') UI.openTech();
  else if(tool==='diplomacy') UI.openDiplomacy();
  else if(tool==='shop') UI.openShop();
  else if(tool==='codex') UI.openCodex();
  else if(tool==='save') UI.openSaves();
  else if(tool==='menu') openCampaignMenu();
}
function openCampaignMenu(){
  UI.openModal({ narrow:true, kicker:'中军帐', title:'菜单',
    render:()=>({ body:`<div style="display:flex;flex-direction:column;gap:6px">
      <button class="city-btn" data-m="resume" style="padding:11px">继续征程</button>
      <button class="city-btn" data-m="save" style="padding:11px">存档 / 读档</button>
      <button class="city-btn" data-m="help" style="padding:11px">军略说明</button>
      <button class="city-btn" data-m="settings" style="padding:11px">设置</button>
      <button class="city-btn danger" data-m="menu" style="padding:11px">回到主菜单</button>
      </div>`, footer:'' }),
    onMount:root=>{
      $('[data-m="resume"]',root).onclick=()=>UI.closeModal();
      $('[data-m="save"]',root).onclick=()=>UI.openSaves();
      $('[data-m="help"]',root).onclick=()=>UI.openHelp();
      $('[data-m="settings"]',root).onclick=()=>UI.openSettings();
      $('[data-m="menu"]',root).onclick=()=>UI.confirm('回到主菜单','当前进度已自动存档，确定返回主菜单吗？',()=>{ CORE.saveGame('auto'); UI.closeModal(); GAME.toMenu(); },'返回');
    }});
}
function openChapterLog(){
  UI.openModal({ wide:true, kicker:'章回演义', title:'章回纪要', sub:'已完成的章回可在此回顾',
    render:()=>({ body:`<div style="display:flex;flex-direction:column;gap:6px">${DATA.CHAPTERS.map((ch,i)=>{
      const done=GS.chapterDone.includes(ch.id), cur=GS.chapter===i;
      return `<div class="lore-card" style="cursor:${done?'pointer':'default'};opacity:${done||cur?1:.45}" data-ch="${ch.id}"><div class="lc-no">${ch.no} · ${ch.date}${done?' · 已完成':cur?' · 进行中':''}</div><h3>${ch.title}</h3><p>${ch.subtitle} · ${ch.objective}</p></div>`;
    }).join('')}</div>`, footer:`<button class="mbtn" data-close>关闭</button>` }),
    onMount:root=>{ $$('[data-ch]',root).forEach(b=>b.addEventListener('click',()=>{ const ch=DATA.CHAPTERS.find(c=>c.id===b.dataset.ch); if(!GS.chapterDone.includes(ch.id)) return; UI.closeModal(); UI.playStory(ch,'pre',()=>{ UI.playStory(ch,'post'); }); })); }});
}

/* ---------------- 结局 ---------------- */
function showEnding(){
  const cities=CORE.playerCities().length, troops=CORE.totalTroops();
  UI.openModal({ wide:true, kicker:'大结局', title:'汉室复兴',
    render:()=>({ body:`<div class="ending-wrap"><div class="ending-seal">漢</div><div class="ending-title">天下归心</div><div class="ending-sub">建安二十四年 · 汉中</div>
      <div class="ending-text">定军山一役，夏侯渊授首，曹军退守长安。刘备进位汉中王，蜀汉基业至此鼎成。桃园花开又落，英雄白发渐生，可那一声“兴复汉室”的誓言，仍在山河之间回响。</div>
      <div class="ending-text">你以仁德聚人，以谋略破敌，以百战定天下。史书翻过这一页，而属于你的三国，才刚刚开始。</div>
      <div class="ending-stats"><div class="ending-stat"><b>${cities}</b><span>城池</span></div><div class="ending-stat"><b>${CORE.fmt(troops)}</b><span>兵力</span></div><div class="ending-stat"><b>${GS.stats.wins}</b><span>胜战</span></div><div class="ending-stat"><b>${GS.turn}</b><span>回合</span></div></div>
      </div>`, footer:`<button class="mbtn" data-more>继续经营</button><button class="mbtn gold" data-menu>回到主菜单</button>` }),
    onMount:root=>{
      $('[data-more]',root).onclick=()=>UI.closeModal();
      $('[data-menu]',root).onclick=()=>{ UI.closeModal(); GAME.toMenu(); };
    }, onClose:()=>{ updateHUD(); drawMap(); }});
}
function showGameOver(){
  UI.openModal({ narrow:true, persistent:true, hideClose:true, kicker:'汉室倾颓', title:'山河破碎',
    render:()=>({ body:`<div style="text-align:center;padding:10px 0 18px"><div style="font-family:var(--font-kai);font-size:20px;color:#d9a49a;line-height:1.8">我军城池尽失，</div><div style="font-family:var(--font-kai);font-size:20px;color:#d9a49a">兴复汉室之志，暂告中断。</div><div style="font-size:10px;color:var(--muted);margin-top:12px">可读取存档，重整旗鼓。</div></div>`,
      footer:`<button class="mbtn" data-load>读取存档</button><button class="mbtn primary" data-menu>回到主菜单</button>` }),
    onMount:root=>{ $('[data-load]',root).onclick=()=>{ UI.closeModal(); UI.openSaves(); }; $('[data-menu]',root).onclick=()=>{ UI.closeModal(); GAME.toMenu(); }; }});
}

return { enter, resizeMap, drawMap, runChapter, endTurn, openChapterLog, showEnding, get busy(){return busy;}, get selected(){return selectedCity;} };
})();

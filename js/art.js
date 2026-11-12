/* ============================================================
   烽火三国 · 丹青
   程序化人物立绘、旗帜、地形纹理
   ============================================================ */
const ART = (() => {
'use strict';
const cache = {};
const texCache = {};

function hash(str){ let h=2166136261; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function shade(hex, amt){
  const c = hex.replace('#',''); const n = parseInt(c.length===3?c.split('').map(x=>x+x).join(''):c,16);
  let r=(n>>16)+amt, g=((n>>8)&255)+amt, b=(n&255)+amt;
  r=clamp(r,0,255); g=clamp(g,0,255); b=clamp(b,0,255);
  return '#'+((r<<16)|(g<<8)|b).toString(16).padStart(6,'0');
}
function rgba(hex,a){ const c=hex.replace('#',''); const n=parseInt(c,16); return `rgba(${n>>16},${(n>>8)&255},${n&255},${a})`; }
function poly(ctx, pts, close=true){ ctx.beginPath(); pts.forEach((p,i)=> i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); if(close) ctx.closePath(); }
function blob(ctx, x,y,w,h, seed){
  const r=mulberry32(seed); ctx.beginPath(); ctx.ellipse(x,y,w,h,0,0,Math.PI*2); ctx.fill();
}
function line(ctx, pts, color, w, alpha=1){
  ctx.save(); ctx.strokeStyle=color; ctx.globalAlpha=alpha; ctx.lineWidth=w; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.beginPath();
  pts.forEach((p,i)=> i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.stroke(); ctx.restore();
}

function getPortraitSpec(id){
  const g = DATA.GENERALS[id];
  if(g) return { id, name:g.name, faction:g.faction, p:g.portrait, general:g };
  const m = DATA.MOOKS[id];
  if(m) return { id, name:m.name, faction:m.faction, p:m.portrait, mook:m };
  return { id, name:'无名', faction:'yellow', p:{skin:'#c79a75',hair:'#211a13',beard:'short',head:'helmet',robe:'#5b5a4d',armor:'#66644f',accent:'#b99252',eye:'round',brow:'fierce',age:32} };
}

function drawPortrait(id, size=512){
  const spec = getPortraitSpec(id);
  const p = spec.p;
  const W=512, H=640;
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  const ctx=cv.getContext('2d');
  const seed=hash(id);
  const rnd=mulberry32(seed);
  const skin=p.skin||'#d2a47e', hair=p.hair||'#211a13', robe=p.robe||'#3f5f4c', armor=p.armor||'#4a5f50', accent=p.accent||'#c9a45f';
  const factionCol = (DATA.FACTIONS[spec.faction]||{color:'#c9a45f'}).color;
  const ink='#0b0f0d';
  // ---- background ----
  const bg=ctx.createLinearGradient(0,0,0,H); bg.addColorStop(0,'#1d2a24'); bg.addColorStop(.5,'#101814'); bg.addColorStop(1,'#070b09');
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  const glow=ctx.createRadialGradient(256,250,20,256,250,260); glow.addColorStop(0,rgba(accent,.32)); glow.addColorStop(.5,rgba(accent,.09)); glow.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=glow; ctx.fillRect(0,0,W,H);
  // sun disc
  ctx.save(); ctx.globalAlpha=.5; ctx.fillStyle=rgba(factionCol,.18); ctx.beginPath(); ctx.arc(256,255,168,0,Math.PI*2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.strokeStyle=rgba(accent,.2); ctx.lineWidth=1; ctx.beginPath(); ctx.arc(256,255,168,0,Math.PI*2); ctx.stroke(); ctx.restore();
  // ink mountains
  ctx.save(); ctx.globalAlpha=.5; ctx.fillStyle='#0a1210';
  ctx.beginPath(); ctx.moveTo(-20,540); ctx.lineTo(70,420); ctx.lineTo(140,500); ctx.lineTo(220,400); ctx.lineTo(300,505); ctx.lineTo(390,410); ctx.lineTo(470,500); ctx.lineTo(540,460); ctx.lineTo(540,660); ctx.lineTo(-20,660); ctx.fill();
  ctx.globalAlpha=.3; ctx.fillStyle='#21342b';
  ctx.beginPath(); ctx.moveTo(-20,575); ctx.lineTo(90,510); ctx.lineTo(190,560); ctx.lineTo(295,500); ctx.lineTo(410,560); ctx.lineTo(530,505); ctx.lineTo(540,660); ctx.lineTo(-20,660); ctx.fill(); ctx.restore();
  // ink splashes
  for(let i=0;i<18;i++){ ctx.save(); ctx.globalAlpha=.05+rnd()*.1; ctx.fillStyle= i%3? '#d6c8a5':'#0a0f0c'; blob(ctx, rnd()*W, 60+rnd()*520, 2+rnd()*8, 1+rnd()*4, seed+i); ctx.restore(); }
  // pine branch silhouette
  ctx.save(); ctx.strokeStyle='rgba(7,11,9,.8)'; ctx.lineWidth=5; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(-10,40); ctx.bezierCurveTo(70,55,120,30,180,70); ctx.stroke();
  for(let i=0;i<9;i++){ const x=20+i*18, y=45+Math.sin(i)*9; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+12,y-14); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x+6,y+2); ctx.lineTo(x+20,y+8); ctx.stroke(); }
  ctx.restore();
  // paper grain
  for(let i=0;i<1600;i++){ ctx.fillStyle=`rgba(${rnd()>.5?'230,218,190':'0,0,0'},${.01+rnd()*.04})`; ctx.fillRect(rnd()*W,rnd()*H,1,1); }

  // ---- body / robe ----
  const cape = spec.general && ['lvbu','caocao','sunquan','liubei','guanyu'].includes(id);
  if(cape){
    ctx.fillStyle=shade(robe,-24); ctx.beginPath(); ctx.moveTo(110,470); ctx.quadraticCurveTo(60,560,30,660); ctx.lineTo(150,660); ctx.lineTo(170,470); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(402,470); ctx.quadraticCurveTo(452,560,482,660); ctx.lineTo(362,660); ctx.lineTo(342,470); ctx.closePath(); ctx.fill();
  }
  const bodyGrad=ctx.createLinearGradient(0,450,0,640); bodyGrad.addColorStop(0,shade(robe,18)); bodyGrad.addColorStop(.55,robe); bodyGrad.addColorStop(1,shade(robe,-28));
  ctx.fillStyle=bodyGrad;
  ctx.beginPath(); ctx.moveTo(24,640); ctx.bezierCurveTo(54,540,118,478,188,446); ctx.lineTo(324,446); ctx.bezierCurveTo(394,478,458,540,488,640); ctx.closePath(); ctx.fill();
  // inner collar
  ctx.fillStyle=shade(robe,-36);
  poly(ctx,[[190,450],[256,540],[322,450],[342,468],[256,590],[172,468]]); ctx.fill();
  // armor chest
  const ag=ctx.createLinearGradient(180,470,340,620); ag.addColorStop(0,shade(armor,26)); ag.addColorStop(.5,armor); ag.addColorStop(1,shade(armor,-34));
  ctx.fillStyle=ag;
  ctx.beginPath(); ctx.moveTo(186,462); ctx.lineTo(326,462); ctx.lineTo(362,585); ctx.lineTo(342,640); ctx.lineTo(170,640); ctx.lineTo(150,585); ctx.closePath(); ctx.fill();
  // lamellar lines
  ctx.save(); ctx.strokeStyle=rgba('#000000',.28); ctx.lineWidth=2;
  for(let i=0;i<7;i++){ const y=495+i*20; ctx.beginPath(); ctx.moveTo(176+Math.max(0,i-1)*2,y); ctx.quadraticCurveTo(256,y+8,338-Math.max(0,i-1)*2,y); ctx.stroke(); }
  for(let i=0;i<6;i++){ const x=205+i*20; ctx.beginPath(); ctx.moveTo(x,475); ctx.lineTo(x+(x-256)*.15,635); ctx.stroke(); }
  ctx.restore();
  // chest emblem
  ctx.save(); ctx.globalAlpha=.9; ctx.fillStyle=shade(armor,-42); ctx.strokeStyle=rgba(accent,.75); ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(256,552,20,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle=rgba(accent,.9); ctx.font='20px "STKaiti","KaiTi",serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  const short=(DATA.FACTIONS[spec.faction]||{short:'汉'}).short;
  ctx.fillText(short,256,553); ctx.restore();
  // shoulder guards
  function shoulder(x, flip){
    ctx.save(); ctx.translate(x,0); if(flip) ctx.scale(-1,1);
    const g=ctx.createLinearGradient(0,470,0,560); g.addColorStop(0,shade(armor,38)); g.addColorStop(1,shade(armor,-26));
    ctx.fillStyle=g; ctx.strokeStyle=rgba('#000000',.35); ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(0,480); ctx.bezierCurveTo(-55,485,-76,520,-70,560); ctx.bezierCurveTo(-40,575,-2,560,12,535); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle=rgba(accent,.75);
    ctx.beginPath(); ctx.arc(-40,525,3.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(-22,543,3,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  shoulder(172,false); shoulder(340,true);
  // neck
  const ng=ctx.createLinearGradient(0,370,0,465); ng.addColorStop(0,shade(skin,-8)); ng.addColorStop(1,shade(skin,-42));
  ctx.fillStyle=ng; ctx.beginPath(); ctx.moveTo(226,360); ctx.lineTo(286,360); ctx.lineTo(298,455); ctx.lineTo(214,455); ctx.closePath(); ctx.fill();
  ctx.fillStyle=rgba('#000',.2); ctx.beginPath(); ctx.ellipse(256,430,36,16,0,0,Math.PI*2); ctx.fill();

  // ---- hair back ----
  ctx.fillStyle=hair;
  ctx.beginPath(); ctx.ellipse(256,258,94,118,0,Math.PI*.95,Math.PI*2.05); ctx.fill();
  if(p.beard==='long'||p.beard==='white'){ ctx.beginPath(); ctx.ellipse(256,380,62,80,0,0,Math.PI); ctx.fill(); }

  // ---- face ----
  const fg=ctx.createLinearGradient(190,230,330,380); fg.addColorStop(0,shade(skin,16)); fg.addColorStop(.5,skin); fg.addColorStop(1,shade(skin,-18));
  ctx.fillStyle=fg; ctx.strokeStyle=rgba('#1a100a',.5); ctx.lineWidth=2.5;
  ctx.beginPath();
  ctx.moveTo(192,266); ctx.bezierCurveTo(192,212,220,186,256,186); ctx.bezierCurveTo(292,186,320,212,320,266);
  ctx.bezierCurveTo(322,312,312,344,294,360); ctx.bezierCurveTo(280,373,268,380,256,380); ctx.bezierCurveTo(244,380,232,373,218,360);
  ctx.bezierCurveTo(200,344,190,312,192,266); ctx.closePath(); ctx.fill(); ctx.stroke();
  // cheek planes
  ctx.save(); ctx.globalAlpha=.10; ctx.fillStyle='#7c3c26';
  ctx.beginPath(); ctx.ellipse(211,325,18,26,-.2,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(301,325,18,26,.2,0,Math.PI*2); ctx.fill(); ctx.restore();
  // ears
  ctx.fillStyle=shade(skin,-6); ctx.strokeStyle=rgba('#1a100a',.35); ctx.lineWidth=2;
  ctx.beginPath(); ctx.ellipse(194,294,13,24,-.1,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(318,294,13,24,.1,0,Math.PI*2); ctx.fill(); ctx.stroke();
  // face shading
  ctx.save(); ctx.globalAlpha=.23; ctx.fillStyle='#5a2a1a';
  ctx.beginPath(); ctx.ellipse(301,302,37,68,.08,0,Math.PI*2); ctx.fill(); ctx.restore();
  // jaw shadow / cheek contour
  ctx.save(); ctx.globalAlpha=.12; ctx.fillStyle='#4a2115';
  ctx.beginPath(); ctx.moveTo(210,340); ctx.quadraticCurveTo(230,366,256,376); ctx.quadraticCurveTo(286,366,304,342); ctx.quadraticCurveTo(280,382,256,386); ctx.quadraticCurveTo(228,382,210,340); ctx.fill(); ctx.restore();
  ctx.save(); ctx.globalAlpha=.12; ctx.strokeStyle='#6b3523'; ctx.lineWidth=2; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(238,326); ctx.quadraticCurveTo(230,338,233,348); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(276,326); ctx.quadraticCurveTo(284,338,281,348); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.globalAlpha=.12; ctx.fillStyle='#fff2d4';
  ctx.beginPath(); ctx.ellipse(215,272,24,40,-.1,0,Math.PI*2); ctx.fill(); ctx.restore();

  // ---- face features ----
  const eyeY=292, eyeDX=31;
  // brow shadow
  ctx.save(); ctx.globalAlpha=.2; ctx.fillStyle='#3c1b10';
  ctx.beginPath(); ctx.ellipse(225,281,23,12,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(287,281,23,12,0,0,Math.PI*2); ctx.fill(); ctx.restore();
  function eye(cx, flip){
    ctx.save(); ctx.translate(cx,eyeY); if(flip) ctx.scale(-1,1);
    const style=p.eye||'sharp';
    ctx.fillStyle='#e9d9bf';
    if(style==='round'){
      ctx.beginPath(); ctx.moveTo(-13,1); ctx.quadraticCurveTo(-2,-6,14,-2); ctx.quadraticCurveTo(2,6,-13,1); ctx.fill();
      ctx.fillStyle='#1e120a'; ctx.beginPath(); ctx.ellipse(1,0,5.3,4.8,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#080503'; ctx.beginPath(); ctx.arc(2.2,0,2.5,0,Math.PI*2); ctx.fill();
    } else if(style==='phoenix'){
      ctx.beginPath(); ctx.moveTo(-17,2); ctx.quadraticCurveTo(-3,-7,16,-4); ctx.quadraticCurveTo(2,6,-17,2); ctx.fill();
      ctx.fillStyle='#1f1209'; ctx.beginPath(); ctx.ellipse(2,-1,5.2,4.6,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#060402'; ctx.beginPath(); ctx.arc(3.3,-1,2.1,0,Math.PI*2); ctx.fill();
      line(ctx,[[-17,3],[-25,-5]],'#1e1109',2.6,.9);
    } else if(style==='narrow'){
      ctx.beginPath(); ctx.moveTo(-15,1); ctx.quadraticCurveTo(-1,-4,14,-2); ctx.quadraticCurveTo(1,3.5,-15,1); ctx.fill();
      ctx.fillStyle='#1d1109'; ctx.beginPath(); ctx.ellipse(1,0,4.6,3.7,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#060402'; ctx.beginPath(); ctx.arc(2,0,1.8,0,Math.PI*2); ctx.fill();
    } else if(style==='calm'){
      ctx.beginPath(); ctx.moveTo(-13,1); ctx.quadraticCurveTo(-1,-4,13,-1.5); ctx.quadraticCurveTo(1,3.5,-13,1); ctx.fill();
      ctx.fillStyle='#21140b'; ctx.beginPath(); ctx.arc(1,0,4.6,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#060402'; ctx.beginPath(); ctx.arc(2,0,1.8,0,Math.PI*2); ctx.fill();
    } else if(style==='one'){
      ctx.beginPath(); ctx.ellipse(0,0,12,6,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#21140c'; ctx.beginPath(); ctx.arc(1,0,4.5,0,Math.PI*2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(-15,2); ctx.quadraticCurveTo(0,-7,16,-3); ctx.quadraticCurveTo(2,6,-15,2); ctx.fill();
      ctx.fillStyle='#21140b'; ctx.beginPath(); ctx.ellipse(2,0,4.5,4.4,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#060402'; ctx.beginPath(); ctx.arc(3.1,0,2.1,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle='rgba(255,250,235,.65)'; ctx.beginPath(); ctx.arc(4,-2,1.1,0,Math.PI*2); ctx.fill();
    // heavy upper lid & lower lid
    ctx.strokeStyle='#1e1008'; ctx.lineWidth=3.2; ctx.beginPath(); ctx.moveTo(-15,-1); ctx.quadraticCurveTo(0,-8,16,-3); ctx.stroke();
    ctx.strokeStyle='rgba(90,45,30,.45)'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(-12,3); ctx.quadraticCurveTo(0,7,12,3); ctx.stroke();
    ctx.restore();
  }
  if(p.eye==='one'){
    // eyepatch over right eye
    eye(256-eyeDX,false);
    ctx.save(); ctx.fillStyle='#1a1510'; ctx.beginPath(); ctx.moveTo(256+eyeDX-19,eyeY-12); ctx.lineTo(256+eyeDX+17,eyeY-7); ctx.lineTo(256+eyeDX+12,eyeY+14); ctx.lineTo(256+eyeDX-14,eyeY+10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#0a0806'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(256+eyeDX-22,eyeY-17); ctx.lineTo(256+eyeDX+20,eyeY-10); ctx.stroke(); ctx.restore();
    // scar
    line(ctx,[[256+eyeDX-12,eyeY-20],[256+eyeDX+4,eyeY-2],[256+eyeDX-8,eyeY+14]],'#7e3d2e',2,.8);
  } else {
    eye(256-eyeDX,false); eye(256+eyeDX,true);
  }
  // eyebrows
  ctx.save(); ctx.strokeStyle= p.brow==='white'?'#ded6c4':hair; ctx.lineWidth= p.brow==='fierce'?9:6; ctx.lineCap='round';
  if(p.brow==='fierce'){
    ctx.beginPath(); ctx.moveTo(256-eyeDX-22,272); ctx.quadraticCurveTo(256-eyeDX,258,256-eyeDX+19,266); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(256+eyeDX+22,272); ctx.quadraticCurveTo(256+eyeDX,258,256+eyeDX-19,266); ctx.stroke();
  } else if(p.brow==='sword'){
    ctx.beginPath(); ctx.moveTo(256-eyeDX-23,272); ctx.lineTo(256-eyeDX+19,262); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(256+eyeDX+23,272); ctx.lineTo(256+eyeDX-19,262); ctx.stroke();
  } else {
    ctx.lineWidth=5;
    ctx.beginPath(); ctx.moveTo(256-eyeDX-19,270); ctx.quadraticCurveTo(256-eyeDX,264,256-eyeDX+17,270); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(256+eyeDX+19,270); ctx.quadraticCurveTo(256+eyeDX,264,256+eyeDX-17,270); ctx.stroke();
  }
  ctx.restore();
  // nose
  ctx.save(); ctx.strokeStyle=rgba('#6e3a24',.55); ctx.lineWidth=2.2; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(258,300); ctx.quadraticCurveTo(249,320,252,332); ctx.quadraticCurveTo(258,337,265,332); ctx.stroke();
  ctx.globalAlpha=.25; ctx.fillStyle='#4a2014'; ctx.beginPath(); ctx.ellipse(247,328,4,2,0,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(267,328,4,2,0,0,Math.PI*2); ctx.fill();
  ctx.restore();
  // mouth
  ctx.save(); ctx.strokeStyle='#5a2519'; ctx.lineWidth=3; ctx.lineCap='round';
  const fierce=p.brow==='fierce';
  const kind=p.eye==='kind'||p.eye==='calm';
  ctx.beginPath(); ctx.moveTo(236,353); ctx.quadraticCurveTo(256,fierce?358:(kind?350:355),276,353); ctx.stroke();
  ctx.globalAlpha=.35; ctx.strokeStyle='#2a100b'; ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(241,360); ctx.quadraticCurveTo(256,364,271,359); ctx.stroke();
  ctx.strokeStyle='rgba(255,220,190,.35)'; ctx.lineWidth=1.3; ctx.beginPath(); ctx.moveTo(242,346); ctx.quadraticCurveTo(256,344,270,346); ctx.stroke(); ctx.restore();
  // age lines
  if(p.age>45){
    ctx.save(); ctx.strokeStyle=rgba('#6b3d2a',.35); ctx.lineWidth=1.3;
    [[224,304,214,310],[286,304,296,310],[238,322,230,330],[274,322,282,330]].forEach(l=>{ ctx.beginPath(); ctx.moveTo(l[0],l[1]); ctx.lineTo(l[2],l[3]); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(230,274); ctx.lineTo(240,272); ctx.moveTo(272,272); ctx.lineTo(282,274); ctx.stroke(); ctx.restore();
  }

  // ---- beard ----
  const beardColor = p.beard==='white' ? '#d8d1c0' : hair;
  ctx.save(); ctx.fillStyle=beardColor; ctx.strokeStyle=rgba('#000',.22); ctx.lineWidth=1.5;
  if(p.beard==='long'||p.beard==='white'){
    ctx.beginPath(); ctx.moveTo(234,340); ctx.quadraticCurveTo(232,360,220,378); ctx.quadraticCurveTo(238,388,236,420); ctx.quadraticCurveTo(250,460,256,500); ctx.quadraticCurveTo(262,460,276,420); ctx.quadraticCurveTo(274,388,292,378); ctx.quadraticCurveTo(280,360,278,340); ctx.quadraticCurveTo(256,352,234,340); ctx.fill();
    ctx.strokeStyle=rgba('#fff',.15); ctx.lineWidth=1.5;
    for(let i=0;i<7;i++){ const x=234+i*7; ctx.beginPath(); ctx.moveTo(x,352+i*3); ctx.quadraticCurveTo(x+(i-3)*2,400,x+(i-3)*4,455+i*4); ctx.stroke(); }
  } else if(p.beard==='bushy'){
    ctx.beginPath(); ctx.moveTo(224,338); ctx.quadraticCurveTo(210,362,222,382); ctx.quadraticCurveTo(236,400,256,398); ctx.quadraticCurveTo(276,400,290,382); ctx.quadraticCurveTo(302,362,288,338); ctx.quadraticCurveTo(256,356,224,338); ctx.fill();
    ctx.strokeStyle=rgba('#fff',.12); ctx.lineWidth=2;
    for(let i=0;i<6;i++){ ctx.beginPath(); ctx.moveTo(222+i*13,356); ctx.lineTo(218+i*15,390); ctx.stroke(); }
  } else if(p.beard==='goatee'){
    ctx.beginPath(); ctx.moveTo(244,348); ctx.quadraticCurveTo(248,382,256,408); ctx.quadraticCurveTo(264,382,268,348); ctx.quadraticCurveTo(256,356,244,348); ctx.fill();
  } else if(p.beard==='short'){
    ctx.beginPath(); ctx.ellipse(256,360,27,17,0,0,Math.PI); ctx.fill();
  }
  // moustache
  if(p.beard!=='none'){
    ctx.beginPath(); ctx.moveTo(230,334); ctx.quadraticCurveTo(244,326,254,338); ctx.quadraticCurveTo(256,342,258,338); ctx.quadraticCurveTo(268,326,282,334); ctx.quadraticCurveTo(268,342,256,344); ctx.quadraticCurveTo(244,342,230,334); ctx.fill();
  }
  ctx.restore();

  // ---- headwear ----
  const head=p.head||'helmet';
  ctx.save();
  if(head==='helmet'){
    const hg=ctx.createLinearGradient(180,160,330,260); hg.addColorStop(0,shade(armor,50)); hg.addColorStop(.5,shade(armor,18)); hg.addColorStop(1,shade(armor,-30));
    ctx.fillStyle=hg; ctx.strokeStyle=rgba('#000',.4); ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(190,252); ctx.bezierCurveTo(188,190,216,154,256,154); ctx.bezierCurveTo(296,154,324,190,322,252); ctx.quadraticCurveTo(256,238,190,252); ctx.closePath(); ctx.fill(); ctx.stroke();
    // brow band
    ctx.fillStyle=shade(armor,-24); ctx.beginPath(); ctx.moveTo(188,244); ctx.quadraticCurveTo(256,230,324,244); ctx.lineTo(326,262); ctx.quadraticCurveTo(256,248,186,262); ctx.closePath(); ctx.fill();
    ctx.strokeStyle=rgba(accent,.8); ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(190,252); ctx.quadraticCurveTo(256,238,322,252); ctx.stroke();
    // cheek guards
    ctx.fillStyle=shade(armor,-8);
    ctx.beginPath(); ctx.moveTo(190,252); ctx.lineTo(178,310); ctx.quadraticCurveTo(190,340,206,348); ctx.lineTo(202,278); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(322,252); ctx.lineTo(334,310); ctx.quadraticCurveTo(322,340,306,348); ctx.lineTo(310,278); ctx.closePath(); ctx.fill();
    // crest
    if(p.plume){ ctx.fillStyle=p.plume; ctx.beginPath(); ctx.moveTo(246,158); ctx.quadraticCurveTo(248,100,256,80); ctx.quadraticCurveTo(264,100,266,158); ctx.fill(); ctx.restore(); ctx.save(); }
    // ridge
    ctx.strokeStyle=rgba(accent,.55); ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(256,156); ctx.lineTo(256,244); ctx.stroke();
  } else if(head==='guan'){
    ctx.fillStyle=shade(robe,8); ctx.strokeStyle=rgba('#000',.32); ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(188,248); ctx.quadraticCurveTo(190,192,256,180); ctx.quadraticCurveTo(322,192,324,248); ctx.quadraticCurveTo(256,232,188,248); ctx.fill(); ctx.stroke();
    ctx.fillStyle=shade(robe,-14); ctx.beginPath(); ctx.moveTo(184,238); ctx.quadraticCurveTo(256,222,328,238); ctx.lineTo(328,252); ctx.quadraticCurveTo(256,238,184,252); ctx.fill();
    ctx.fillStyle=shade(robe,-24); ctx.beginPath(); ctx.ellipse(256,172,20,14,0,0,Math.PI*2); ctx.fill();
    // cloth tail
    ctx.strokeStyle=shade(robe,0); ctx.lineWidth=10; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(312,228); ctx.quadraticCurveTo(346,250,340,300); ctx.stroke();
  } else if(head==='scarf'){
    ctx.fillStyle='#d8d2be'; ctx.strokeStyle=rgba('#000',.22); ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(190,246); ctx.quadraticCurveTo(192,190,256,176); ctx.quadraticCurveTo(320,190,322,246); ctx.quadraticCurveTo(256,232,190,246); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#c6c0ad'; ctx.beginPath(); ctx.moveTo(188,234); ctx.quadraticCurveTo(256,218,324,234); ctx.lineTo(324,248); ctx.quadraticCurveTo(256,234,188,248); ctx.fill();
    // headband knot + wings
    ctx.fillStyle='#ece6d4'; ctx.beginPath(); ctx.moveTo(182,226); ctx.quadraticCurveTo(140,214,126,238); ctx.quadraticCurveTo(158,244,182,240); ctx.fill();
    ctx.beginPath(); ctx.moveTo(330,226); ctx.quadraticCurveTo(372,214,386,238); ctx.quadraticCurveTo(354,244,330,240); ctx.fill();
    ctx.fillStyle=shade(accent,0); ctx.beginPath(); ctx.arc(256,188,10,0,Math.PI*2); ctx.fill();
  } else if(head==='crown'){
    ctx.fillStyle='#1b1a17'; ctx.strokeStyle=rgba(accent,.6); ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(194,240); ctx.quadraticCurveTo(194,188,256,174); ctx.quadraticCurveTo(318,188,318,240); ctx.quadraticCurveTo(256,226,194,240); ctx.fill(); ctx.stroke();
    ctx.fillStyle=shade(accent,-10); ctx.beginPath(); ctx.moveTo(188,232); ctx.quadraticCurveTo(256,216,324,232); ctx.lineTo(324,246); ctx.quadraticCurveTo(256,230,188,246); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#1b1a17'; ctx.fillRect(242,166,28,30);
    ctx.fillStyle=accent; ctx.fillRect(240,196,32,5);
    // hanging beads
    ctx.fillStyle=rgba(accent,.8); for(let i=0;i<5;i++){ ctx.beginPath(); ctx.arc(198+i*30,244,3,0,Math.PI*2); ctx.fill(); }
  } else if(head==='daoist'){
    ctx.fillStyle=hair; ctx.beginPath(); ctx.ellipse(256,174,26,20,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=shade(robe,-4); ctx.beginPath(); ctx.moveTo(190,244); ctx.quadraticCurveTo(192,205,256,195); ctx.quadraticCurveTo(320,205,322,244); ctx.quadraticCurveTo(256,230,190,244); ctx.fill();
    ctx.fillStyle=shade(accent,-8); ctx.fillRect(188,235,136,10);
    ctx.fillStyle='#2e2a20'; ctx.fillRect(250,160,12,22);
  } else if(head==='scholar'){
    ctx.fillStyle='#1c1b18'; ctx.strokeStyle=rgba(accent,.35); ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(198,242); ctx.lineTo(200,186); ctx.lineTo(312,186); ctx.lineTo(314,242); ctx.quadraticCurveTo(256,228,198,242); ctx.fill(); ctx.stroke();
    ctx.fillStyle=shade(accent,-8); ctx.fillRect(198,230,116,8);
    ctx.fillStyle='#1c1b18'; ctx.fillRect(238,164,36,24);
  } else if(head==='yellowband'){
    ctx.fillStyle='#c2a13f'; ctx.strokeStyle=rgba('#000',.25); ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(188,244); ctx.quadraticCurveTo(192,206,256,196); ctx.quadraticCurveTo(320,206,324,244); ctx.lineTo(324,260); ctx.quadraticCurveTo(256,246,188,260); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle=shade(hair,8); ctx.beginPath(); ctx.ellipse(256,200,72,32,0,Math.PI,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#c2a13f'; ctx.lineWidth=8; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(196,250); ctx.quadraticCurveTo(160,270,154,300); ctx.stroke();
  } else if(head==='feather'){
    // gold crown
    const cg=ctx.createLinearGradient(210,150,300,230); cg.addColorStop(0,'#e3c477'); cg.addColorStop(.5,'#b78b3e'); cg.addColorStop(1,'#84602a');
    ctx.fillStyle=cg; ctx.strokeStyle='rgba(40,20,8,.5)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(206,236); ctx.quadraticCurveTo(208,182,256,168); ctx.quadraticCurveTo(304,182,306,236); ctx.quadraticCurveTo(256,220,206,236); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#7e2b22'; ctx.beginPath(); ctx.arc(256,190,8,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=accent; ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(214,214); ctx.quadraticCurveTo(256,198,298,214); ctx.stroke();
    // pheasant feathers
    const f=ctx.createLinearGradient(150,40,380,160); f.addColorStop(0,'#e6d29c'); f.addColorStop(.5,'#caa45f'); f.addColorStop(1,'#6d4d25');
    ctx.strokeStyle=f; ctx.lineWidth=4; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(230,174); ctx.bezierCurveTo(190,100,130,80,96,120); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(282,174); ctx.bezierCurveTo(322,100,382,80,416,120); ctx.stroke();
    ctx.strokeStyle='rgba(255,240,200,.5)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(228,172); ctx.bezierCurveTo(190,104,138,86,104,122); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(284,172); ctx.bezierCurveTo(322,104,374,86,408,122); ctx.stroke();
  }
  ctx.restore();

  // ---- armor trims / sash ----
  ctx.save();
  ctx.strokeStyle=rgba(accent,.55); ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(186,470); ctx.lineTo(256,540); ctx.lineTo(326,470); ctx.stroke();
  ctx.fillStyle=rgba(accent,.5);
  for(let i=0;i<4;i++){ ctx.beginPath(); ctx.arc(206+i*32,610,2.2,0,Math.PI*2); ctx.fill(); }
  ctx.restore();

  // ---- painterly side shadow / rim / grain ----
  ctx.save(); ctx.globalCompositeOperation='multiply';
  const sideShade=ctx.createLinearGradient(230,0,512,0);
  sideShade.addColorStop(0,'rgba(255,255,255,1)'); sideShade.addColorStop(.55,'rgba(232,232,220,.86)'); sideShade.addColorStop(1,'rgba(38,44,36,.55)');
  ctx.fillStyle=sideShade; ctx.fillRect(0,0,W,H); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation='screen'; ctx.globalAlpha=.22;
  const warmRim=ctx.createLinearGradient(120,100,210,520); warmRim.addColorStop(0,rgba(accent,.8)); warmRim.addColorStop(.55,rgba(accent,.18)); warmRim.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=warmRim; ctx.fillRect(0,0,320,H); ctx.restore();
  // brush strokes in the ink background
  ctx.save(); ctx.globalAlpha=.12;
  for(let i=0;i<18;i++){
    ctx.strokeStyle=i%2?rgba(accent,.6):'rgba(8,12,9,.6)'; ctx.lineWidth=1+Math.random()*2;
    const x=Math.random()*W,y=40+Math.random()*H*.75; ctx.beginPath(); ctx.moveTo(x,y); ctx.quadraticCurveTo(x+40+Math.random()*80,y-12,x+100+Math.random()*120,y+4); ctx.stroke();
  }
  ctx.restore();
  // paper grain
  for(let i=0;i<1400;i++){ ctx.fillStyle=`rgba(${Math.random()>.5?'240,232,210':'0,0,0'},${.008+Math.random()*.025})`; ctx.fillRect(Math.random()*W,Math.random()*H,1,1); }
  // ---- rim light / vignette ----
  ctx.save(); ctx.globalCompositeOperation='screen'; ctx.globalAlpha=.18;
  const rim=ctx.createLinearGradient(160,160,190,500); rim.addColorStop(0,rgba(accent,.7)); rim.addColorStop(1,'rgba(0,0,0,0)');
  ctx.strokeStyle=rim; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(196,230); ctx.bezierCurveTo(170,320,188,410,210,450); ctx.stroke(); ctx.restore();
  const vg=ctx.createRadialGradient(256,300,150,256,320,420); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(.78,'rgba(0,0,0,.18)'); vg.addColorStop(1,'rgba(0,0,0,.62)');
  ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
  // bottom fade
  const bf=ctx.createLinearGradient(0,H-120,0,H); bf.addColorStop(0,'rgba(5,8,7,0)'); bf.addColorStop(1,'rgba(5,8,7,.85)'); ctx.fillStyle=bf; ctx.fillRect(0,H-120,W,120);
  // name seal
  ctx.save(); ctx.globalAlpha=.72; ctx.fillStyle='rgba(160,42,32,.82)'; ctx.strokeStyle='rgba(235,205,155,.35)'; ctx.lineWidth=1;
  const sx=430, sy=32, sw=50, sh=50; ctx.fillRect(sx,sy,sw,sh); ctx.strokeRect(sx,sy,sw,sh);
  ctx.fillStyle='#f2e2c8'; ctx.font='26px "STKaiti","KaiTi",serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(spec.name.slice(0,1),sx+sw/2,sy+sh/2+1); ctx.restore();
  return cv;
}

function portrait(id){
  if(window.AI_ASSETS&&window.AI_ASSETS.portraits&&window.AI_ASSETS.portraits[id]) return window.AI_ASSETS.portraits[id];
  if(cache[id]) return cache[id];
  const cv = drawPortrait(id);
  cache[id] = cv.toDataURL('image/png');
  return cache[id];
}

/* ---------------- 纹理 ---------------- */
function noiseTexture(type, seed){
  const key=type+'_'+seed;
  if(texCache[key]) return texCache[key];
  const S=256, cv=document.createElement('canvas'); cv.width=S; cv.height=S;
  const c=cv.getContext('2d'); const rnd=mulberry32(hash(key));
  const base={
    plain:'#6f8a55', road:'#9a8762', forest:'#3f6242', hill:'#7d7b4f', rock:'#68665e', water:'#3d6f7e',
    bridge:'#8a7352', village:'#8b7550', wall:'#5c5b52', sand:'#9d8d64', scorch:'#4d4338', city:'#77715f'
  }[type]||'#6f8a55';
  c.fillStyle=base; c.fillRect(0,0,S,S);
  for(let i=0;i<2600;i++){
    const l=(rnd()-.5)*42;
    c.fillStyle=`rgba(${l>0?'255,255,240':'0,0,0'},${Math.abs(l)/220})`;
    c.fillRect(rnd()*S,rnd()*S,1+rnd()*2,1+rnd()*2);
  }
  if(type==='plain'||type==='village'||type==='forest'){
    for(let i=0;i<170;i++){
      const x=rnd()*S,y=rnd()*S,l=2+rnd()*7;
      c.strokeStyle=rnd()>.4?'rgba(40,70,35,.55)':'rgba(180,190,120,.22)';
      c.lineWidth=1; c.beginPath(); c.moveTo(x,y); c.lineTo(x+(rnd()-.5)*4,y-l); c.stroke();
    }
  }
  if(type==='forest'){
    for(let i=0;i<55;i++){ const x=rnd()*S,y=rnd()*S,r=5+rnd()*9;
      c.fillStyle=`rgba(${25+rnd()*20},${55+rnd()*30},${30+rnd()*15},.5)`; c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.fill();
      c.fillStyle='rgba(12,30,16,.35)'; c.beginPath(); c.arc(x+r*.3,y+r*.3,r*.7,0,Math.PI*2); c.fill();
    }
  }
  if(type==='hill'||type==='rock'||type==='city'){
    for(let i=0;i<35;i++){ const x=rnd()*S,y=rnd()*S,w=6+rnd()*30,h=4+rnd()*14;
      c.fillStyle=`rgba(${rnd()>.5?'240,235,215':'20,20,18'},.06)`; c.beginPath(); c.ellipse(x,y,w,h,rnd()*3,0,Math.PI*2); c.fill();
    }
  }
  if(type==='water'){
    for(let i=0;i<70;i++){ const x=rnd()*S,y=rnd()*S,w=12+rnd()*36;
      c.strokeStyle=`rgba(${180+rnd()*50},${215+rnd()*30},220,${.05+rnd()*.1})`; c.lineWidth=1+rnd()*1.5;
      c.beginPath(); c.moveTo(x,y); c.quadraticCurveTo(x+w/2,y-2,x+w,y); c.stroke();
    }
  }
  if(type==='road'||type==='city'){
    for(let i=0;i<20;i++){ const y=i*12+rnd()*4; c.strokeStyle='rgba(50,40,28,.13)'; c.lineWidth=1; c.beginPath(); c.moveTo(0,y); c.lineTo(S,y+rnd()*2); c.stroke(); }
  }
  if(type==='scorch'){
    for(let i=0;i<45;i++){ c.fillStyle='rgba(20,16,12,.25)'; c.beginPath(); c.arc(rnd()*S,rnd()*S,2+rnd()*10,0,Math.PI*2); c.fill(); }
  }
  c.strokeStyle='rgba(20,24,18,.22)'; c.lineWidth=3; c.strokeRect(1.5,1.5,S-3,S-3);
  const tex=new THREE.CanvasTexture(cv); tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(1,1); tex.anisotropy=4; tex.encoding=THREE.sRGBEncoding;
  texCache[key]=tex; return tex;
}

function bannerTexture(text, color, options={}){
  const key='banner_'+text+'_'+color;
  if(texCache[key]) return texCache[key];
  const W=256,H=384, cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  const c=cv.getContext('2d');
  c.clearRect(0,0,W,H);
  const g=c.createLinearGradient(0,0,W,H); g.addColorStop(0,shade(color,-18)); g.addColorStop(.45,color); g.addColorStop(1,shade(color,-34));
  c.fillStyle=g;
  // tattered banner shape
  c.beginPath(); c.moveTo(18,10); c.lineTo(238,10); c.lineTo(238,330); c.lineTo(196,350); c.lineTo(170,332); c.lineTo(132,360); c.lineTo(96,336); c.lineTo(58,356); c.lineTo(18,336); c.closePath(); c.fill();
  c.strokeStyle='rgba(231,200,132,.8)'; c.lineWidth=5; c.stroke();
  c.strokeStyle='rgba(0,0,0,.28)'; c.lineWidth=2; c.strokeRect(30,24,196,288);
  // vertical fibers
  for(let i=0;i<60;i++){ c.strokeStyle=`rgba(0,0,0,${.02+Math.random()*.05})`; c.beginPath(); c.moveTo(20+Math.random()*216,10); c.lineTo(20+Math.random()*216,344); c.stroke(); }
  c.fillStyle='rgba(248,232,196,.95)'; c.font='bold 138px "STKaiti","KaiTi",serif'; c.textAlign='center'; c.textBaseline='middle';
  c.shadowColor='rgba(0,0,0,.35)'; c.shadowBlur=8; c.shadowOffsetY=3;
  const chars=text.length>1?text.split(''):[text];
  if(chars.length===1){ c.fillText(chars[0],128,170); }
  else { c.font='bold 74px "STKaiti","KaiTi",serif'; chars.slice(0,2).forEach((ch,i)=>c.fillText(ch,128,118+i*90)); }
  c.shadowBlur=0;
  // emblem top
  c.strokeStyle='rgba(248,232,196,.5)'; c.lineWidth=2; c.beginPath(); c.arc(128,48,17,0,Math.PI*2); c.stroke();
  const tex=new THREE.CanvasTexture(cv); tex.anisotropy=4; tex.encoding=THREE.sRGBEncoding; texCache[key]=tex; return tex;
}

function cloudTexture(seed=1){
  const key='cloud_'+seed;
  if(texCache[key]) return texCache[key];
  const S=256, cv=document.createElement('canvas'); cv.width=S; cv.height=S; const c=cv.getContext('2d');
  const rnd=mulberry32(seed*977+3);
  for(let i=0;i<16;i++){
    const x=60+rnd()*136,y=90+rnd()*70,r=25+rnd()*55;
    const g=c.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,`rgba(240,238,225,${.13+rnd()*.12})`); g.addColorStop(.55,'rgba(225,228,215,.06)'); g.addColorStop(1,'rgba(220,225,215,0)');
    c.fillStyle=g; c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.fill();
  }
  const tex=new THREE.CanvasTexture(cv); tex.anisotropy=2; tex.encoding=THREE.sRGBEncoding; texCache[key]=tex; return tex;
}

function emberTexture(){
  if(texCache.ember) return texCache.ember;
  const S=64, cv=document.createElement('canvas'); cv.width=S; cv.height=S; const c=cv.getContext('2d');
  const g=c.createRadialGradient(32,32,0,32,32,30); g.addColorStop(0,'rgba(255,235,180,1)'); g.addColorStop(.25,'rgba(255,180,80,.9)'); g.addColorStop(.6,'rgba(220,90,30,.35)'); g.addColorStop(1,'rgba(200,50,10,0)');
  c.fillStyle=g; c.fillRect(0,0,S,S);
  const tex=new THREE.CanvasTexture(cv); texCache.ember=tex; return tex;
}

function smokeTexture(){
  if(texCache.smoke) return texCache.smoke;
  const S=128, cv=document.createElement('canvas'); cv.width=S; cv.height=S; const c=cv.getContext('2d');
  const g=c.createRadialGradient(64,64,4,64,64,60); g.addColorStop(0,'rgba(60,55,48,.55)'); g.addColorStop(.5,'rgba(40,38,34,.25)'); g.addColorStop(1,'rgba(20,20,18,0)');
  c.fillStyle=g; c.fillRect(0,0,S,S);
  const tex=new THREE.CanvasTexture(cv); texCache.smoke=tex; return tex;
}

function terrainTexture(type,seed){
  const src=window.AI_ASSETS&&window.AI_ASSETS.terrain&&window.AI_ASSETS.terrain[type];
  if(src&&!SETTINGS.liteMode){
    ART._terrainCache=ART._terrainCache||{};
    if(ART._terrainCache[type]) return ART._terrainCache[type];
    const tex=new THREE.TextureLoader().load(src);
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(1,1); tex.encoding=THREE.sRGBEncoding;
    ART._terrainCache[type]=tex; return tex;
  }
  return noiseTexture(type,seed);
}
function propTexture(name){
  const src=window.AI_ASSETS&&window.AI_ASSETS.props&&window.AI_ASSETS.props[name];
  if(!src||SETTINGS.liteMode) return null;
  ART._propCache=ART._propCache||{};
  if(ART._propCache[name]) return ART._propCache[name];
  const tex=new THREE.TextureLoader().load(src); tex.encoding=THREE.sRGBEncoding; ART._propCache[name]=tex; return tex;
}
function hasAITerrain(type){ return !SETTINGS.liteMode&&!!(window.AI_ASSETS&&window.AI_ASSETS.terrain&&window.AI_ASSETS.terrain[type]); }
return { portrait, drawPortrait, texture:terrainTexture, banner:bannerTexture, cloud:cloudTexture, ember:emberTexture, smoke:smokeTexture, propTexture, hasAITerrain, shade, rgba, hash, mulberry32 };
})();

/* 远景群山长卷（战阵背景） */
ART.panorama = function(seed=1){
  const key='panorama_'+seed;
  ART._panoCache=ART._panoCache||{};
  if(ART._panoCache[key]) return ART._panoCache[key];
  const W=2048,H=512, cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  const c=cv.getContext('2d'); const rnd=ART.mulberry32(seed*913+77);
  const layers=[
    {base:365, h:210, color:'rgba(58,79,68,.55)', alpha:.9, n:16},
    {base:420, h:250, color:'rgba(38,58,48,.8)', alpha:.95, n:13},
    {base:470, h:265, color:'rgba(20,36,29,.95)', alpha:1, n:10}
  ];
  layers.forEach((L,li)=>{
    c.save(); c.beginPath(); c.moveTo(0,H); c.lineTo(0,L.base);
    let x=0; const step=W/L.n;
    while(x<W+step){
      const peak=L.base - L.h*(.3+rnd()*.7)*(li===0?.7:1);
      c.quadraticCurveTo(x+step*.2,L.base-H*.05,x+step*.42,peak);
      c.quadraticCurveTo(x+step*.55,peak+(L.base-peak)*.35,x+step*.7,L.base-L.h*(.1+rnd()*.2));
      c.lineTo(x+step,L.base);
      x+=step;
    }
    c.lineTo(W,H); c.closePath();
    const g=c.createLinearGradient(0,L.base-L.h,0,H); g.addColorStop(0,L.color); g.addColorStop(1,'rgba(8,14,11,.2)');
    c.fillStyle=g; c.globalAlpha=L.alpha; c.fill(); c.restore();
  });
  for(let i=0;i<14;i++){
    const y=300+rnd()*180, x=rnd()*W, w=180+rnd()*420;
    const g=c.createRadialGradient(x,y,0,x,y,w); g.addColorStop(0,'rgba(188,201,186,.12)'); g.addColorStop(1,'rgba(188,201,186,0)');
    c.fillStyle=g; c.beginPath(); c.ellipse(x,y,w,w*.2,0,0,Math.PI*2); c.fill();
  }
  for(let i=0;i<900;i++){ c.fillStyle=`rgba(${rnd()>.5?'220,225,210':'0,0,0'},${.01+rnd()*.03})`; c.fillRect(rnd()*W,rnd()*H,1,1); }
  const tex=new THREE.CanvasTexture(cv); tex.encoding=THREE.sRGBEncoding; tex.wrapS=THREE.RepeatWrapping; tex.anisotropy=4;
  ART._panoCache[key]=tex; return tex;
};

/* 战阵远景绘景（相机背景板） */
ART.battleBackdrop = function(time, seed=1){
  if(!SETTINGS.liteMode&&window.AI_ASSETS&&window.AI_ASSETS.backdrops&&time&&time.id&&window.AI_ASSETS.backdrops[time.id]){
    const tex=new THREE.TextureLoader().load(window.AI_ASSETS.backdrops[time.id]); tex.encoding=THREE.sRGBEncoding; return tex;
  }
  const key='bback_'+seed+'_'+(time?time.top:'')+'_'+(time?time.horizon:'');
  ART._bbCache=ART._bbCache||{};
  if(ART._bbCache[key]) return ART._bbCache[key];
  const W=2048,H=900, cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  const c=cv.getContext('2d'); const rnd=ART.mulberry32(seed*61+9);
  const hx=n=>'#'+n.toString(16).padStart(6,'0');
  const top=time?hx(time.top):'#172827', hor=time?hx(time.horizon):'#96a795', fog=time?hx(time.fog):'#6e7f74';
  const sky=c.createLinearGradient(0,0,0,H*.78); sky.addColorStop(0,top); sky.addColorStop(.42,hor); sky.addColorStop(.72,'#b7c1ad'); sky.addColorStop(1,fog);
  c.fillStyle=sky; c.fillRect(0,0,W,H);
  // sun glow
  const sunX=W*.23, sunY=H*.28;
  const glow=c.createRadialGradient(sunX,sunY,0,sunX,sunY,W*.28); glow.addColorStop(0,'rgba(255,226,180,.55)'); glow.addColorStop(.18,'rgba(255,205,145,.22)'); glow.addColorStop(1,'rgba(255,200,140,0)');
  c.fillStyle=glow; c.fillRect(0,0,W,H);
  c.fillStyle='rgba(245,225,190,.55)'; c.beginPath(); c.arc(sunX,sunY,42,0,Math.PI*2); c.fill();
  // clouds
  for(let i=0;i<22;i++){
    const x=rnd()*W,y=H*(.12+rnd()*.36),w=90+rnd()*240,h=12+rnd()*34;
    const g=c.createRadialGradient(x,y,0,x,y,w); g.addColorStop(0,`rgba(232,235,220,${.04+rnd()*.08})`); g.addColorStop(1,'rgba(232,235,220,0)');
    c.fillStyle=g; c.beginPath(); c.ellipse(x,y,w,h,0,0,Math.PI*2); c.fill();
  }
  // far range
  function range(base,height,color,alpha,count,seed2){
    const rr=ART.mulberry32(seed2); c.save(); c.beginPath(); c.moveTo(0,H); c.lineTo(0,base);
    let x=0; const step=W/count;
    while(x<W+step){ const peak=base-height*(.3+rr()*.8); const mid=x+step*.5; c.quadraticCurveTo(x+step*.22,base-height*.15,mid,peak); c.quadraticCurveTo(mid+step*.2,peak+height*.4,x+step,base-height*.05); x+=step; }
    c.lineTo(W,H); c.closePath(); c.globalAlpha=alpha; c.fillStyle=color; c.fill(); c.restore();
  }
  range(H*.42,H*.26,'rgba(48,70,61,.55)',.75,14,31);
  range(H*.52,H*.27,'rgba(31,51,42,.82)',.9,11,57);
  range(H*.63,H*.26,'rgba(16,32,25,.94)',1,9,83);
  // mist bands
  for(let i=0;i<18;i++){ const x=rnd()*W,y=H*(.68+rnd()*.15),w=150+rnd()*340; const g=c.createRadialGradient(x,y,0,x,y,w); g.addColorStop(0,`rgba(176,192,178,${.05+rnd()*.08})`); g.addColorStop(1,'rgba(176,192,178,0)'); c.fillStyle=g; c.beginPath(); c.ellipse(x,y,w,w*.14,0,0,Math.PI*2); c.fill(); }
  // distant wall / watchtowers
  c.fillStyle='rgba(11,22,17,.9)';
  const wx=W*.62, wy=H*.62;
  for(let i=0;i<9;i++){ const x=wx+i*46, y=wy+Math.sin(i*.7)*10; c.fillRect(x,y-20,30,30); c.beginPath(); c.moveTo(x-7,y-20); c.lineTo(x+15,y-38); c.lineTo(x+37,y-20); c.closePath(); c.fill(); }
  c.fillRect(wx-20,wy+6,9*46+40,12);
  // birds
  c.strokeStyle='rgba(26,38,32,.55)'; c.lineWidth=2;
  for(let i=0;i<9;i++){ const x=W*.4+rnd()*W*.4,y=H*.18+rnd()*.18,s=5+rnd()*7; c.beginPath(); c.moveTo(x-s,y); c.quadraticCurveTo(x-s*.4,y-s*.45,x,y); c.quadraticCurveTo(x+s*.4,y-s*.45,x+s,y); c.stroke(); }
  // bottom fog blend
  const bf=c.createLinearGradient(0,H*.60,0,H); bf.addColorStop(0,'rgba(110,127,116,0)'); bf.addColorStop(.45,'rgba(110,127,116,.38)'); bf.addColorStop(1,'rgba(110,127,116,.96)');
  c.fillStyle=bf; c.fillRect(0,H*.59,W,H*.41);
  // grain
  for(let i=0;i<2600;i++){ c.fillStyle=`rgba(${rnd()>.5?'240,238,220':'0,0,0'},${.008+rnd()*.025})`; c.fillRect(rnd()*W,rnd()*H,1,1); }
  const tex=new THREE.CanvasTexture(cv); tex.encoding=THREE.sRGBEncoding; tex.anisotropy=4; ART._bbCache[key]=tex; return tex;
};

/* 月轮 */
ART.moon = function(){
  if(ART._moonTex) return ART._moonTex;
  const S=256, cv=document.createElement('canvas'); cv.width=S; cv.height=S; const c=cv.getContext('2d');
  const g=c.createRadialGradient(128,128,20,128,128,120);
  g.addColorStop(0,'rgba(255,247,224,1)'); g.addColorStop(.28,'rgba(245,231,198,.95)'); g.addColorStop(.58,'rgba(223,202,158,.45)'); g.addColorStop(.82,'rgba(210,185,135,.12)'); g.addColorStop(1,'rgba(200,175,120,0)');
  c.fillStyle=g; c.beginPath(); c.arc(128,128,124,0,Math.PI*2); c.fill();
  // lunar mottling
  c.globalAlpha=.08; c.fillStyle='#7b6b4a';
  for(let i=0;i<26;i++){ const r=8+Math.random()*26; c.beginPath(); c.arc(60+Math.random()*136,60+Math.random()*136,r,0,Math.PI*2); c.fill(); }
  const tex=new THREE.CanvasTexture(cv); tex.encoding=THREE.sRGBEncoding; ART._moonTex=tex; return tex;
};

/* 战阵单位立绘（2.5D 手绘风精灵） */
ART.unitSprite = function(u){
  if(!SETTINGS.liteMode&&window.AI_ASSETS&&window.AI_ASSETS.units&&window.AI_ASSETS.units[u.defId]){
    ART._unitTexCache=ART._unitTexCache||{};
    if(ART._unitTexCache[u.defId]) return ART._unitTexCache[u.defId];
    const tex=new THREE.TextureLoader().load(window.AI_ASSETS.units[u.defId]); tex.encoding=THREE.sRGBEncoding; ART._unitTexCache[u.defId]=tex; return tex;
  }
  const key='us_'+u.faction+'_'+u.cls+'_'+u.defId+'_'+(u.side||'');
  ART._unitCache=ART._unitCache||{};
  if(ART._unitCache[key]) return ART._unitCache[key];
  const W=512,H=640, cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  const c=cv.getContext('2d'); const rnd=ART.mulberry32(ART.hash(key));
  const fac=DATA.FACTIONS[u.faction]||{color:'#5b7d5c',colorHex:0x5b7d5c,short:'军'};
  const base=fac.color||'#5b7d5c';
  const accentMap={guanyu:'#3f8a5a',zhangfei:'#333a37',zhaoyun:'#e0e0d3',zhugeliang:'#e9e4d3',liubei:'#4f9a6d',lvbu:'#b04430',caocao:'#405f8c',huangzhong:'#c8a24e',machao:'#e6e2d4',zhouyu:'#b85a40',huanggai:'#b45a42'};
  const accent=accentMap[u.defId]||base;
  const skin=u.defId==='guanyu'?'#b96b50':u.defId==='zhangfei'?'#bd7f5e':'#d3a47e';
  const hair=u.defId==='huangzhong'?'#d8d1c0':u.defId==='zhaoyun'?'#2b2118':'#1d1712';
  const isCav=u.cls==='cavalry';
  const weaponMap={guanyu:'guandao',zhangfei:'serpent',zhaoyun:'spear',lvbu:'halberd',huangzhong:'bow',zhugeliang:'fan',machao:'spear',zhouyu:'sword',huanggai:'sword',xiahouyuan:'bow'};
  const weapon=weaponMap[u.defId]||(u.cls==='archer'?'bow':u.cls==='strategist'?'fan':u.cls==='spear'?'spear':'sword');
  const char=(u.name||'军').slice(0,1);
  const hex2css=n=>'#'+n.toString(16).padStart(6,'0');
  const rgbs=(hex,a)=>{const h=hex.replace('#','');const n=parseInt(h.length===3?h.split('').map(x=>x+x).join(''):h,16);return `rgba(${n>>16},${(n>>8)&255},${n&255},${a})`;};
  const shade=(hex,amt)=>ART.shade(hex,amt);
  function grad(x1,y1,x2,y2,stops){ const g=c.createLinearGradient(x1,y1,x2,y2); stops.forEach(([p,col])=>g.addColorStop(p,col)); return g; }
  function poly(pts,fill,stroke,lw){ c.beginPath(); pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); c.closePath(); if(fill){c.fillStyle=fill;c.fill();} if(stroke){c.strokeStyle=stroke;c.lineWidth=lw||2;c.stroke();} }
  function blob(x,y,rx,ry,fill,alpha){ c.save();c.globalAlpha=alpha==null?1:alpha;c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();c.restore(); }
  // aura / ink wash
  const aura=c.createRadialGradient(256,430,20,256,430,230); aura.addColorStop(0,rgbs(base,.22)); aura.addColorStop(.5,rgbs(base,.07)); aura.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=aura; c.fillRect(0,0,W,H);
  // ground ink
  blob(256,596,160,18,'rgba(8,12,9,.55)',.55);
  for(let i=0;i<12;i++){ blob(130+rnd()*260,580+rnd()*30,4+rnd()*22,1+rnd()*4,'rgba(10,14,11,.22)',.5); }
  // banner
  function drawBanner(x,y,scale,text,col){
    c.save(); c.translate(x,y); c.scale(scale,scale);
    c.strokeStyle='rgba(28,22,15,.9)'; c.lineWidth=4; c.beginPath(); c.moveTo(0,0); c.lineTo(0,-250); c.stroke();
    c.fillStyle=shade(col,-30); c.beginPath(); c.moveTo(2,-242); c.lineTo(78,-232); c.lineTo(72,-150); c.lineTo(80,-130); c.lineTo(4,-120); c.closePath(); c.fill();
    c.strokeStyle='rgba(231,200,132,.7)'; c.lineWidth=3; c.stroke();
    c.fillStyle='rgba(247,235,205,.95)'; c.font='bold 50px "STKaiti","KaiTi",serif'; c.textAlign='center'; c.textBaseline='middle'; c.fillText(text,38,-184);
    c.fillStyle=rgbs(base,.55); c.beginPath(); c.arc(38,-255,8,0,Math.PI*2); c.fill();
    c.restore();
  }
  // warrior
  function drawWarrior(cx,by,s,opt={}){
    const leader=opt.leader!==false;
    const col=opt.color||accent;
    const armor=opt.armor||'#3d4039';
    const skinC=opt.skin||skin, hairC=opt.hair||hair;
    c.save(); c.translate(cx,by); c.scale(s,s);
    // cape / cloak behind
    if(leader||opt.cape){
      const capeCol=opt.capeCol||shade(col,-35);
      c.beginPath(); c.moveTo(-38,-250); c.quadraticCurveTo(-120,-170,-88,-22); c.quadraticCurveTo(-45,-40,-20,-12); c.quadraticCurveTo(-2,-70,8,-250); c.closePath();
      c.fillStyle=grad(-80,-250,30,-20,[[0,shade(capeCol,22)],[.55,capeCol],[1,shade(capeCol,-30)]]); c.fill();
      c.strokeStyle='rgba(12,14,11,.5)'; c.lineWidth=3; c.stroke();
      // cloth folds
      c.strokeStyle=rgbs('#000',.18); c.lineWidth=2;
      for(let i=0;i<4;i++){ c.beginPath(); c.moveTo(-60+i*12,-200); c.quadraticCurveTo(-90+i*10,-100,-58+i*12,-35); c.stroke(); }
    }
    // legs / greaves
    const legCol=shade(armor,-8);
    c.fillStyle=legCol; c.strokeStyle='rgba(10,12,9,.6)'; c.lineWidth=2.5;
    c.beginPath(); c.moveTo(-30,-120); c.lineTo(-8,-120); c.lineTo(-14,-18); c.lineTo(-36,-18); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(10,-120); c.lineTo(32,-120); c.lineTo(40,-18); c.lineTo(18,-18); c.closePath(); c.fill(); c.stroke();
    // boots
    c.fillStyle='#24241f'; c.fillRect(-42,-22,32,16); c.fillRect(16,-22,34,16);
    // skirt armor plates
    c.fillStyle=grad(-40,-200,40,-110,[[0,shade(col,10)],[1,shade(col,-28)]]);
    c.beginPath(); c.moveTo(-42,-190); c.lineTo(42,-190); c.lineTo(56,-102); c.lineTo(0,-88); c.lineTo(-56,-102); c.closePath(); c.fill(); c.strokeStyle='rgba(12,14,11,.45)'; c.stroke();
    for(let i=0;i<5;i++){ c.strokeStyle=rgbs('#000',.22); c.beginPath(); c.moveTo(-48+i*22,-185); c.lineTo(-42+i*20,-100); c.stroke(); }
    // torso
    const chest=grad(-50,-310,50,-190,[[0,shade(col,25)],[.45,col],[1,shade(col,-35)]]);
    c.beginPath(); c.moveTo(-42,-310); c.quadraticCurveTo(-56,-270,-50,-205); c.lineTo(-40,-188); c.lineTo(40,-188); c.lineTo(50,-205); c.quadraticCurveTo(56,-270,42,-310); c.closePath();
    c.fillStyle=chest; c.fill(); c.strokeStyle='rgba(10,12,9,.65)'; c.lineWidth=3; c.stroke();
    // armor chest plate
    c.fillStyle=grad(-40,-300,40,-200,[[0,shade(armor,38)],[.55,armor],[1,shade(armor,-30)]]);
    c.beginPath(); c.moveTo(-36,-300); c.lineTo(36,-300); c.lineTo(44,-218); c.lineTo(0,-198); c.lineTo(-44,-218); c.closePath(); c.fill();
    c.strokeStyle=rgbs('#000',.35); c.lineWidth=2; c.stroke();
    for(let i=0;i<5;i++){ c.strokeStyle=rgbs('#000',.2); c.beginPath(); c.moveTo(-38,-292+i*18); c.quadraticCurveTo(0,-284+i*18,38,-292+i*18); c.stroke(); }
    // belt / sash
    c.fillStyle=shade(col,-18); c.fillRect(-44,-208,88,16);
    c.fillStyle='rgba(201,164,95,.8)'; c.fillRect(-42,-205,84,4);
    // shoulder guards
    [-1,1].forEach(side=>{
      c.save(); c.translate(side*48,-294); c.scale(side,1);
      c.fillStyle=grad(-8,-20,40,40,[[0,shade(armor,45)],[1,shade(armor,-20)]]);
      c.beginPath(); c.moveTo(0,-16); c.quadraticCurveTo(44,-14,52,18); c.quadraticCurveTo(34,40,4,30); c.closePath(); c.fill();
      c.strokeStyle='rgba(10,12,9,.6)'; c.lineWidth=2.5; c.stroke();
      c.fillStyle='rgba(201,164,95,.85)'; c.beginPath(); c.arc(26,8,4,0,Math.PI*2); c.fill();
      c.restore();
    });
    // neck
    c.fillStyle=shade(skinC,-18); c.fillRect(-16,-332,32,28);
    // head
    c.save(); c.translate(0,-370);
    c.fillStyle=hair; c.beginPath(); c.ellipse(0,0,36,44,0,0,Math.PI*2); c.fill();
    c.save(); c.globalAlpha=.28; c.fillStyle='#20140c'; c.beginPath(); c.ellipse(0,-34,30,12,0,0,Math.PI*2); c.fill(); c.restore();
    c.fillStyle=grad(-30,-30,30,30,[[0,shade(skinC,16)],[1,shade(skinC,-20)]]);
    c.beginPath(); c.moveTo(-26,-18); c.quadraticCurveTo(-28,-40,0,-42); c.quadraticCurveTo(28,-40,26,-18); c.quadraticCurveTo(30,18,16,30); c.quadraticCurveTo(0,40,-16,30); c.quadraticCurveTo(-30,18,-26,-18); c.fill();
    c.strokeStyle='rgba(20,12,8,.55)'; c.lineWidth=2; c.stroke();
    // eyes / brows
    const eyeY=-8;
    // eye sockets / shadow
    c.save(); c.globalAlpha=.22; c.fillStyle='#3a1b10'; c.beginPath(); c.ellipse(-14,-13,10,7,0,0,Math.PI*2); c.fill(); c.beginPath(); c.ellipse(14,-13,10,7,0,0,Math.PI*2); c.fill(); c.restore();
    c.strokeStyle='#1d1008'; c.lineWidth=3.6; c.lineCap='round';
    c.beginPath(); c.moveTo(-24,-19); c.lineTo(-6,-15); c.stroke(); c.beginPath(); c.moveTo(24,-19); c.lineTo(6,-15); c.stroke();
    c.fillStyle='rgba(240,227,204,.72)'; c.beginPath(); c.ellipse(-14,eyeY,5.8,2.4,0,0,Math.PI*2); c.fill(); c.beginPath(); c.ellipse(14,eyeY,5.8,2.4,0,0,Math.PI*2); c.fill();
    c.fillStyle='#160d07'; c.beginPath(); c.arc(-13,eyeY,2.9,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(15,eyeY,2.9,0,Math.PI*2); c.fill();
    c.strokeStyle='rgba(40,18,10,.55)'; c.lineWidth=1.5; c.beginPath(); c.moveTo(-20,eyeY+4); c.quadraticCurveTo(-14,eyeY+6,-8,eyeY+4); c.stroke(); c.beginPath(); c.moveTo(8,eyeY+4); c.quadraticCurveTo(14,eyeY+6,20,eyeY+4); c.stroke();
    // nose / mouth
    c.strokeStyle='rgba(100,50,30,.55)'; c.lineWidth=2; c.beginPath(); c.moveTo(0,-4); c.lineTo(-2,9); c.lineTo(4,11); c.stroke();
    c.strokeStyle='#4a1d13'; c.lineWidth=2.4; c.beginPath(); c.moveTo(-10,23); c.quadraticCurveTo(0,19,10,23); c.stroke();
    c.strokeStyle='rgba(255,220,190,.28)'; c.lineWidth=1.2; c.beginPath(); c.moveTo(-8,25); c.quadraticCurveTo(0,23,8,25); c.stroke();
    // beard
    if(opt.beard==='long'){ c.fillStyle=hairC; c.beginPath(); c.moveTo(-14,18); c.quadraticCurveTo(-18,55,-6,86); c.quadraticCurveTo(0,100,6,86); c.quadraticCurveTo(18,55,14,18); c.quadraticCurveTo(0,30,-14,18); c.fill(); }
    else if(opt.beard==='bushy'){ c.fillStyle=hairC; c.beginPath(); c.ellipse(0,40,24,30,0,0,Math.PI); c.fill(); }
    else if(opt.beard==='short'){ c.fillStyle=hairC; c.beginPath(); c.ellipse(0,35,17,13,0,0,Math.PI); c.fill(); }
    // moustache
    if(opt.beard!=='none'){ c.fillStyle=hairC; c.beginPath(); c.moveTo(-16,15); c.quadraticCurveTo(-4,8,0,18); c.quadraticCurveTo(4,8,16,15); c.quadraticCurveTo(4,22,0,21); c.quadraticCurveTo(-4,22,-16,15); c.fill(); }
    // helmet
    const headStyle=opt.head||'helmet';
    if(headStyle==='guan'){
      c.fillStyle=shade(col,-4); c.beginPath(); c.moveTo(-34,-28); c.quadraticCurveTo(-32,-62,0,-66); c.quadraticCurveTo(32,-62,34,-28); c.quadraticCurveTo(0,-40,-34,-28); c.fill();
      c.strokeStyle='rgba(10,12,9,.45)'; c.lineWidth=2; c.stroke();
      c.fillStyle=shade(col,-22); c.beginPath(); c.ellipse(0,-60,12,8,0,0,Math.PI*2); c.fill();
    } else if(headStyle==='feather'){
      c.fillStyle=grad(-30,-30,30,-70,[[0,'#d9ba62'],[1,'#8f6a2f']]); c.beginPath(); c.moveTo(-32,-28); c.quadraticCurveTo(-28,-60,0,-66); c.quadraticCurveTo(28,-60,32,-28); c.quadraticCurveTo(0,-40,-32,-28); c.fill();
      c.strokeStyle='#e6d29c'; c.lineWidth=4; c.beginPath(); c.moveTo(-14,-62); c.bezierCurveTo(-45,-120,-80,-130,-95,-105); c.stroke(); c.beginPath(); c.moveTo(14,-62); c.bezierCurveTo(45,-120,80,-130,95,-105); c.stroke();
    } else if(headStyle==='scarf'){
      c.fillStyle='#e7e1d1'; c.beginPath(); c.moveTo(-34,-28); c.quadraticCurveTo(-32,-60,0,-64); c.quadraticCurveTo(32,-60,34,-28); c.quadraticCurveTo(0,-40,-34,-28); c.fill();
      c.fillStyle='#d2ccba'; c.beginPath(); c.moveTo(-32,-40); c.quadraticCurveTo(-58,-50,-68,-34); c.quadraticCurveTo(-44,-28,-30,-30); c.fill(); c.beginPath(); c.moveTo(32,-40); c.quadraticCurveTo(58,-50,68,-34); c.quadraticCurveTo(44,-28,30,-30); c.fill();
    } else if(headStyle==='yellowband'){
      c.fillStyle='#c2a13f'; c.fillRect(-32,-30,64,13); c.fillStyle='#c2a13f'; c.beginPath(); c.moveTo(-32,-28); c.quadraticCurveTo(-54,-20,-60,8); c.lineTo(-48,10); c.quadraticCurveTo(-42,-10,-30,-16); c.fill();
      c.fillStyle='#2a241b'; c.beginPath(); c.ellipse(0,-50,28,16,0,Math.PI,Math.PI*2); c.fill();
    } else if(headStyle==='crown'){
      c.fillStyle='#1b1a17'; c.beginPath(); c.moveTo(-34,-30); c.quadraticCurveTo(-30,-60,0,-64); c.quadraticCurveTo(30,-60,34,-30); c.quadraticCurveTo(0,-40,-34,-30); c.fill();
      c.fillStyle='rgba(201,164,95,.9)'; c.fillRect(-34,-38,68,7);
    } else {
      const hg=grad(-34,-30,34,-70,[[0,shade(armor,55)],[.5,shade(armor,18)],[1,shade(armor,-30)]]);
      c.fillStyle=hg; c.beginPath(); c.moveTo(-34,-28); c.quadraticCurveTo(-34,-64,0,-70); c.quadraticCurveTo(34,-64,34,-28); c.quadraticCurveTo(0,-42,-34,-28); c.fill();
      c.strokeStyle='rgba(10,12,9,.55)'; c.lineWidth=2.5; c.stroke();
      c.fillStyle=shade(armor,-20); c.fillRect(-35,-36,70,10);
      c.fillStyle=opt.plume||'#8e3a2d'; c.beginPath(); c.moveTo(-5,-68); c.quadraticCurveTo(-8,-100,0,-118); c.quadraticCurveTo(8,-100,5,-68); c.fill();
    }
    c.restore();
    // arms
    c.strokeStyle=shade(col,-18); c.lineWidth=15; c.lineCap='round';
    c.beginPath(); c.moveTo(-40,-280); c.quadraticCurveTo(-66,-238,-52,-200); c.stroke();
    c.beginPath(); c.moveTo(42,-280); c.quadraticCurveTo(66,-250,58,-218); c.stroke();
    c.fillStyle=skinC; c.beginPath(); c.arc(-52,-198,8,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(58,-216,8,0,Math.PI*2); c.fill();
    // weapon
    drawWeapon(c, weapon, 60,-250, col);
    c.restore();
  }
  function drawWeapon(c,type,x,y,col){
    c.save(); c.translate(x,y);
    const wood='#4a3824', metal='#c9cec4', gold='#c9a45f';
    if(type==='guandao'||type==='halberd'){
      c.strokeStyle=wood; c.lineWidth=7; c.beginPath(); c.moveTo(-10,120); c.lineTo(6,-160); c.stroke();
      c.fillStyle=metal; c.beginPath(); c.moveTo(4,-158); c.quadraticCurveTo(60,-150,72,-92); c.quadraticCurveTo(32,-96,8,-104); c.closePath(); c.fill();
      c.strokeStyle='rgba(20,24,20,.5)'; c.lineWidth=2; c.stroke();
      c.fillStyle=gold; c.beginPath(); c.arc(6,-154,7,0,Math.PI*2); c.fill();
      c.strokeStyle='#8a2f27'; c.lineWidth=4; c.beginPath(); c.moveTo(2,-140); c.lineTo(-20,-118); c.stroke();
    } else if(type==='spear'||type==='serpent'){
      c.strokeStyle=wood; c.lineWidth=6; c.beginPath(); c.moveTo(-14,150); c.lineTo(8,-185); c.stroke();
      c.fillStyle=metal; c.beginPath(); c.moveTo(8,-185); c.lineTo(14,-238); c.lineTo(22,-185); c.closePath(); c.fill();
      c.fillStyle='#a7352b'; c.beginPath(); c.moveTo(8,-180); c.lineTo(-14,-158); c.lineTo(-4,-146); c.closePath(); c.fill();
      if(type==='serpent'){ c.strokeStyle=metal; c.lineWidth=3; c.beginPath(); c.moveTo(10,-230); c.quadraticCurveTo(32,-210,12,-192); c.stroke(); }
    } else if(type==='bow'){
      c.strokeStyle='#6a4d2f'; c.lineWidth=6; c.beginPath(); c.arc(-18,0,120,-1.25,1.25); c.stroke();
      c.strokeStyle='rgba(230,220,190,.75)'; c.lineWidth=1.5; c.beginPath(); c.moveTo(-18-44,-114); c.lineTo(-18-44,114); c.stroke();
      c.fillStyle=metal; c.beginPath(); c.moveTo(-54,-6); c.lineTo(-108,-1); c.lineTo(-54,4); c.closePath(); c.fill();
    } else if(type==='fan'){
      c.strokeStyle='#3c2e1d'; c.lineWidth=5; c.beginPath(); c.moveTo(-18,150); c.lineTo(6,-10); c.stroke();
      c.fillStyle='rgba(238,232,214,.95)'; c.beginPath(); c.moveTo(6,-10); c.arc(6,-10,86,-2.4,-.6); c.closePath(); c.fill();
      c.strokeStyle='rgba(120,100,70,.4)'; c.lineWidth=1.5; for(let i=0;i<6;i++){ c.beginPath(); c.moveTo(6,-10); c.lineTo(6+Math.cos(-2.35+i*.3)*84,-10+Math.sin(-2.35+i*.3)*84); c.stroke(); }
    } else {
      c.strokeStyle=metal; c.lineWidth=8; c.beginPath(); c.moveTo(0,120); c.lineTo(8,-120); c.stroke();
      c.fillStyle=gold; c.fillRect(-16,-24,32,8);
      c.fillStyle=metal; c.beginPath(); c.moveTo(2,-120); c.lineTo(12,-180); c.lineTo(18,-120); c.closePath(); c.fill();
      // shield
      c.fillStyle=shade(col,-8); c.beginPath(); c.ellipse(-52,20,34,50,-.12,0,Math.PI*2); c.fill();
      c.strokeStyle='rgba(201,164,95,.65)'; c.lineWidth=3; c.stroke();
      c.fillStyle=gold; c.beginPath(); c.arc(-52,20,8,0,Math.PI*2); c.fill();
    }
    c.restore();
  }
  // banner behind
  drawBanner(414,596,1.0,char,base);
  // retainers (behind, muted)
  c.save(); c.globalAlpha=.62;
  drawWarrior(154,590,.72,{leader:false,cape:false,color:shade(base,-24),armor:'#32352f',head:'helmet',beard:'none',weapon:'spear'});
  drawWarrior(368,590,.66,{leader:false,cape:false,color:shade(base,-32),armor:'#2d302b',head:'helmet',beard:'none',weapon:'spear'});
  c.restore();
  // leader
  if(isCav){
    // mounted leader silhouette: horse to the side, not under the feet
    c.save(); c.globalAlpha=.55; c.translate(374,566);
    const horseCol={guanyu:'#6e332a',zhaoyun:'#c9c5b8',machao:'#c9c3b5',lvbu:'#7c3026'}[u.defId]||'#5a4130';
    c.fillStyle=shade(horseCol,-25); c.beginPath(); c.ellipse(0,0,54,24,0,0,Math.PI*2); c.fill();
    c.fillStyle=horseCol; c.beginPath(); c.moveTo(30,-12); c.quadraticCurveTo(58,-54,76,-30); c.lineTo(60,-4); c.quadraticCurveTo(44,2,30,8); c.fill();
    c.strokeStyle=shade(horseCol,-35); c.lineWidth=6; c.lineCap='round';
    [[-28,12],[28,12]].forEach(([x,y])=>{ c.beginPath(); c.moveTo(x,y); c.lineTo(x-7,y+38); c.stroke(); });
    c.fillStyle='#201812'; c.beginPath(); c.moveTo(-50,-4); c.quadraticCurveTo(-76,8,-82,30); c.quadraticCurveTo(-64,18,-50,12); c.fill();
    c.restore();
    drawWarrior(250,596,1.12,{leader:true,cape:true,capeCol:shade(base,-30),color:accent,armor:'#3d4039',head:u.defId==='guanyu'?'guan':u.defId==='lvbu'?'feather':'helmet',beard:u.defId==='guanyu'?'long':'short',weapon});
  } else {
    drawWarrior(256,596,1.12,{leader:true,cape:true,capeCol:shade(base,-30),color:accent,armor:'#3d4039',head:u.defId==='guanyu'?'guan':u.defId==='zhugeliang'?'scarf':u.defId==='lvbu'?'feather':u.defId==='liubei'?'crown':'helmet',beard:u.defId==='guanyu'?'long':u.defId==='zhangfei'?'bushy':u.defId==='huangzhong'?'long':'short',weapon});
  }
  // rim light strokes
  c.save(); c.globalAlpha=.18; c.strokeStyle='#f4dfb2'; c.lineWidth=4;
  c.beginPath(); c.moveTo(220,520); c.quadraticCurveTo(180,400,214,280); c.stroke();
  c.restore();
  // embers/dust
  for(let i=0;i<16;i++){ c.fillStyle=`rgba(220,200,160,${.08+rnd()*.18})`; c.beginPath(); c.arc(150+rnd()*220,520+rnd()*70,1+rnd()*2,0,Math.PI*2); c.fill(); }
  const tex=new THREE.CanvasTexture(cv); tex.encoding=THREE.sRGBEncoding; tex.anisotropy=4;
  ART._unitCache[key]=tex; return tex;
};

ART.itemIcon = function(id){ return (window.AI_ASSETS&&window.AI_ASSETS.items&&window.AI_ASSETS.items[id])||null; };
ART.buildingIcon = function(id){ return (window.AI_ASSETS&&window.AI_ASSETS.buildings&&window.AI_ASSETS.buildings[id])||null; };

ART.skillIcon = function(id){ return (window.AI_ASSETS&&window.AI_ASSETS.skills&&window.AI_ASSETS.skills[id])||null; };
ART.achIcon = function(id){ return (window.AI_ASSETS&&window.AI_ASSETS.achievements&&window.AI_ASSETS.achievements[id])||null; };
ART.techIcon = function(id){ return (window.AI_ASSETS&&window.AI_ASSETS.techs&&window.AI_ASSETS.techs[id])||null; };

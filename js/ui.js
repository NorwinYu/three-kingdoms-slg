/* ============================================================
   烽火三国 · 界面
   屏幕 / 弹窗 / 章回演出 / 武将 / 科技 / 外交 / 商肆 / 图鉴 / 存档
   ============================================================ */
const UI = (() => {
'use strict';
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iconOf = id => DATA.GENERALS[id]?.name?.slice(0,1) || '将';
const className = id => DATA.CLASSES[DATA.GENERALS[id]?.class]?.name || '步兵';
let modalOpts=null, storyState=null, modalStack=[];

function init(){
  document.addEventListener('pointerdown', ()=>{ AUDIO.init(); AUDIO.resume(); if(AUDIO.ready && !AUDIO.mode) AUDIO.startMusic('menu'); }, {once:true});
  $$('.menu-btn').forEach(b=>b.addEventListener('click',()=>{ AUDIO.init(); AUDIO.sfx('click'); onMenu(b.dataset.action); }));
  document.addEventListener('pointerdown', e=>{
    const b=e.target.closest('button,.menu-btn,.tab,.filter-chip,.building,.general-card,.item-card,.tech-node,.codex-tab');
    if(b && !b.disabled && !b.dataset.silent) setTimeout(()=>AUDIO.sfx('ui'), 10);
  });
  document.addEventListener('keydown', e=>{
    if(storyState){
      if(e.key==='Escape'){ e.preventDefault(); storySkip(); }
      else if(e.key===' '||e.key==='Enter'){ e.preventDefault(); storyAdvance(); }
      return;
    }
    if(e.key==='Escape' && modalOpts && !modalOpts.persistent){ e.preventDefault(); closeModal(); }
  });
  updateMenu();
}

function updateMenu(){
  const btn=$('.menu-btn[data-action="continue"]');
  if(btn) btn.classList.toggle('disabled', !latestSaveSlot());
  const d=$('#menuDate'); if(d) d.textContent = GS ? CORE.dateLabel() : '中平元年 · 184年';
}
function latestSaveSlot(){
  let best=null,bestTime=0;
  ['auto','1','2','3'].forEach(s=>{ const info=CORE.slotInfo(s); if(info){ const raw=localStorage.getItem(SAVE_PREFIX+s); try{ const t=JSON.parse(raw).lastSave||0; if(t>bestTime){bestTime=t;best=s;} }catch(e){} } });
  return best;
}

function showScreen(id){
  $$('.screen').forEach(s=>s.classList.toggle('active', s.id==='screen-'+id));
  document.dispatchEvent(new CustomEvent('screen:changed',{detail:id}));
}
function transition(fn, ms=420){
  const v=$('#transitionVeil'); if(!v){ fn&&fn(); return; }
  v.classList.add('show');
  setTimeout(()=>{ try{ fn&&fn(); }finally{ setTimeout(()=>v.classList.remove('show'), 80); } }, ms);
}

/* ---------------- Toast ---------------- */
function toast(title, text='', type='', ms=3200){
  const root=$('#toastRoot'); if(!root) return;
  const el=document.createElement('div'); el.className='toast '+type;
  el.innerHTML=`<div class="toast-title">${esc(title)}</div>${text?`<div class="toast-text">${esc(text)}</div>`:''}`;
  root.appendChild(el);
  setTimeout(()=>{ el.classList.add('out'); setTimeout(()=>el.remove(),380); },ms);
}
function achievement(a){
  if(!a) return;
  toast('成就达成 · '+(a.name||'未知'), a.desc||'', 'good', 4200);
  AUDIO.sfx('levelup');
}

/* ---------------- Modal ---------------- */
function openModal(opts){
  modalOpts=opts;
  $('#modalRoot').classList.add('open');
  paintModal();
}
function paintModal(){
  if(!modalOpts) return;
  const o=modalOpts;
  const r=o.render? o.render() : { body:o.body||'', footer:o.footer||'' };
  if(r.title===undefined) r.title=o.title;
  if(r.kicker===undefined) r.kicker=o.kicker;
  if(r.sub===undefined) r.sub=o.sub;
  const root=$('#modalRoot');
  root.innerHTML=`<div class="modal-backdrop"><div class="modal ${o.wide?'wide':''} ${o.narrow?'narrow':''}">
    <div class="modal-head">
      ${r.kicker?`<div class="modal-kicker">${esc(r.kicker)}</div>`:''}
      ${r.title?`<h2 class="modal-title">${r.title}</h2>`:''}
      ${r.sub?`<div class="modal-sub">${r.sub}</div>`:''}
      ${o.hideClose?'':'<button class="modal-close" data-close>✕</button>'}
    </div>
    <div class="modal-body">${r.body}</div>
    ${r.footer?`<div class="modal-foot">${r.footer}</div>`:''}
  </div></div>`;
  $$('[data-close]',root).forEach(b=>b.addEventListener('click',closeModal));
  const back=$('.modal-backdrop',root); back.addEventListener('mousedown',e=>{ if(e.target===back && !o.persistent) closeModal(); });
  if(o.onMount) o.onMount(root);
  // tab handling
  $$('.tab',root).forEach(t=>t.addEventListener('click',()=>{
    const pane=t.dataset.tab;
    $$('.tab',root).forEach(x=>x.classList.toggle('active',x===t));
    $$('.tab-pane',root).forEach(p=>p.classList.toggle('active',p.dataset.pane===pane));
  }));
}
function refreshModal(){ if(modalOpts) paintModal(); }
function closeModal(){
  const o=modalOpts;
  modalOpts=null; $('#modalRoot').classList.remove('open'); $('#modalRoot').innerHTML='';
  if(o&&o.onClose) o.onClose();
}
function confirm(title,text,onYes,yes='确认',no='取消',onNo=null){
  let resolved=false;
  openModal({ narrow:true, persistent:true, title, render:()=>({ body:`<div style="font-size:12px;line-height:1.9;color:#c8bda5;padding:6px 0 10px">${text}</div>`,
    footer:`<button class="mbtn" data-no>${no}</button><button class="mbtn primary" data-yes>${yes}</button>` }),
    onMount:root=>{
      $('[data-yes]',root).addEventListener('click',()=>{ resolved=true; closeModal(); onYes&&onYes(); });
      $('[data-no]',root).addEventListener('click',()=>{ resolved=true; closeModal(); onNo&&onNo(); });
    }, onClose:()=>{ if(!resolved) onNo&&onNo(); } });
}

/* ---------------- Menu ---------------- */
function onMenu(action){
  if(action==='continue'){
    const slot=latestSaveSlot();
    if(!slot){ toast('尚无存档','请先开始新的征程。','bad'); return; }
    if(window.GAME) GAME.loadFromSlot(slot);
  } else if(action==='new'){
    openNewGame();
  } else if(action==='codex'){
    openCodex(true);
  } else if(action==='settings'){
    openSettings();
  } else if(action==='credits'){
    openCredits();
  }
}
function openNewGame(){
  let diff='normal';
  openModal({ narrow:true, kicker:'乱世将启', title:'选择难度', persistent:false,
    render:()=>({ body:`
      <div style="display:flex;flex-direction:column;gap:8px;margin:4px 0 14px">
        ${Object.values(DATA.DIFFICULTY).map(d=>`<button class="diff-opt ${d.id===diff?'active':''}" data-diff="${d.id}" style="text-align:left;padding:12px 14px;border:1px solid ${d.id===diff?'var(--gold)':'rgba(201,164,95,.18)'};background:${d.id===diff?'rgba(201,164,95,.09)':'rgba(255,255,255,.012)'};transition:.2s">
          <div style="display:flex;align-items:center;gap:10px"><span style="font-family:var(--font-kai);font-size:20px;color:${d.color}">${d.name}</span><span style="font-size:8px;letter-spacing:.2em;color:var(--muted)">${d.en}</span></div>
          <div style="font-size:9px;line-height:1.7;color:var(--muted);margin-top:4px">${d.desc}</div>
        </button>`).join('')}
      </div>
      <div style="font-size:9px;line-height:1.8;color:var(--muted);border-left:2px solid rgba(167,53,43,.5);padding-left:10px">你将扮演刘备，从涿郡桃园起兵，历经虎牢关、博望坡、长坂坡、赤壁，最终决战定军山。所有系统即刻开放。</div>`,
      footer:`<button class="mbtn" data-close>再想想</button><button class="mbtn primary" data-start>桃园结义 · 起兵</button>` }),
    onMount:root=>{
      $$('[data-diff]',root).forEach(b=>b.addEventListener('click',()=>{ diff=b.dataset.diff; paintModal(); }));
      $('[data-start]',root).addEventListener('click',()=>{ closeModal(); if(window.GAME) GAME.startNew(diff); });
    } });
}

/* ---------------- Story ---------------- */
function playStory(chapter, phase, done){
  if(!chapter){ done&&done(); return; }
  const scenes=phase==='pre'?chapter.pre:chapter.post;
  if(!scenes || !scenes.length){ done&&done(); return; }
  const root=$('#storyRoot'); root.classList.add('open');
  root.innerHTML=`<div class="story-stage">
    <video class="story-video" id="storyVideo" muted autoplay loop playsinline preload="auto"></video>
    <div class="story-art" id="storyArt"></div>
    <div class="story-sun"></div>
    <div class="story-mountains"></div>
    <div class="story-petals" id="storyPetals"></div>
    <div class="story-chapter-mark" id="storyMark"><div class="scm-no">${esc(chapter.no||'')}</div><div class="scm-title">${esc(chapter.title||'')}</div><div class="scm-sub">${esc(chapter.subtitle||'')}</div></div>
    <div class="story-portrait left" id="storyLeft"></div>
    <div class="story-portrait right" id="storyRight"></div>
    <button class="story-skip" id="storySkip">跳 过 ▸</button>
    <div class="story-dialogue">
      <div class="story-name-row" id="storyNameRow"><div class="story-name" id="storyName"></div><div class="story-name-sub" id="storyNameSub"></div></div>
      <div class="story-text-box"><div class="story-text" id="storyText"></div><div class="story-next">点击继续 <span style="opacity:.6">▸</span></div></div>
    </div>
  </div>`;
  const art=$('#storyArt');
  const artKey={ch0:'dawn',ch1:'dusk',ch2:'day',ch3:'storm',ch4:'fire',ch5:'day'}[chapter.id]||'dusk';
  const artSrc=window.AI_ASSETS&&AI_ASSETS.backdrops&&(AI_ASSETS.backdrops[artKey]||AI_ASSETS.backdrops.dusk);
  const vid=$('#storyVideo');
  const vidSrc=window.AI_ASSETS&&AI_ASSETS.videos&&AI_ASSETS.videos[artKey];
  const showStatic=()=>{ if(vid){ vid.classList.remove('show'); vid.removeAttribute('src'); } if(art&&artSrc){ art.style.backgroundImage=`url('${artSrc}')`; art.classList.add('show'); } };
  if(vid&&vidSrc&&window.innerWidth>900&&!SETTINGS.liteMode){ vid.src=vidSrc; vid.classList.add('show'); if(art) art.classList.remove('show'); vid.onerror=showStatic; const pr=vid.play(); if(pr&&pr.catch) pr.catch(showStatic); }
  else showStatic();
  const petals=$('#storyPetals');
  for(let i=0;i<16;i++){ const p=document.createElement('div'); p.className='petal'; p.style.cssText=`left:${Math.random()*100}%;top:${-10-Math.random()*30}%;animation-duration:${8+Math.random()*10}s;animation-delay:${-Math.random()*12}s;opacity:${.3+Math.random()*.5};transform:scale(${.6+Math.random()*.9})`; petals.appendChild(p); }
  const left=$('#storyLeft'), right=$('#storyRight'), nameEl=$('#storyName'), subEl=$('#storyNameSub'), textEl=$('#storyText'), nameRow=$('#storyNameRow');
  const mark=$('#storyMark');
  setTimeout(()=>mark.classList.add('show'),100);
  setTimeout(()=>mark.classList.remove('show'),2600);
  let idx=0, typing=false, timer=null, finished=false;
  const state={ idx:0, typing:false };
  function setSpeaker(sc){
    if(sc.narration || !sc.speaker){
      left.classList.remove('show'); right.classList.remove('show');
      nameRow.style.visibility='hidden';
      textEl.classList.add('narration');
      return;
    }
    const g=DATA.GENERALS[sc.speaker]||DATA.MOOKS[sc.speaker]||{name:sc.speaker};
    const side=sc.side==='right'?'right':'left';
    const target=side==='left'?left:right, other=side==='left'?right:left;
    target.innerHTML=`<img src="${ART.portrait(sc.speaker)}" alt="${esc(g.name)}">`;
    target.classList.add('show'); target.classList.remove('dim');
    if(other.classList.contains('show')) other.classList.add('dim');
    nameRow.style.visibility='visible';
    nameEl.textContent=g.name||''; subEl.textContent=g.courtesy||g.title||'';
    textEl.classList.remove('narration');
  }
  function typeText(text){
    typing=true; textEl.textContent='';
    let i=0; clearInterval(timer);
    timer=setInterval(()=>{
      const step=text[i]==='。'||text[i]==='，'||text[i]==='！'||text[i]==='？'?1:2;
      i+=step; textEl.textContent=text.slice(0,Math.min(i,text.length));
      if(i>=text.length){ clearInterval(timer); typing=false; }
    },26);
    state.typing=()=>typing;
    state.reveal=()=>{ clearInterval(timer); typing=false; textEl.textContent=text; };
  }
  function show(i){
    if(i>=scenes.length){ finish(); return; }
    idx=i; const sc=scenes[i];
    setSpeaker(sc);
    if(sc.chapterMark){ mark.querySelector('.scm-title').textContent=sc.chapterMark; mark.classList.add('show'); setTimeout(()=>mark.classList.remove('show'),2000); }
    typeText(sc.text||'');
    AUDIO.sfx('ui');
  }
  function finish(){
    const sv=$('#storyVideo'); if(sv){ sv.pause(); sv.classList.remove('show'); }
    if(finished) return; finished=true;
    clearInterval(timer);
    root.classList.remove('open');
    setTimeout(()=>{ root.innerHTML=''; }, 400);
    storyState=null;
    AUDIO.sfx('gong');
    done&&done();
  }
  function advance(){
    if(!root.classList.contains('open')) return;
    if(typing){ state.reveal(); return; }
    if(idx<scenes.length-1){ show(idx+1); }
    else { finish(); }
  }
  function skip(){ finish(); }
  storyState={advance, skip};
  const stage=$('.story-stage',root);
  stage.addEventListener('click',advance);
  $('#storySkip',root).addEventListener('click',e=>{ e.stopPropagation(); skip(); });
  show(0);
}
function storyAdvance(){ storyState&&storyState.advance(); }
function storySkip(){ storyState&&storyState.skip(); }

/* ---------------- Roster ---------------- */
function openRoster(genId){
  if(!GS){ toast('尚无征程','请先开始游戏。','bad'); return; }
  if(genId) return openGeneralDetail(genId);
  let filter='all';
  const build=()=>{
    const list=CORE.playerGenerals().filter(g=>filter==='all'||DATA.GENERALS[g.id].class===filter);
    return {
      kicker:'麾下群英', title:'武将名册', sub:`共 ${GS.roster.length} 位武将 · 等级与装备将直接影响战场`,
      body:`<div class="roster-toolbar"><div class="roster-filters">
        ${[['all','全部'],['infantry','步兵'],['cavalry','骑兵'],['archer','弓兵'],['spear','枪兵'],['strategist','军师'],['commander','指挥']].map(([k,n])=>`<button class="filter-chip ${filter===k?'active':''}" data-filter="${k}">${n}</button>`).join('')}
        </div><div style="font-size:9px;color:var(--muted)">点击武将查看详情与装备</div></div>
        <div class="roster-grid">${list.map(g=>{
          const d=DATA.GENERALS[g.id], s=CORE.genStats(g), lv=g.level;
          return `<button class="general-card" data-gen="${g.id}">
            <div class="gc-art"><img src="${ART.portrait(g.id)}" loading="lazy"><span class="gc-lv">Lv.${lv}</span><span class="gc-rarity r${d.rarity}">${['','凡','良','珍','绝'][d.rarity]}</span></div>
            <div class="gc-body"><div class="gc-name">${esc(d.name)} <small>${esc(d.courtesy||'')}</small></div><div class="gc-title">${esc(d.title||'')}</div>
              <div class="gc-stats"><span>武 <b>${s.might}</b></span><span>统 <b>${s.lead}</b></span><span>智 <b>${s.int}</b></span></div>
              <div class="gc-bars"><div class="gc-bar-row"><span>兵</span><div class="gc-bar"><i style="width:${Math.min(100,s.hp/12)}%"></i></div></div><div class="gc-bar-row"><span>忠</span><div class="gc-bar"><i style="width:${g.loyalty}%;background:rgba(79,139,107,.65)"></i></div></div></div>
            </div><span class="gc-class">${className(g.id)}</span><span class="gc-status">${CORE.rankName(lv)}</span></button>`;
        }).join('')}</div>`,
      footer:`<button class="mbtn" data-close>关闭</button>`
    };
  };
  openModal({ wide:true, render:build, onMount:root=>{
    $$('[data-filter]',root).forEach(b=>b.addEventListener('click',()=>{ filter=b.dataset.filter; refreshModal(); }));
    $$('[data-gen]',root).forEach(b=>b.addEventListener('click',()=>openGeneralDetail(b.dataset.gen)));
  }});
}
function openGeneralDetail(id){
  const g=GS.generals[id], d=DATA.GENERALS[id]; if(!g||!d) return;
  const s=CORE.genStats(g), need=CORE.expNeed(g.level);
  const slotNames={weapon:'兵器',armor:'防具',horse:'坐骑',treasure:'宝物'};
  const slotChars={weapon:'刀',armor:'甲',horse:'马',treasure:'书'};
  const skillHtml=(d.skills||[]).map(sid=>{ const sk=DATA.SKILLS[sid]; const ic=ART.skillIcon(sid); return sk?`<div class="skill-item"><div class="skill-icon">${ic?`<img src="${ic}">`:esc(sk.icon)}</div><div><div class="skill-name">${esc(sk.name)} <em>士气 ${sk.cost}</em></div><div class="skill-desc">${esc(sk.desc)}</div></div></div>`:''; }).join('');
  const equipHtml=['weapon','armor','horse','treasure'].map(slot=>{
    const iid=g.equip[slot], it=DATA.ITEMS[iid];
    return `<button class="equip-slot" data-slot="${slot}"><span class="es-icon">${iid&&ART.itemIcon(iid)?`<img src="${ART.itemIcon(iid)}">`:slotChars[slot]}</span><span><span class="es-name">${it?esc(it.name):'<span class="es-empty">未装备</span>'}</span><span class="es-type">${slotNames[slot]}${it?` · ${['','凡','良','珍','绝'][it.rarity]}`:''}</span></span></button>`;
  }).join('');
  const setHtml=(()=>{ const sets=CORE.equipSets(g); if(!sets.length) return ''; return `<div class="set-list">${sets.map(x=>`<span class="set-chip ${x.active?'active':''}" title="${x.active?x.active.desc:''}">${x.set.name} ${x.count}/${Math.max(...Object.keys(x.set).filter(k=>/^\d+$/.test(k)).map(Number))}${x.active?' · '+x.active.desc:(x.next?` · 再集 ${x.next-x.count} 件`: '')}</span>`).join('')}</div>`; })();
  const statBar=(label,val,max=100)=>`<div class="stat-line"><span>${label}</span><div class="stat-meter"><i style="width:${Math.min(100,val/max*100)}%"></i></div><b>${val}</b></div>`;
  openModal({ wide:true, render:()=>({
    kicker:`${d.faction?DATA.FACTIONS[d.faction]?.name:'群雄'} · ${className(id)}`,
    title:`${d.name} <span style="font-size:13px;color:var(--muted);letter-spacing:.1em">字 ${d.courtesy||'—'}</span>`,
    body:`<div class="general-detail">
      <div><div class="gd-art"><img src="${ART.portrait(id)}"><div class="gd-seal">${esc(d.title||'武将')}</div></div>
        <div class="loyalty"><span>忠诚</span><div class="loyalty-bar"><i style="width:${g.loyalty}%"></i></div><span>${g.loyalty}</span></div>
        <div style="display:flex;gap:6px;margin-top:10px"><button class="city-btn" style="flex:1" data-gift>赏赐 · 500金</button></div></div>
      <div>
        <div class="gd-name">${esc(d.name)}</div><div class="gd-title">${esc(d.title||'')} · ${esc(CORE.rankName(g.level))} · Lv.${g.level}</div>
        <div class="gd-quote">${esc(d.quote||'')}</div>
        <div class="gd-bio">${esc(d.bio||'')}</div>
        <div class="detail-subhead">五维</div>
        <div class="stat-grid">${statBar('武力',s.might)}${statBar('统率',s.lead)}${statBar('智力',s.int)}${statBar('政治',s.pol)}${statBar('魅力',s.charm)}${statBar('机敏',Math.round(s.speed*5))}</div>
        <div class="detail-subhead">战法</div><div class="skill-list">${skillHtml}</div>
        <div class="detail-subhead">装备</div><div class="equip-grid">${equipHtml}</div>${setHtml}
        <div style="font-size:9px;color:var(--muted);margin-top:10px">经验 ${g.exp} / ${need}　·　攻击 ${s.atk}　防御 ${s.def}　兵力 ${s.hp}</div>
      </div></div>`,
    footer:`<button class="mbtn" data-back>返回名册</button><button class="mbtn primary" data-close>关闭</button>`
  }), onMount:root=>{
    $('[data-back]',root)?.addEventListener('click',()=>openRoster());
    $('[data-gift]',root)?.addEventListener('click',()=>{ const r=CORE.giftGeneral(id); toast(r.ok?'赏赐':'无法赏赐',r.msg,r.ok?'good':'bad'); refreshModal(); });
    $$('[data-slot]',root).forEach(b=>b.addEventListener('click',()=>openEquipPicker(id,b.dataset.slot)));
  }});
}
function openEquipPicker(genId, slot){
  const g=GS.generals[genId];
  const owned=Object.keys(GS.inventory).filter(iid=>DATA.ITEMS[iid]?.type===slot && GS.inventory[iid]>0);
  const label={weapon:'兵器',armor:'防具',horse:'坐骑',treasure:'宝物'}[slot];
  openModal({ narrow:true, title:`选择${label}`, kicker:'更换装备',
    render:()=>({ body:`<div style="display:flex;flex-direction:column;gap:6px">
      ${g.equip[slot]?`<button class="item-card" data-unequip style="text-align:left"><div class="item-name">卸下当前装备</div><div class="item-desc">${esc(DATA.ITEMS[g.equip[slot]].name)}</div></button>`:''}
      ${owned.length?owned.map(iid=>{ const it=DATA.ITEMS[iid]; return `<button class="item-card" data-item="${iid}" style="text-align:left"><span class="item-owned">库存 ${GS.inventory[iid]}</span><div class="item-name">${ART.itemIcon(iid)?`<img class="ip-icon" src="${ART.itemIcon(iid)}">`:''}${esc(it.name)}</div><div class="item-type">${label} · ${['','凡','良','珍','绝'][it.rarity]}</div><div class="item-desc">${esc(it.desc)}</div><div class="item-stats">${Object.entries(it.stats).map(([k,v])=>`<span class="item-stat">${({atk:'攻击',def:'防御',hp:'兵力',int:'智力',speed:'速度',move:'移动',crit:'暴击',counter:'反击',skill:'战法',heal:'治疗',rage:'士气'})[k]||k} +${v}</span>`).join('')}</div></button>`; }).join(''):'<div style="font-size:10px;color:var(--muted);text-align:center;padding:18px">库中暂无可用装备，可前往商肆购买或战场缴获。</div>'}
      </div>`, footer:`<button class="mbtn" data-close>返回</button>` }),
    onMount:root=>{
      $$('[data-item]',root).forEach(b=>b.addEventListener('click',()=>{ const r=CORE.equipItem(genId,b.dataset.item); toast('装备',r.msg,r.ok?'good':'bad'); openGeneralDetail(genId); }));
      $('[data-unequip]',root)?.addEventListener('click',()=>{ CORE.unequipItem(genId,slot); openGeneralDetail(genId); });
    }});
}

/* ---------------- Tech ---------------- */
function openTech(){
  if(!GS) return;
  openModal({ wide:true, kicker:'强国之术', title:'科技', sub:'研究兵法、农政、工造，永久强化全军',
    render:()=>({ body:`<div class="tech-head"><div class="tech-points">${Math.floor(GS.techPoints)} <small>科技点</small></div><div style="font-size:9px;color:var(--muted)">书院每回合产出科技点 · 点击节点研究</div></div>
      <div class="tech-branches">${Object.values(DATA.TECHS).map(b=>`<div class="tech-branch"><div class="tb-title"><i>${b.icon}</i>${b.name}</div><div class="tb-sub">${b.sub}</div>
        ${b.nodes.map(n=>{ const done=CORE.hasTech(n.id), can=CORE.canResearch(n.id), locked=!done&&!(can.ok||(!n.req||n.req.every(r=>CORE.hasTech(r)))); return `<div class="tech-node ${done?'done':''} ${locked?'locked':''}" data-tech="${n.id}">
          <div class="tn-top">${ART.techIcon(n.id)?`<img class="tn-icon" src="${ART.techIcon(n.id)}">`:''}<span class="tn-name">${n.name}</span><span class="tn-cost">${done?'已成':n.cost+' 点'}</span></div>
          <div class="tn-desc">${n.desc}</div>
          <div class="tn-state">${done?'✓ 已研究':(can.ok?'可研究':can.msg)}</div></div>`; }).join('')}
      </div>`).join('')}</div>`, footer:`<button class="mbtn" data-close>关闭</button>` }),
    onMount:root=>{ $$('[data-tech]',root).forEach(n=>n.addEventListener('click',()=>{ const r=CORE.research(n.dataset.tech); if(r.ok){ toast('科技研究',r.msg,'good'); AUDIO.sfx('levelup'); refreshModal(); } else toast('无法研究',r.msg,'bad'); })); }});
}

/* ---------------- Diplomacy ---------------- */
function openDiplomacy(){
  if(!GS) return;
  const factions=Object.keys(DATA.FACTIONS).filter(f=>f!=='shu');
  openModal({ wide:true, kicker:'纵横捭阖', title:'外交', sub:'远交近攻，唇齿相依。关系低于 30 时，对方更可能兴兵来犯。',
    render:()=>({ body:`<div class="diplo-list">${factions.map(f=>{
      const rel=CORE.relation(f), alive=CORE.ownerHasCities(f), allied=CORE.isAllied(f), fac=DATA.FACTIONS[f];
      return `<div class="diplo-row"><div class="diplo-seal" style="color:${fac.color};border-color:${fac.color}66">${fac.short.slice(0,1)}</div>
        <div><div class="diplo-name">${fac.name}</div><div class="diplo-status">${alive? (allied?`盟约 · 剩余 ${CORE.allianceTurns(f)} 回合`:'邦交正常') : '已灭亡'} · 关系 ${rel}</div></div>
        <div class="rel-wrap"><div class="rel-bar"><i style="width:${rel}%"></i><span class="rel-mark"></span></div><span class="rel-val">${rel}</span></div>
        <div class="diplo-actions">${alive?`<button class="diplo-btn" data-gift="${f}">赠礼</button><button class="diplo-btn" data-ally="${f}" ${allied||rel<70?'disabled':''}>${allied?'已盟':'结盟'}</button><button class="diplo-btn" data-truce="${f}">停战</button>`:'<span style="font-size:9px;color:var(--muted)">—</span>'}</div></div>`;
    }).join('')}</div>
    <div class="diplo-note">赠礼：耗 300 金，关系 +12　·　结盟：关系 ≥ 70，耗 500 金，12 回合内互不侵犯　·　停战：耗 500 粮，关系 +15<br>进攻盟友的城池会使盟约立即破裂，并大幅降低关系。</div>`,
    footer:`<button class="mbtn" data-close>关闭</button>` }),
    onMount:root=>{
      $$('[data-gift]',root).forEach(b=>b.addEventListener('click',()=>{ const r=CORE.giftFaction(b.dataset.gift); toast('外交',r.msg,r.ok?'good':'bad'); refreshModal(); }));
      $$('[data-ally]',root).forEach(b=>b.addEventListener('click',()=>{ const r=CORE.makeAlliance(b.dataset.ally); toast('外交',r.msg,r.ok?'good':'bad'); refreshModal(); }));
      $$('[data-truce]',root).forEach(b=>b.addEventListener('click',()=>{ const r=CORE.truce(b.dataset.truce); toast('停战',r.msg,r.ok?'good':'bad'); refreshModal(); }));
    }});
}

/* ---------------- Shop ---------------- */
let shopCache={turn:-1,items:[]};
function shopItems(){
  if(shopCache.turn===GS.turn) return shopCache.items;
  const keys=Object.keys(DATA.ITEMS);
  const start=(GS.turn*7+GS.chapter*3)%keys.length;
  const items=[]; for(let i=0;i<6;i++) items.push(keys[(start+i*5)%keys.length]);
  shopCache={turn:GS.turn,items}; return items;
}
function openShop(){
  if(!GS) return;
  const stock=shopItems();
  openModal({ wide:true, kicker:'市列珠玑', title:'商肆', sub:'购置神兵良马，武装麾下群英。每回合货品轮换。',
    render:()=>({ body:`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div class="shop-gold">府库 <b>${CORE.fmt(GS.gold)}</b> 金</div><div style="font-size:9px;color:var(--muted)">库存装备可在武将详情中穿戴</div></div>
      <div class="shop-grid">${stock.map(iid=>{ const it=DATA.ITEMS[iid], owned=CORE.itemCount(iid), can=GS.gold>=it.price;
        return `<div class="item-card"><span class="item-rar">${['','凡','良','珍','绝'][it.rarity]}</span>${owned?`<span class="item-owned">持有 ${owned}</span>`:''}
          <div class="item-icon">${ART.itemIcon(iid)?`<img src="${ART.itemIcon(iid)}">`:it.icon}</div><div class="item-name">${it.name}</div><div class="item-type">${({weapon:'兵器',armor:'防具',horse:'坐骑',treasure:'宝物'})[it.type]}${(()=>{const s=Object.values(DATA.SETS||{}).find(x=>x.items.includes(iid));return s?` · <em class="set-tag">${s.name}</em>`:''})()}</div>
          <div class="item-desc">${it.desc}</div><div class="item-stats">${Object.entries(it.stats).map(([k,v])=>`<span class="item-stat">${({atk:'攻击',def:'防御',hp:'兵力',int:'智力',speed:'速度',move:'移动',crit:'暴击',counter:'反击',skill:'战法',heal:'治疗',rage:'士气'})[k]||k} +${v}</span>`).join('')}</div>
          <button class="item-buy" data-buy="${iid}" ${can?'':'disabled'}>${can?`购入 · ${it.price} 金`:'金不足'}</button></div>`; }).join('')}</div>`,
      footer:`<button class="mbtn" data-close>离开商肆</button>` }),
    onMount:root=>{ $$('[data-buy]',root).forEach(b=>b.addEventListener('click',()=>{ const it=DATA.ITEMS[b.dataset.buy]; if(GS.gold<it.price){toast('金不足','囊中羞涩。','bad');return;} GS.gold-=it.price; CORE.addItem(b.dataset.buy,1); AUDIO.sfx('coin'); toast('购得',it.name,'good'); refreshModal(); })); }});
}

/* ---------------- Tavern ---------------- */
function openTavern(){
  if(!GS) return;
  openModal({ narrow:true, kicker:'千金买骨', title:'招贤馆', sub:'声望与诚意，可换来豪杰效命',
    render:()=>({ body:`<div style="display:flex;flex-direction:column;gap:8px">${CORE.recruitCandidates().map(r=>{
      const d=DATA.GENERALS[r.id]; if(!d) return '';
      const disabled=r.owned||r.locked||!r.canFame||!r.canGold;
      return `<div class="deploy-card" style="display:flex;gap:10px;align-items:center;padding:8px;${disabled?'opacity:.55':''}"><img src="${ART.portrait(r.id)}" style="width:62px;height:76px;object-fit:cover;object-position:top"><div style="flex:1"><div style="font-family:var(--font-kai);font-size:18px;color:var(--paper)">${d.name} <small style="font-size:9px;color:var(--gold)">${d.title||''}</small></div><div style="font-size:9px;color:var(--muted);line-height:1.6;margin-top:3px">${r.desc}</div><div style="font-size:8px;color:${disabled?'#c97866':'var(--jade-2)'};margin-top:4px">${r.owned?'已在麾下':r.locked?`需推进至第 ${r.chapter+1} 章回`:!r.canFame?`声望不足（需 ${r.fame}）`:!r.canGold?`金不足（需 ${r.gold}）`:`可招揽 · ${r.gold} 金 · ${r.fame} 声望`}</div></div><button class="mbtn" data-recruit="${r.id}" ${disabled?'disabled':''} style="padding:7px 10px;font-size:12px">${r.owned?'已得':'招揽'}</button></div>`;
    }).join('')}</div><div style="font-size:9px;color:var(--muted);line-height:1.7;margin-top:12px">招贤消耗金与声望；武将加入后可在武将名册中查看装备与战法。</div>`,
    footer:`<button class="mbtn" data-close>关闭</button>` }),
    onMount:root=>{ $$('[data-recruit]',root).forEach(b=>b.addEventListener('click',()=>{ const res=CORE.recruitGeneral(b.dataset.recruit); toast(res.ok?'招贤':'未能招揽',res.msg,res.ok?'good':'bad'); if(res.ok) AUDIO.sfx('levelup'); refreshModal(); updateHUD(); })); }});
}

/* ---------------- Codex ---------------- */
function openCodex(menuMode=false){
  let tab='heroes';
  const unlockedLore = l => menuMode || !GS || GS.chapterDone.includes(DATA.CHAPTERS[l.needChapter]?.id) || GS.chapter>l.needChapter;
  const build=()=>{
    let body='';
    if(tab==='heroes'){
      const ids=Object.keys(DATA.GENERALS);
      body=`<div class="codex-heroes">${ids.map(id=>{ const d=DATA.GENERALS[id]; const has=GS?GS.roster.includes(id):true;
        return `<button class="codex-hero ${has?'':'locked'}" data-hero="${id}"><img src="${ART.portrait(id)}" loading="lazy"><div class="ch-name">${d.name}</div><div class="ch-faction">${DATA.FACTIONS[d.faction]?.name||''}</div></button>`; }).join('')}</div>`;
    } else if(tab==='lore'){
      body=`<div class="lore-list">${DATA.LORE.map((l,i)=>{ const ok=unlockedLore(l); return `<button class="lore-card" data-lore="${l.id}" style="${ok?'':'opacity:.4'}"><div class="lc-no">${l.no} · ${l.meta}</div><h3>${l.title}${ok?'':' · 未解锁'}</h3><p>${ok?l.quote:'继续推进章回以解锁这段三国往事。'}</p></button>`; }).join('')}</div>`;
    } else if(tab==='items'){
      body=`<div class="shop-grid">${Object.entries(DATA.ITEMS).map(([iid,it])=>`<div class="item-card"><span class="item-rar">${['','凡','良','珍','绝'][it.rarity]}</span><div class="item-icon">${ART.itemIcon(iid)?`<img src="${ART.itemIcon(iid)}">`:it.icon}</div><div class="item-name">${it.name}</div><div class="item-type">${({weapon:'兵器',armor:'防具',horse:'坐骑',treasure:'宝物'})[it.type]}${(()=>{const s=Object.values(DATA.SETS||{}).find(x=>x.items.includes(iid));return s?` · <em class="set-tag">${s.name}</em>`:''})()}</div><div class="item-desc">${it.desc}</div><div class="item-stats">${Object.entries(it.stats).map(([k,v])=>`<span class="item-stat">${({atk:'攻击',def:'防御',hp:'兵力',int:'智力',speed:'速度',move:'移动',crit:'暴击',counter:'反击',skill:'战法',heal:'治疗',rage:'士气'})[k]||k} +${v}</span>`).join('')}</div></div>`).join('')}</div>`;
    } else if(tab==='achievements'){
      body=`<div class="ach-grid">${Object.values(DATA.ACHIEVEMENTS).map(a=>{ const un=GS&&GS.achievements[a.id]; return `<div class="ach-card ${un?'unlocked':''}"><div class="ach-icon">${ART.achIcon(a.id)?`<img src="${ART.achIcon(a.id)}">`:a.icon}</div><div><div class="ach-name">${a.name}</div><div class="ach-desc">${a.desc}</div></div></div>`; }).join('')}</div>`;
    }
    return { kicker:'博古通今', title:'三国图鉴', sub:'人物、典故、神兵与成就',
      body:`<div class="codex-layout"><div class="codex-nav">
        <button class="codex-tab ${tab==='heroes'?'active':''}" data-ct="heroes">人物</button>
        <button class="codex-tab ${tab==='lore'?'active':''}" data-ct="lore">典故</button>
        <button class="codex-tab ${tab==='items'?'active':''}" data-ct="items">神兵</button>
        <button class="codex-tab ${tab==='achievements'?'active':''}" data-ct="achievements">成就</button>
      </div><div class="codex-content">${body}</div></div>`,
      footer:`<button class="mbtn" data-close>关闭</button>` };
  };
  openModal({ wide:true, render:build, onMount:root=>{
    $$('[data-ct]',root).forEach(b=>b.addEventListener('click',()=>{ tab=b.dataset.ct; refreshModal(); }));
    $$('[data-hero]',root).forEach(b=>b.addEventListener('click',()=>{ const id=b.dataset.hero,d=DATA.GENERALS[id]; UI.openModal({ wide:true, kicker:DATA.FACTIONS[d.faction]?.name||'群雄', title:d.name+' · 字 '+(d.courtesy||'—'), body:`<div class="general-detail"><div><div class="gd-art"><img src="${ART.portrait(id)}"></div><div class="gd-seal">${d.title||''}</div></div><div><div class="gd-quote">${d.quote||''}</div><div class="gd-bio">${d.bio||''}</div><div class="detail-subhead">五维</div><div class="stat-grid">${['might','lead','int','pol','charm'].map((k,i)=>{const names=['武力','统率','智力','政治','魅力'];return `<div class="stat-line"><span>${names[i]}</span><div class="stat-meter"><i style="width:${d.base[k]}%"></i></div><b>${d.base[k]}</b></div>`}).join('')}</div><div class="detail-subhead">战法</div><div class="skill-list">${(d.skills||[]).map(sid=>{const sk=DATA.SKILLS[sid];return sk?`<div class="skill-item"><div class="skill-icon">${sk.icon}</div><div><div class="skill-name">${sk.name}</div><div class="skill-desc">${sk.desc}</div></div></div>`:''}).join('')}</div></div></div>`, footer:`<button class="mbtn" data-close>关闭</button>` }); }));
    $$('[data-lore]',root).forEach(b=>b.addEventListener('click',()=>{ const l=DATA.LORE.find(x=>x.id===b.dataset.lore); if(!unlockedLore(l)){ toast('尚未解锁','推进章回以解锁。','bad'); return; } openLore(l); }));
  }});
}
function openLore(l){
  openModal({ wide:true, kicker:'三国典故', title:l.title, sub:`${l.no} · ${l.meta}`,
    render:()=>({ body:`<article class="lore-article"><div class="la-meta">${l.meta}</div><p class="la-quote">${l.quote}</p><p>${l.text}</p></article>`,
      footer:`<button class="mbtn" data-close>关闭</button>` }) });
}

/* ---------------- Settings / Help / Credits ---------------- */
function openSettings(){
  openModal({ narrow:true, kicker:'偏好', title:'设置', sub:'所有更改即时生效并自动保存',
    render:()=>({ body:`
      <div class="setting-row"><div><div class="setting-label">音乐音量</div><div class="setting-desc">程序化古风配乐</div></div><div class="setting-control range-input"><input type="range" min="0" max="100" value="${Math.round(SETTINGS.music*100)}" data-set="music"><span class="setting-val">${Math.round(SETTINGS.music*100)}</span></div></div>
      <div class="setting-row"><div><div class="setting-label">音效音量</div><div class="setting-desc">刀剑、战鼓与界面音</div></div><div class="setting-control range-input"><input type="range" min="0" max="100" value="${Math.round(SETTINGS.sfx*100)}" data-set="sfx"><span class="setting-val">${Math.round(SETTINGS.sfx*100)}</span></div></div>
      <div class="setting-row"><div><div class="setting-label">画质</div><div class="setting-desc">影响阴影、粒子与分辨率</div></div><div class="setting-control"><div class="seg" data-set="quality"><button data-q="low" class="${SETTINGS.quality==='low'?'active':''}">流畅</button><button data-q="medium" class="${SETTINGS.quality==='medium'?'active':''}">均衡</button><button data-q="high" class="${SETTINGS.quality==='high'?'active':''}">极佳</button></div></div></div>
      <div class="setting-row"><div><div class="setting-label">战斗演出速度</div><div class="setting-desc">影响移动与技能动画</div></div><div class="setting-control"><div class="seg" data-set="speed"><button data-s="1" class="${SETTINGS.speed==1?'active':''}">标准</button><button data-s="2" class="${SETTINGS.speed==2?'active':''}">快速</button></div></div></div>
      <div class="setting-row"><div><div class="setting-label">镜头震动</div><div class="setting-desc">战法命中时的镜头反馈</div></div><div class="setting-control"><div class="seg" data-set="shake"><button data-b="1" class="${SETTINGS.shake?'active':''}">开启</button><button data-b="0" class="${!SETTINGS.shake?'active':''}">关闭</button></div></div></div>
      <div class="setting-row"><div><div class="setting-label">伤害数字</div><div class="setting-desc">显示战斗浮动数值</div></div><div class="setting-control"><div class="seg" data-set="dmg"><button data-b="1" class="${SETTINGS.damageNumbers?'active':''}">显示</button><button data-b="0" class="${!SETTINGS.damageNumbers?'active':''}">隐藏</button></div></div></div>
      <div class="setting-row"><div><div class="setting-label">减少动态效果</div><div class="setting-desc">关闭镜头晃动、开场镜头与横幅动画</div></div><div class="setting-control"><div class="seg" data-set="motion"><button data-b="1" class="${SETTINGS.reduceMotion?'active':''}">开启</button><button data-b="0" class="${!SETTINGS.reduceMotion?'active':''}">关闭</button></div></div></div>
      <div class="setting-row"><div><div class="setting-label">高对比度</div><div class="setting-desc">增强文字、边框与战场可读性</div></div><div class="setting-control"><div class="seg" data-set="contrast"><button data-b="1" class="${SETTINGS.highContrast?'active':''}">开启</button><button data-b="0" class="${!SETTINGS.highContrast?'active':''}">关闭</button></div></div></div>
      <div class="setting-row"><div><div class="setting-label">精简模式</div><div class="setting-desc">关闭视频、生成式单位/背景，降低显存；下一场生效</div></div><div class="setting-control"><div class="seg" data-set="lite"><button data-b="1" class="${SETTINGS.liteMode?'active':''}">开启</button><button data-b="0" class="${!SETTINGS.liteMode?'active':''}">关闭</button></div></div></div>
      <div style="font-size:9px;line-height:1.7;color:var(--muted);margin-top:14px">本作无需联网。按 Esc 可暂停或关闭弹窗。战斗中无法存档。</div>`,
      footer:`<button class="mbtn" data-close>完成</button>` }),
    onMount:root=>{
      $$('[data-set="music"],[data-set="sfx"]',root).forEach(inp=>inp.addEventListener('input',()=>{ SETTINGS[inp.dataset.set]=inp.value/100; inp.nextElementSibling.textContent=inp.value; CORE.saveSettings(); AUDIO.init(); AUDIO.setVolumes(SETTINGS.music,SETTINGS.sfx); }));
      $$('[data-q]',root).forEach(b=>b.addEventListener('click',()=>{ SETTINGS.quality=b.dataset.q; CORE.saveSettings(); paintModal(); if(window.MENU) MENU.applyQuality(); if(window.BATTLE) BATTLE.applyQuality(); }));
      $$('[data-s]',root).forEach(b=>b.addEventListener('click',()=>{ SETTINGS.speed=Number(b.dataset.s); CORE.saveSettings(); paintModal(); }));
      $$('[data-b]',root).forEach(b=>b.addEventListener('click',()=>{ const kind=b.closest('.seg').dataset.set; const val=b.dataset.b==='1'; if(kind==='shake') SETTINGS.shake=val; else if(kind==='damage') SETTINGS.damageNumbers=val; else if(kind==='motion') SETTINGS.reduceMotion=val; else if(kind==='contrast') SETTINGS.highContrast=val; else if(kind==='lite') SETTINGS.liteMode=val; CORE.saveSettings(); CORE.applySettings(); paintModal(); }));
    }});
}
function openHelp(){
  openModal({ wide:true, kicker:'军略要览', title:'军略', sub:'战旗、内政、外交与养成',
    render:()=>({ body:`<div class="help-grid">${DATA.HELP_TEXT.map(h=>`<div class="help-card"><h4>${h.title}</h4><ul>${h.items.map(i=>`<li>${i}</li>`).join('')}</ul></div>`).join('')}
      <div class="help-card"><h4>操作</h4><p><span class="hc-key">左键</span>选择武将 / 格子　<span class="hc-key">拖拽</span>旋转战场　<span class="hc-key">滚轮</span>缩放</p><p><span class="hc-key">空格</span>待机　<span class="hc-key">Esc</span>取消 / 暂停　<span class="hc-key">Tab</span>查看行动序</p><p class="muted">战法消耗士气，攻击与受击都会积累士气。</p></div>
      <div class="help-card"><h4>胜负</h4><p>每场战斗有独立目标：歼灭、斩将、坚守。达成目标即可获胜；我方全体阵亡或目标失败则战败。</p><p>失败后可整军再战，但会损失兵力。故事战斗失败不会导致游戏结束。</p></div>
      </div>`, footer:`<button class="mbtn" data-close>知道了</button>` }) });
}
function openCredits(){
  openModal({ narrow:true, kicker:'卷末', title:'制作名单', body:`
    <div style="font-size:11px;line-height:2;color:#c8bda5;text-align:center;padding:6px 0 14px">
      <div style="font-family:var(--font-kai);font-size:30px;letter-spacing:.2em;color:var(--gold-2);margin-bottom:8px">烽火三国</div>
      <div style="font-size:9px;color:var(--muted);letter-spacing:.18em;margin-bottom:18px">BEACON OF THE THREE KINGDOMS</div>
      <p>一款纯前端、可离线游玩的单机三国战旗游戏。</p>
      <p>引擎：Three.js　·　人物与地形：程序化丹青</p>
      <p>配乐与音效：WebAudio 实时合成</p>
      <p>故事取材：《三国演义》与汉末史料</p>
      <div style="height:1px;width:80px;background:rgba(201,164,95,.3);margin:16px auto"></div>
      <p style="font-size:9px;color:var(--muted)">谨以此作，献给那个英雄辈出的时代。</p>
      <p style="font-size:9px;color:rgba(169,158,133,.5)">本作为同人游戏 · 无商业用途</p>
    </div>`, footer:`<button class="mbtn" data-close>合卷</button>` });
}

/* ---------------- Saves ---------------- */
function openSaves(){
  if(!GS){ toast('尚无征程','请先开始新的游戏。','bad'); return; }
  const slots=['auto','1','2','3'];
  openModal({ narrow:true, kicker:'青史留名', title:'存档', sub:'自动存档在每回合结束与战斗后触发',
    render:()=>({ body:`<div class="save-list">${slots.map(s=>{ const info=CORE.slotInfo(s);
      return `<div class="save-slot ${info?'':'empty'}"><div class="save-no">${s==='auto'?'自':s}</div>
        <div><div class="save-chapter">${info?info.chapter:'空存档位'}</div><div class="save-meta">${info?`${DATA.DIFFICULTY[info.difficulty]?.name||'普通'} · 第 ${info.turn} 回合 · ${info.cities} 城`:'—'}</div><div class="save-time">${info?info.date:'—'}</div></div>
        <div class="save-btns">${info?`<button class="save-btn" data-load="${s}">读取</button><button class="save-btn" data-save="${s}">覆盖</button>${s!=='auto'?`<button class="save-btn red" data-del="${s}">删除</button>`:''}`:`<button class="save-btn" data-save="${s}">存入此档</button>`}</div></div>`;
    }).join('')}</div><div style="font-size:9px;color:var(--muted);margin-top:12px;line-height:1.7">存档保存在浏览器本地。清除浏览器数据会移除存档。<br>战斗中不可存档；自动存档会覆盖「自」档位。</div>`,
    footer:`<div style="display:flex;gap:7px;flex-wrap:wrap"><button class="mbtn" data-export>导出存档</button><button class="mbtn" data-import>导入存档</button><button class="mbtn" data-close>关闭</button></div>` }),
    onMount:root=>{
      $('[data-export]',root)?.addEventListener('click',()=>{ const data=JSON.stringify(CORE.serialize(),null,2); const blob=new Blob([data],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`烽火三国-存档-${new Date().toISOString().slice(0,10)}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); toast('导出成功','存档 JSON 已下载。','good'); });
      $('[data-import]',root)?.addEventListener('click',()=>{ const inp=document.createElement('input'); inp.type='file'; inp.accept='.json,application/json'; inp.onchange=()=>{ const f=inp.files&&inp.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=()=>{ let obj=null; try{ obj=JSON.parse(String(rd.result)); }catch(e){ toast('导入失败','JSON 格式错误。','bad'); return; } const r=CORE.importSave(obj); if(!r.ok){ toast('导入失败',r.msg,'bad'); return; } closeModal(); if(window.GAME) GAME.startCampaignFromBattle(); toast('导入成功',r.msg,'good'); }; rd.readAsText(f); }; inp.click(); });
      $$('[data-save]',root).forEach(b=>b.addEventListener('click',()=>{ const r=CORE.saveGame(b.dataset.save); toast(r.ok?'存档成功':'存档失败',r.ok?'进度已写入。':r.msg,r.ok?'good':'bad'); if(r.ok) AUDIO.sfx('coin'); refreshModal(); }));
      $$('[data-load]',root).forEach(b=>b.addEventListener('click',()=>{ closeModal(); if(window.GAME) GAME.loadFromSlot(b.dataset.load); }));
      $$('[data-del]',root).forEach(b=>b.addEventListener('click',()=>{ confirm('删除存档',`确定删除存档 ${b.dataset.del} 吗？此操作不可恢复。`,()=>{ CORE.deleteSave(b.dataset.del); refreshModal(); },'删除'); }));
    }});
}

/* ---------------- Deployment ---------------- */
function openDeployment(cfg){
  if(!GS) return;
  const roster=CORE.playerGenerals();
  let selected=cfg.preselected? [...cfg.preselected] : roster.slice().sort((a,b)=>CORE.genPower(b)-CORE.genPower(a)).slice(0,cfg.maxUnits||5).map(g=>g.id);
  let formation=cfg.formation||'yulin';
  let troopPct=100;
  let launched=false;
  const max=cfg.maxUnits||5;
  const enemyHtml=(cfg.enemies||[]).map(e=>{ const id=e.g||e.mook; const d=CORE.genDef(id); return `<div class="enemy-line"><span>${d?.name||'敌军'} · Lv.${e.lv||1}</span><span>${DATA.CLASSES[d?.class]?.name||''}</span></div>`; }).join('');
  openModal({ wide:true, kicker:cfg.kicker||'临阵点兵', title:cfg.title||'出战布阵', sub:cfg.sub||`选择至多 ${max} 位武将出战`,
    render:()=>({ body:`<div class="deploy-layout">
      <div><div class="deploy-title">出战武将 <small>${selected.length} / ${max}</small></div>
        <div class="deploy-roster">${roster.map(g=>{ const d=DATA.GENERALS[g.id], s=CORE.genStats(g); const on=selected.includes(g.id);
          return `<button class="deploy-card ${on?'selected':''}" data-pick="${g.id}"><span class="dc-check">✓</span><img src="${ART.portrait(g.id)}"><div class="dc-info"><div class="dc-name">${d.name}</div><div class="dc-meta"><span>Lv.${g.level} · ${CORE.rankName(g.level)}</span><span>${s.might}/${s.lead}/${s.int}</span></div></div></button>`; }).join('')}</div>
      </div>
      <div class="deploy-side"><div><div class="deploy-title">阵形 <small>全军加成</small></div><div class="formation-grid">${Object.values(DATA.FORMATIONS).map(f=>`<button class="formation-card ${formation===f.id?'active':''}" data-form="${f.id}"><div class="fc-name">${f.name}</div><div class="fc-desc">${f.desc}</div></button>`).join('')}</div></div>
        <div class="deploy-enemy"><h4>敌军军情 · ${DATA.FACTIONS[cfg.enemyFaction]?.name||'敌军'}</h4>${enemyHtml||'<div class="enemy-line"><span>兵力不明</span></div>'}</div>
        <div class="battle-preview">${cfg.objectiveText?`目标：${cfg.objectiveText}<br>`:''}地形：${cfg.mapName||'未知'}<br>天候：${cfg.weatherName||'晴'}</div>
      </div></div>`,
      footer:`<div class="deploy-footer"><div class="deploy-summary">已选 <b>${selected.length}</b> 将 · 阵形 <b>${DATA.FORMATIONS[formation].name}</b>${cfg.allowTroops!==false?` · 出战兵力 <b>${Math.round((cfg.troops||1000)*troopPct/100)}</b>`:''}</div><div style="display:flex;gap:8px"><button class="mbtn" data-close>取消</button><button class="mbtn primary" data-launch ${selected.length?'':'disabled'}>擂鼓出阵</button></div></div>` }),
    onMount:root=>{
      $$('[data-pick]',root).forEach(b=>b.addEventListener('click',()=>{ const id=b.dataset.pick; if(selected.includes(id)) selected=selected.filter(x=>x!==id); else if(selected.length<max) selected.push(id); else toast('已满员',`最多选择 ${max} 位武将。`,'bad'); paintModal(); }));
      $$('[data-form]',root).forEach(b=>b.addEventListener('click',()=>{ formation=b.dataset.form; paintModal(); }));
      $('[data-launch]',root).addEventListener('click',()=>{
        if(!selected.length){ toast('未选武将','至少选择一位武将出战。','bad'); return; }
        const final={ ids:[...selected], formation, troopPct:cfg.allowTroops===false?100:troopPct };
        launched=true;
        closeModal(); AUDIO.sfx('march'); cfg.onLaunch&&cfg.onLaunch(final);
      });
    }});
}

/* ---------------- Pause ---------------- */
function openPause(){
  if(!window.BATTLE || !BATTLE.active) return;
  if(BATTLE.paused) return;
  BATTLE.pause();
  const log=(window.BATTLE&&BATTLE.state&&BATTLE.state.log)?BATTLE.state.log.slice(-10).reverse():[];
  const logHtml=log.length?`<div class="pause-log">${log.map(l=>`<div class="feed-line ${l.cls}">${l.text}</div>`).join('')}</div>`:'<div class="pause-log empty">暂无战报</div>';
  openModal({ narrow:true, persistent:true, hideClose:true, kicker:'战事暂歇', title:'暂停',
    render:()=>({ body:`<div style="display:flex;flex-direction:column;gap:7px;margin:4px 0 6px">
      <button class="city-btn" data-resume style="padding:12px">继续战斗</button>
      <button class="city-btn danger" data-retreat style="padding:12px">认输撤退</button>
      </div>
      <div class="pause-log-title">战 报</div>${logHtml}
      <div style="font-size:9px;color:var(--muted);line-height:1.7;margin-top:6px">拖拽旋转视角 · 滚轮缩放 · Space 待机<br>战法消耗士气；枪克骑，骑克弓，弓克步。</div>`, footer:'' }),
    onMount:root=>{
      $('[data-resume]',root).addEventListener('click',()=>{ closeModal(); BATTLE.resume(); });
      $('[data-retreat]',root).addEventListener('click',()=>{ confirm('认输撤退','撤退将判负并损失兵力，确定吗？',()=>{ BATTLE.retreat(); },'撤退','再想想',()=>{ BATTLE.resume(); }); });
    } });
}

return {
  init, showScreen, transition, toast, achievement, updateMenu,
  openModal, refreshModal, closeModal, confirm, paintModal,
  openNewGame, playStory, storyAdvance, storySkip,
  openRoster, openGeneralDetail, openEquipPicker, openTech, openDiplomacy, openShop, openCodex, openLore, openTavern,
  openSettings, openHelp, openCredits, openSaves, openDeployment, openPause,
  latestSaveSlot, esc, className, $, $$
};
})();

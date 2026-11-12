/* ============================================================
   烽火三国 · 军机
   全局状态 / 内政 / 外交 / 养成 / 存档 / 回合推进
   ============================================================ */
const SETTINGS_KEY = 'fenghuo_settings_v1';
const SAVE_PREFIX = 'fenghuo_save_v1_';
const SETTINGS = Object.assign({ music:.55, sfx:.7, quality:'high', speed:1, shake:true, damageNumbers:true, tutorial:true, reduceMotion:false, highContrast:false, liteMode:false },
  (()=>{ try{ return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'); }catch(e){ return {}; } })());
let GS = null;
const BUS = new EventTarget();
function emit(type, detail){ BUS.dispatchEvent(new CustomEvent(type,{ detail })); }
function on(type, fn){ BUS.addEventListener(type, fn); }
function off(type, fn){ BUS.removeEventListener(type, fn); }

const CORE = (() => {
'use strict';
const clone = o => JSON.parse(JSON.stringify(o));
const rand = (a,b) => a + Math.random()*(b-a);
const irand = (a,b) => Math.floor(rand(a,b+1));
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const fmt = n => {
  n = Math.round(n);
  if(Math.abs(n)>=10000) return (n/10000).toFixed(n%10000===0?0:1)+'万';
  return String(n);
};
const dateStr = () => {
  const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

function applySettings(){
  try{
    const root=document.documentElement;
    root.classList.toggle('reduce-motion',!!SETTINGS.reduceMotion);
    root.classList.toggle('high-contrast',!!SETTINGS.highContrast);
    root.classList.toggle('lite-mode',!!SETTINGS.liteMode);
  }catch(e){}
}
function saveSettings(){
  try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS)); }catch(e){}
  if(typeof AUDIO!=='undefined') AUDIO.setVolumes(SETTINGS.music, SETTINGS.sfx);
  applySettings();
}
applySettings();

/* ---------------- 新局 ---------------- */
function newGame(difficulty='normal'){
  const diff = DATA.DIFFICULTY[difficulty] ? difficulty : 'normal';
  const cities = {};
  Object.values(DATA.CITIES).forEach(c => {
    cities[c.id] = {
      id:c.id, owner:c.owner, troops:c.troops, order:c.order, morale:c.morale,
      level:c.level, buildings:clone(c.buildings), governor:c.governor||null,
      defenses:c.defenses, looted:false
    };
  });
  const generals = {};
  const roster = ['liubei','guanyu','zhangfei'];
  roster.forEach(id=>{ generals[id] = makeGeneralState(id, 1, { equip: starterEquip(id) }); });
  const s = {
    version:1, difficulty:diff, turn:1, chapter:0, chapterDone:[], storySeen:[],
    gold:1200, food:4200, techPoints:3, fame:18, orders:2, maxOrders:2,
    generals, roster, cities,
    inventory:{ mingguang:1, jueying:1, qingnang:1, gudding:0, shuanggu:0 },
    tech:{}, relations:{wei:26, wu:58, liubiao:52, liuzhang:46, zhanglu:40, dong:18, lv:16, yellow:8},
    alliances:{}, flags:{}, stats:{battles:0,wins:0,kills:0,recruits:0,conquered:0,itemsFound:0},
    achievements:{}, log:[], seenLore:[], pendingEvent:null,
    startedAt:Date.now(), playTime:0, lastSave:Date.now()
  };
  // clean inventory zeros
  Object.keys(s.inventory).forEach(k=>{ if(!s.inventory[k]) delete s.inventory[k]; });
  s.log.unshift({t:'system', text:'中平元年，桃园结义。刘备军于涿郡举义。'});
  GS = s;
  emit('state:changed');
  return s;
}

function starterEquip(id){
  const map = { liubei:{weapon:'shuanggu'}, guanyu:{weapon:'qinglong'}, zhangfei:{weapon:'zhangba'} };
  return map[id] || {};
}

function makeGeneralState(id, level=1, opts={}){
  return {
    id, level, exp:0, loyalty: opts.loyalty ?? (DATA.GENERALS[id]?.loyalty ?? 80),
    equip: Object.assign({weapon:null,armor:null,horse:null,treasure:null}, opts.equip||{}),
    joined: opts.joined!==false, wounds:0
  };
}

/* ---------------- 查询 ---------------- */
function getGen(id){ return GS ? GS.generals[id] : null; }
function baseGen(id){ return DATA.GENERALS[id] || null; }
function genDef(id){ return DATA.GENERALS[id] || DATA.MOOKS[id] || null; }
function playerGenerals(){
  if(!GS) return [];
  return GS.roster.map(id=>getGen(id)).filter(Boolean);
}
function genName(id){ return genDef(id)?.name || id; }
function genClass(id){ return DATA.CLASSES[genDef(id)?.class] || DATA.CLASSES.infantry; }
function equipStats(g){
  const total={atk:0,def:0,hp:0,int:0,speed:0,move:0,crit:0,counter:0,skill:0,heal:0,rage:0};
  if(!g) return total;
  const equipped=[];
  for(const slot of ['weapon','armor','horse','treasure']){
    const iid=g.equip?.[slot]; const item=DATA.ITEMS[iid]; if(!item) continue;
    equipped.push(iid);
    for(const [k,v] of Object.entries(item.stats||{})) total[k]=(total[k]||0)+v;
  }
  const sets=equipSets(g);
  sets.forEach(s=>{ if(s.active){ for(const [k,v] of Object.entries(s.active.stats||{})) total[k]=(total[k]||0)+v; } });
  return total;
}
function equipSets(g){
  if(!g||!DATA.SETS) return [];
  const equipped=['weapon','armor','horse','treasure'].map(s=>g.equip?.[s]).filter(Boolean);
  return Object.values(DATA.SETS).map(set=>{
    const count=set.items.filter(i=>equipped.includes(i)).length;
    const active=set[count]||set[Math.max(...Object.keys(set).filter(k=>/^\d+$/.test(k)).map(Number).filter(n=>n<=count))]||null;
    const next=Object.keys(set).filter(k=>/^\d+$/.test(k)).map(Number).sort((a,b)=>a-b).find(n=>n>count)||null;
    return {set,count,active,next};
  }).filter(x=>x.count>0);
}
function genStats(g){
  if(!g) return null;
  const b=DATA.GENERALS[g.id]; if(!b) return null;
  const lv=g.level||1, eq=equipStats(g);
  const base=b.base, growth=b.growth;
  const stat = k => Math.round(base[k] + (growth[k]||0)*(lv-1));
  const might=stat('might'), lead=stat('lead'), intel=stat('int'), pol=stat('pol'), charm=stat('charm');
  const cls=DATA.CLASSES[b.class];
  return {
    might, lead, int:intel+eq.int, pol, charm, skill:eq.skill, heal:eq.heal, rage:eq.rage,
    atk: Math.round(26 + might*1.15 + lv*2.2 + eq.atk),
    def: Math.round(14 + lead*.7 + lv*1.6 + eq.def),
    hp: Math.round((300 + lead*3.2 + lv*22 + eq.hp) * (cls.hp||1)),
    speed: Math.round((base.speed + eq.speed) * 10)/10,
    move: cls.move + eq.move,
    range: cls.range, minRange: cls.minRange,
    crit: .05 + eq.crit,
    counter: .45 + eq.counter,
    class:b.class, className:cls.name,
    rank: rankName(lv)
  };
}
function rankName(lv){ let r=DATA.RANKS[0].name; for(const x of DATA.RANKS) if(lv>=x.lv) r=x.name; return r; }
function expNeed(lv){ return 80 + lv*55 + lv*lv*4; }
function gainExp(g, amount){
  if(!g) return {leveled:0, levels:[]};
  g.exp = (g.exp||0) + Math.round(amount);
  let leveled=0, levels=[];
  while(g.level < 20 && g.exp >= expNeed(g.level)){
    g.exp -= expNeed(g.level); g.level++; leveled++; levels.push(g.level);
  }
  if(g.level>=20) g.exp=0;
  return {leveled, levels};
}
const RECRUIT_POOL=[
  {id:'zhoucang',chapter:1,gold:600,fame:10,lv:3,desc:'关西力士，愿为将军扛刀牵马。'},
  {id:'weiyan',chapter:2,gold:1400,fame:30,lv:5,desc:'勇略过人，献子午谷奇谋，只待明主。'}
];
function recruitCandidates(){
  if(!GS) return [];
  return RECRUIT_POOL.map(r=>({...r, owned:GS.roster.includes(r.id), locked:GS.chapter<r.chapter, canFame:GS.fame>=r.fame, canGold:GS.gold>=r.gold}));
}
function recruitGeneral(id){
  const r=RECRUIT_POOL.find(x=>x.id===id); if(!r) return {ok:false,msg:'此人不在招贤馆'};
  if(GS.roster.includes(id)) return {ok:false,msg:'已在麾下'};
  if(GS.chapter<r.chapter) return {ok:false,msg:'时机未到，尚不可招揽'};
  if(GS.fame<r.fame) return {ok:false,msg:`声望不足，尚缺 ${r.fame-GS.fame}`};
  if(GS.gold<r.gold) return {ok:false,msg:`金不足，尚缺 ${r.gold-GS.gold}`};
  GS.gold-=r.gold; GS.fame-=r.fame;
  addGeneral(id, Math.max(r.lv,(GS.chapter)*2+1));
  addLog('green', `招贤馆纳士：${genName(id)} 来投。`);
  emit('state:changed'); return {ok:true,msg:`${genName(id)} 加入麾下`};
}
function addGeneral(id, level=1){
  if(!GS || GS.generals[id]) { if(GS && !GS.roster.includes(id)) GS.roster.push(id); return GS?.generals[id]; }
  const lv = Math.max(1, Math.min(20, level));
  GS.generals[id] = makeGeneralState(id, lv, { joined:true });
  if(!GS.roster.includes(id)) GS.roster.push(id);
  GS.stats.recruits++;
  addLog('green', `${genName(id)} 加入麾下！`);
  checkAchievements();
  emit('state:changed');
  return GS.generals[id];
}
function genPower(idOrG){
  const g = typeof idOrG==='string' ? getGen(idOrG) : idOrG;
  if(!g) return 0;
  const s=genStats(g); if(!s) return 0;
  return Math.round(s.might*1.2 + s.lead*1.1 + s.int*.8 + s.hp*.12 + s.atk*1.2 + s.def*.8);
}

/* ---------------- 城池 ---------------- */
function cityStatic(id){ return DATA.CITIES[id]; }
function city(id){ return GS?.cities[id]; }
function playerCities(){ return Object.values(GS.cities).filter(c=>c.owner==='shu'); }
function enemyCities(faction){ return Object.values(GS.cities).filter(c=>c.owner===faction); }
function cityAdjacent(id){ return (DATA.CITIES[id]?.adjacent||[]).filter(x=>GS.cities[x]); }
function cityOwnerName(id){ const c=city(id); return DATA.FACTIONS[c?.owner]?.name || '无主'; }
function cityTroopCap(c){
  return 2500 + (c.buildings?.barracks||0)*2400 + (c.level||1)*500;
}
function cityIncome(c){
  if(!c) return {gold:0,food:0,tech:0};
  const b=c.buildings||{};
  const gov = c.governor ? getGen(c.governor) : null;
  const gp = gov ? genStats(gov).pol : 0;
  const diff = DATA.DIFFICULTY[GS.difficulty]||DATA.DIFFICULTY.normal;
  const tech = techBonus();
  const gold = Math.round((60 + (b.market||0)*105 + (c.level||1)*22) * (1 + gp/420) * (1+(tech.gold||0)) * diff.income);
  const food = Math.round((120 + (b.farm||0)*150 + (c.level||1)*20) * (1 + gp/500) * (1+(tech.food||0)) * diff.income);
  const techPt = Math.round(((b.academy||0)*.9 + .35) * 10)/10;
  return {gold, food, tech:techPt};
}
function cityUpkeep(){
  let troops=0;
  for(const c of playerCities()) troops+=c.troops;
  const tech=techBonus();
  return Math.round(troops*.042*(1-(tech.foodUse||0)));
}
function totalTroops(){ return playerCities().reduce((s,c)=>s+c.troops,0); }
function incomeSummary(){
  let gold=0, food=0, tech=0;
  for(const c of playerCities()){ const i=cityIncome(c); gold+=i.gold; food+=i.food; tech+=i.tech; }
  const upkeep=cityUpkeep();
  return { gold, food, tech:Math.round(tech*10)/10, upkeep, netFood:food-upkeep };
}
function orderAvg(){ const pc=playerCities(); if(!pc.length) return 0; return Math.round(pc.reduce((s,c)=>s+c.order,0)/pc.length); }
function setGovernor(cityId, genId){
  const c=city(cityId); if(!c || c.owner!=='shu') return false;
  if(genId && !GS.roster.includes(genId)) return false;
  c.governor = genId||null; emit('state:changed'); return true;
}
function buildCost(bid, level){ const b=DATA.BUILDINGS[bid]; return Math.round((b?.base||300) * level * (1+level*.38)); }
function upgradeBuilding(cityId, bid){
  const c=city(cityId); if(!c || c.owner!=='shu') return {ok:false,msg:'此城不归我军所有'};
  const b=DATA.BUILDINGS[bid]; if(!b) return {ok:false,msg:'未知建筑'};
  const lv=c.buildings[bid]||0;
  if(lv>=b.max) return {ok:false,msg:'已达最高等级'};
  const cost=buildCost(bid,lv+1);
  if(GS.gold<cost) return {ok:false,msg:'金不够，尚缺 '+(cost-GS.gold)};
  GS.gold-=cost; c.buildings[bid]=lv+1;
  addLog('gold', `${cityStatic(cityId).name}的${b.name}升至 ${lv+1} 级，耗金 ${cost}。`);
  checkAchievements(); emit('state:changed');
  return {ok:true,msg:`${b.name}升至 ${lv+1} 级`};
}
function recruitTroops(cityId, amount=500){
  const c=city(cityId); if(!c || c.owner!=='shu') return {ok:false,msg:'此城不归我军所有'};
  const tech=techBonus();
  const barracks=c.buildings.barracks||0;
  const discount=1 - Math.min(.3, barracks*.04 + (tech.recruit||0));
  const costGold=Math.round(amount*.24*discount), costFood=Math.round(amount*.2*discount);
  const cap=cityTroopCap(c);
  if(c.troops>=cap) return {ok:false,msg:'兵营已满，请升级兵营'};
  const actual=Math.min(amount, cap-c.troops);
  if(GS.gold<costGold) return {ok:false,msg:'金不足，尚缺 '+(costGold-GS.gold)};
  if(GS.food<costFood) return {ok:false,msg:'粮不足，尚缺 '+(costFood-GS.food)};
  GS.gold-=costGold; GS.food-=costFood; c.troops+=actual; c.order=Math.max(0,c.order-1);
  addLog('green', `${cityStatic(cityId).name}征兵 ${actual}，耗金 ${costGold}，耗粮 ${costFood}。`);
  checkAchievements(); emit('state:changed');
  return {ok:true,msg:`征得兵员 ${actual}`};
}
function relieve(cityId){
  const c=city(cityId); if(!c || c.owner!=='shu') return {ok:false,msg:'此城不归我军所有'};
  if(GS.food<300) return {ok:false,msg:'粮草不足'};
  GS.food-=300; c.order=clamp(c.order+12,0,100);
  addLog('green', `${cityStatic(cityId).name}开仓赈济，治安提升。`);
  emit('state:changed'); return {ok:true,msg:'治安 +12'};
}
function patrol(cityId){
  const c=city(cityId); if(!c || c.owner!=='shu') return {ok:false,msg:'此城不归我军所有'};
  if(GS.gold<200) return {ok:false,msg:'金不足'};
  GS.gold-=200; c.order=clamp(c.order+8,0,100);
  emit('state:changed'); return {ok:true,msg:'治安 +8'};
}
function repairCity(cityId){
  const c=city(cityId); if(!c || c.owner!=='shu') return {ok:false,msg:'此城不归我军所有'};
  const max=20+(c.buildings.wall||0)*4;
  if(c.defenses>=max) return {ok:false,msg:'城防完好'};
  const cost=Math.min(500, Math.round((max-c.defenses)*12));
  if(GS.gold<cost) return {ok:false,msg:'金不足，尚缺 '+(cost-GS.gold)};
  GS.gold-=cost; c.defenses=max;
  emit('state:changed'); return {ok:true,msg:'城防已修复'};
}

/* ---------------- 科技 ---------------- */
function hasTech(id){ return !!GS?.tech[id]; }
function techNode(id){ for(const b of Object.values(DATA.TECHS)){ const n=b.nodes.find(x=>x.id===id); if(n) return n; } return null; }
function canResearch(id){
  const n=techNode(id); if(!n) return {ok:false,msg:'未知科技'};
  if(hasTech(id)) return {ok:false,msg:'已研究'};
  if(n.req && !n.req.every(r=>hasTech(r))) return {ok:false,msg:'前置科技未完成'};
  if(GS.techPoints < n.cost) return {ok:false,msg:`科技点不足，尚缺 ${n.cost-GS.techPoints}`};
  return {ok:true};
}
function research(id){
  const chk=canResearch(id); if(!chk.ok) return chk;
  const n=techNode(id); GS.techPoints-=n.cost; GS.tech[id]=true;
  addLog('tech', `研究完成：${n.name}。`);
  emit('state:changed'); return {ok:true,msg:`已研究「${n.name}」`};
}
function techBonus(){
  const t={atk:0,def:0,hp:0,move:0,cavMove:0,cavSpeed:0,crit:0,skill:0,fire:0,rage:0,gold:0,food:0,order:0,recruit:0,recruitAmt:0,foodUse:0,siege:0};
  if(!GS) return t;
  for(const b of Object.values(DATA.TECHS)) for(const n of b.nodes){
    if(GS.tech[n.id] && n.effect) for(const [k,v] of Object.entries(n.effect)) t[k]=(t[k]||0)+v;
  }
  // 铁匠铺：全军攻击 +1%/级
  let forge=0; for(const c of playerCities()) forge+=(c.buildings.forge||0);
  t.atk += Math.min(.15, forge*.01);
  return t;
}

/* ---------------- 装备 ---------------- */
function itemCount(id){ return GS?.inventory[id]||0; }
function addItem(id, n=1){
  if(!GS || !DATA.ITEMS[id]) return;
  GS.inventory[id]=(GS.inventory[id]||0)+n; GS.stats.itemsFound+=n;
  addLog('gold', `获得「${DATA.ITEMS[id].name}」×${n}。`);
  checkAchievements(); emit('state:changed');
}
function equipItem(genId, itemId){
  const g=GS?.generals[genId]; const item=DATA.ITEMS[itemId];
  if(!g || !item) return {ok:false,msg:'无效装备'};
  if(!GS.inventory[itemId]) return {ok:false,msg:'库中没有此物'};
  const slot=item.type;
  const old=g.equip[slot];
  g.equip[slot]=itemId; GS.inventory[itemId]--;
  if(!GS.inventory[itemId]) delete GS.inventory[itemId];
  if(old) GS.inventory[old]=(GS.inventory[old]||0)+1;
  emit('state:changed'); return {ok:true,msg:`${item.name} 已装备`};
}
function unequipItem(genId, slot){
  const g=GS?.generals[genId]; if(!g) return {ok:false,msg:'无效武将'};
  const old=g.equip[slot]; if(!old) return {ok:false,msg:'该部位未装备'};
  g.equip[slot]=null; GS.inventory[old]=(GS.inventory[old]||0)+1;
  emit('state:changed'); return {ok:true,msg:'已卸下'};
}
function giftGeneral(genId){
  const g=GS?.generals[genId]; if(!g) return {ok:false,msg:'无效武将'};
  if(GS.gold<500) return {ok:false,msg:'金不足'};
  GS.gold-=500; g.loyalty=clamp(g.loyalty+8,0,100);
  emit('state:changed'); return {ok:true,msg:'忠诚 +8'};
}

/* ---------------- 外交 ---------------- */
const DIPLO_FACTIONS = ['wei','wu','liubiao','liuzhang','zhanglu','dong','lv','yellow'];
function relation(f){ return GS?.relations[f]??50; }
function allianceTurns(f){ return GS?.alliances[f]||0; }
function isAllied(f){ return allianceTurns(f)>0; }
function giftFaction(f, amount=300){
  if(relation(f)>=100) return {ok:false,msg:'关系已至上限'};
  if(GS.gold<amount) return {ok:false,msg:'金不足'};
  GS.gold-=amount; GS.relations[f]=clamp(relation(f)+12,0,100);
  addLog('green', `遣使赠礼于${DATA.FACTIONS[f].name}，关系提升。`);
  emit('state:changed'); return {ok:true,msg:'关系 +12'};
}
function makeAlliance(f){
  if(isAllied(f)) return {ok:false,msg:'盟约仍在'};
  if(relation(f)<70) return {ok:false,msg:'关系不足 70，难以结盟'};
  if(GS.gold<500) return {ok:false,msg:'金不足'};
  GS.gold-=500; GS.alliances[f]=12; GS.relations[f]=clamp(relation(f)+8,0,100);
  addLog('green', `与${DATA.FACTIONS[f].name}缔结盟约，为期十二回合。`);
  emit('state:changed'); return {ok:true,msg:'盟约缔结，12 回合'};
}
function truce(f){
  if(GS.food<500) return {ok:false,msg:'粮不足'};
  GS.food-=500; GS.relations[f]=clamp(relation(f)+15,0,100);
  emit('state:changed'); return {ok:true,msg:'停战议和，关系 +15'};
}
function breakAlliance(f){
  if(!isAllied(f)) return;
  delete GS.alliances[f]; GS.relations[f]=clamp(relation(f)-45,0,100);
  addLog('red', `与${DATA.FACTIONS[f].name}的盟约破裂！`);
}

/* ---------------- 日志 / 成就 ---------------- */
function addLog(type, text){
  if(!GS) return;
  GS.log.unshift({t:type, text, turn:GS.turn});
  if(GS.log.length>60) GS.log.length=60;
}
function unlockAch(id){
  if(!GS || !DATA.ACHIEVEMENTS[id] || GS.achievements[id]) return false;
  GS.achievements[id]=Date.now();
  addLog('achievement', `成就达成：${DATA.ACHIEVEMENTS[id].name}`);
  emit('achievement', DATA.ACHIEVEMENTS[id]);
  return true;
}
function checkAchievements(){
  if(!GS) return;
  if(GS.gold>=10000) unlockAch('rich');
  if(totalTroops()>=20000) unlockAch('army');
  if(playerCities().length>=10) unlockAch('cities');
  if(GS.stats.wins>=10) unlockAch('battles');
  if(GS.roster.length>=8) unlockAch('recruiter');
  const itemSet=new Set(Object.keys(GS.inventory));
  GS.roster.forEach(id=>{ const g=GS.generals[id]; if(g) Object.values(g.equip||{}).forEach(x=>{if(x) itemSet.add(x);}); });
  if(itemSet.size>=8) unlockAch('collector');
  if(GS.chapterDone.includes('ch1')) unlockAch('hulao');
  if(GS.chapterDone.includes('ch2')) unlockAch('wolong');
  if(GS.chapterDone.includes('ch3')) unlockAch('changban');
  if(GS.chapterDone.includes('ch4')) unlockAch('chibi');
  if(GS.chapterDone.includes('ch5')) unlockAch('han');
}

/* ---------------- 章回 ---------------- */
function currentChapter(){
  if(!GS) return null;
  const id=GS.chapterDone.length ? null : null;
  return DATA.CHAPTERS[GS.chapter] || null;
}
function chapterById(id){ return DATA.CHAPTERS.find(c=>c.id===id)||null; }
function completeChapter(id){
  if(!GS) return;
  if(!GS.chapterDone.includes(id)) GS.chapterDone.push(id);
  const ch=chapterById(id);
  if(ch){
    if(ch.recruit) ch.recruit.forEach(g=>addGeneral(g, Math.max(1, GS.chapter*2+3)));
    if(ch.rewards) applyRewards(ch.rewards, ch.title);
    if(ch.achievement) unlockAch(ch.achievement);
    (DATA.LORE||[]).filter(l=>l.needChapter<=DATA.CHAPTERS.indexOf(ch)).forEach(l=>{ if(!GS.seenLore.includes(l.id)) GS.seenLore.push(l.id); });
    addLog('chapter', `${ch.no}「${ch.title}」完成。`);
  }
  GS.chapter = Math.max(GS.chapter, DATA.CHAPTERS.findIndex(c=>c.id===id)+1);
  checkAchievements(); emit('state:changed');
}
function applyRewards(r, source='战利品'){
  if(!GS || !r) return;
  if(r.gold){ GS.gold+=r.gold; }
  if(r.food){ GS.food+=r.food; }
  if(r.fame){ GS.fame+=r.fame; }
  if(r.tech){ GS.techPoints+=r.tech; }
  const ups=[];
  if(r.exp){ playerGenerals().forEach(g=>{ const res=gainExp(g, r.exp); if(res&&res.leveled) ups.push(`${DATA.GENERALS[g.id]?.name||g.id} Lv.${g.level}`); }); }
  if(r.items) r.items.forEach(id=>addItem(id,1));
  if(r.troops){ const pc=playerCities(); if(pc[0]) pc[0].troops+=r.troops; }
  addLog('gold', `${source}：获得 ${r.gold||0} 金、${r.food||0} 粮、${r.tech||0} 科技点。`);
  if(ups.length && typeof UI!=='undefined' && UI.toast) UI.toast('武将升级', ups.join(' · '), 'good', 4200);
  if(r.items && r.items.length && typeof UI!=='undefined' && UI.toast) UI.toast('获得装备', r.items.map(id=>DATA.ITEMS?.[id]?.name||id).join(' · '), 'good', 3600);
  emit('state:changed');
}

/* ---------------- 敌军 ---------------- */
function mooksForFaction(f){
  const map={
    wei:['weiInfantry','weiArcher','weiCavalry'], yellow:['yellowBrute','yellowArcher'],
    dong:['dongBrute','dongCavalry','dongArcher'], lv:['dongBrute','dongCavalry'],
    wu:['wuMarine','jingArcher'], liubiao:['jingArcher','dongBrute'], liuzhang:['dongBrute','jingArcher'],
    zhanglu:['yellowBrute','jingArcher'], shu:['shuInfantry','weiArcher']
  };
  return map[f]||['dongBrute'];
}
function cityDefenders(cityId, opts={}){
  const c=city(cityId); if(!c) return [];
  const st=cityStatic(cityId), def=DATA.FACTIONS[c.owner]||{};
  const lvBase=Math.max(1, Math.round((c.level||1)*1.3 + (opts.bonus||0)));
  const gens=(st.generals||[]).filter(g=>DATA.GENERALS[g]||DATA.MOOKS[g]);
  const units=[]; const max=opts.count||5;
  gens.slice(0,max).forEach((g,i)=>units.push({ g, lv: clamp(lvBase + (i===0?1:0),1,15), pos:null }));
  const mooks=mooksForFaction(c.owner);
  while(units.length<max){ units.push({ mook: pick(mooks), lv: clamp(lvBase,1,12) }); }
  return units;
}
function enemyArmyForBattle(cityId){ return cityDefenders(cityId); }
function cityPower(cityId){
  const c=city(cityId); if(!c) return 0;
  const units=cityDefenders(cityId,{count:5});
  let pow=c.troops*0.55 + c.defenses*18 + (c.buildings.wall||0)*120;
  units.forEach(u=>{ pow += 260 + (u.lv||1)*110; });
  return Math.round(pow);
}
function playerPower(ids){
  let pow=2600;
  ids.forEach(id=>{ const g=getGen(id); pow+=genPower(g)*2.2; });
  return Math.round(pow);
}

/* ---------------- 回合 ---------------- */
function turnIncome(){
  const inc=incomeSummary();
  GS.gold += inc.gold; GS.food += inc.food; GS.techPoints += inc.tech;
  GS.food -= inc.upkeep;
  let shortage=false;
  if(GS.food<0){ shortage=true; GS.food=0; }
  for(const c of playerCities()){
    const gov=c.governor?getGen(c.governor):null;
    const charm=gov?genStats(gov).charm:0;
    c.order=clamp(c.order + (c.order<60?1:0) + (charm>85?1:0) + (GS.tech.minxin?1:0),0,100);
    if(c.order<30){
      const loss=Math.round(c.troops*.06);
      c.troops=Math.max(0,c.troops-loss);
      c.order=clamp(c.order+3,0,100);
      addLog('red', `${cityStatic(c.id).name}治安低下，逃兵 ${loss}。`);
    }
  }
  if(shortage){
    const pc=playerCities();
    pc.forEach(c=>{ c.troops=Math.round(c.troops*.9); c.order=clamp(c.order-6,0,100); });
    addLog('red','粮草断绝，军心涣散，各城逃兵四散。');
  }
  // 盟约倒计时
  for(const f of Object.keys(GS.alliances)){
    GS.alliances[f]--;
    if(GS.alliances[f]<=0){ delete GS.alliances[f]; addLog('system', `与${DATA.FACTIONS[f].name}的盟约到期。`); }
  }
  GS.orders = GS.maxOrders;
  GS.turn++;
  addLog('system', `第 ${GS.turn} 回合。收入 ${inc.gold} 金、${inc.food} 粮。`);
  emit('state:changed');
  return { inc, shortage };
}

function aiPlanAttacks(){
  if(!GS) return [];
  const diff=DATA.DIFFICULTY[GS.difficulty];
  const attacks=[];
  const player=playerCities();
  if(!player.length) return attacks;
  const candidates=[];
  for(const enemyCity of Object.values(GS.cities)){
    if(enemyCity.owner==='shu') continue;
    if(isAllied(enemyCity.owner)) continue;
    if(enemyCity.owner==='yellow' && GS.chapter<1) continue;
    const targets=(DATA.CITIES[enemyCity.id].adjacent||[]).map(id=>GS.cities[id]).filter(c=>c&&c.owner==='shu');
    if(!targets.length) continue;
    const rel=relation(enemyCity.owner);
    const chance=diff.aggression * (1-rel/135) * (enemyCity.troops>1200?1:.35);
    if(Math.random()<chance){
      const target=pick(targets);
      candidates.push({ from:enemyCity.id, to:target.id, faction:enemyCity.owner, chance });
    }
  }
  candidates.sort((a,b)=>cityPower(b.from)-cityPower(a.from));
  const max=GS.difficulty==='epic'?2:1;
  const seen=new Set();
  for(const a of candidates){
    if(attacks.length>=max) break;
    if(seen.has(a.to)) continue;
    seen.add(a.to); attacks.push(a);
  }
  return attacks;
}

function resolveAutoBattle(attack){
  // 城防自动结算：返回胜利方
  const c=city(attack.to);
  const enemy=city(attack.from);
  const pPow=cityPower(attack.to)*1.12 + (c.buildings.wall||0)*140;
  const ePow=cityPower(attack.from);
  const chance=clamp(.5 + (pPow-ePow)/(pPow+ePow)*.55 + .08, .12,.9);
  const win=Math.random()<chance;
  return { win, chance, pPow, ePow };
}

function captureCity(cityId, newOwner, opts={}){
  const c=city(cityId); if(!c) return null;
  const old=c.owner;
  c.owner=newOwner; c.governor=null; c.order=Math.max(20,c.order-15);
  c.troops=Math.round((opts.troops??c.troops*.45));
  c.defenses=Math.max(8,Math.round(c.defenses*.5));
  if(newOwner==='shu'){
    GS.stats.conquered++;
    const lootGold=Math.round(260 + (c.level||1)*180 + rand(0,220));
    const lootFood=Math.round(320 + (c.level||1)*200 + rand(0,260));
    GS.gold+=lootGold; GS.food+=lootFood; GS.fame+=4;
    addLog('chapter', `攻克${cityStatic(cityId).name}！缴获 ${lootGold} 金、${lootFood} 粮。`);
    if(GS.relations[old]!=null) GS.relations[old]=clamp(GS.relations[old]-18,0,100);
    if(isAllied(old)) breakAlliance(old);
    checkAchievements();
  } else {
    addLog('red', `${cityStatic(cityId).name}失守！`);
  }
  emit('state:changed');
  return c;
}
function ownerHasCities(f){ return Object.values(GS.cities).some(c=>c.owner===f); }
function victoryEnding(){ if(GS) GS.flags.victory=true; }

/* ---------------- 随机事件 ---------------- */
function rollEvent(){
  if(!GS || GS.turn<2) return null;
  if(Math.random()>.34) return null;
  const eligible=DATA.EVENTS.filter(e=>!e.requirement || e.requirement(GS));
  return eligible.length?pick(eligible):null;
}
function applyEventEffect(effect={}){
  if(!GS) return [];
  const changes=[];
  if(effect.gold){ GS.gold=Math.max(0,GS.gold+effect.gold); changes.push(`金 ${effect.gold>0?'+':''}${effect.gold}`); }
  if(effect.food){ GS.food=Math.max(0,GS.food+effect.food); changes.push(`粮 ${effect.food>0?'+':''}${effect.food}`); }
  if(effect.tech){ GS.techPoints+=effect.tech; changes.push(`科技点 +${effect.tech}`); }
  if(effect.fame){ GS.fame=Math.max(0,GS.fame+effect.fame); changes.push(`名望 ${effect.fame>0?'+':''}${effect.fame}`); }
  if(effect.order){ playerCities().forEach(c=>c.order=clamp(c.order+effect.order,0,100)); changes.push(`治安 ${effect.order>0?'+':''}${effect.order}`); }
  if(effect.troops){ playerCities().forEach(c=>c.troops=Math.max(0,c.troops+effect.troops)); changes.push(`兵力 +${effect.troops}`); }
  if(effect.troopPct){ playerCities().forEach(c=>c.troops=Math.max(0,Math.round(c.troops*(1+effect.troopPct)))); changes.push(`兵力 ${Math.round(effect.troopPct*100)}%`); }
  if(effect.expRandom){ const arr=playerGenerals(); if(arr.length){ const g=pick(arr); const r=gainExp(g,effect.expRandom); changes.push(`${genName(g.id)} 经验 +${effect.expRandom}`); if(r.leveled) changes.push(`${genName(g.id)} 升至 ${g.level} 级`); } }
  checkAchievements(); emit('state:changed');
  return changes;
}

/* ---------------- 存档 ---------------- */
function serialize(){
  if(!GS) return null;
  const copy=clone(GS);
  copy.lastSave=Date.now();
  return copy;
}
function saveGame(slot='auto'){
  if(!GS) return {ok:false,msg:'无进行中的游戏'};
  try{
    GS.lastSave=Date.now();
    localStorage.setItem(SAVE_PREFIX+slot, JSON.stringify(GS));
    return {ok:true,msg:'已存档'};
  }catch(e){ return {ok:false,msg:'存档失败：'+e.message}; }
}
function loadGame(slot='auto'){
  try{
    const raw=localStorage.getItem(SAVE_PREFIX+slot);
    if(!raw) return null;
    const s=JSON.parse(raw);
    if(!s || !s.cities || !s.generals) return null;
    gsDefaults(s);
    GS=s; emit('state:changed'); return s;
  }catch(e){ console.warn('load failed',e); return null; }
}
function importSave(s){
  try{
    if(!s||typeof s!=='object'||!s.cities||!s.generals) return {ok:false,msg:'文件不是有效的烽火三国存档'};
    gsDefaults(s); GS=s; saveGame('auto'); emit('state:changed');
    return {ok:true,msg:'存档已导入'};
  }catch(e){ return {ok:false,msg:'导入失败：'+e.message}; }
}
function gsDefaults(s){
  s.turn=s.turn||1; s.chapter=s.chapter||0; s.chapterDone=s.chapterDone||[]; s.storySeen=s.storySeen||[];
  s.gold=s.gold??1000; s.food=s.food??2000; s.techPoints=s.techPoints??0; s.fame=s.fame??0;
  s.orders=s.orders??2; s.maxOrders=s.maxOrders||2; s.inventory=s.inventory||{}; s.tech=s.tech||{};
  s.relations=s.relations||{}; s.alliances=s.alliances||{}; s.flags=s.flags||{};
  s.stats=Object.assign({battles:0,wins:0,kills:0,recruits:0,conquered:0,itemsFound:0},s.stats||{});
  s.achievements=s.achievements||{}; s.log=s.log||[]; s.seenLore=s.seenLore||[];
  for(const c of Object.values(s.cities)){ c.buildings=c.buildings||{}; c.governor=c.governor||null; }
  for(const g of Object.values(s.generals)){ g.equip=Object.assign({weapon:null,armor:null,horse:null,treasure:null},g.equip||{}); g.level=g.level||1; g.exp=g.exp||0; }
}
function slotInfo(slot='auto'){
  try{
    const raw=localStorage.getItem(SAVE_PREFIX+slot);
    if(!raw) return null;
    const s=JSON.parse(raw);
    const ch=DATA.CHAPTERS[s.chapter];
    return { slot, turn:s.turn||1, chapter:ch?`${ch.no} · ${ch.title}`:'群雄逐鹿', gold:s.gold, cities:Object.values(s.cities||{}).filter(c=>c.owner==='shu').length,
      date:s.lastSave?new Date(s.lastSave).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'', difficulty:s.difficulty||'normal' };
  }catch(e){ return null; }
}
function hasSave(slot='auto'){ return !!localStorage.getItem(SAVE_PREFIX+slot); }
function deleteSave(slot){ try{ localStorage.removeItem(SAVE_PREFIX+slot); return true; }catch(e){ return false; } }

/* ---------------- 日期 ---------------- */
function seasonName(){ return ['春','夏','秋','冬'][Math.floor(((GS?.turn||1)-1)/3)%4]; }
function dateLabel(){
  if(!GS) return '中平元年 · 184年';
  if(GS.flags && GS.flags.victory) return '建安二十四年 · 汉中';
  const ch=DATA.CHAPTERS[GS.chapter];
  if(ch && ch.date) return `${ch.date} · ${seasonName()}`;
  return `中平元年 · 第${GS.turn}回合`;
}

/* ---------------- debug ---------------- */
function cheat(what){
  if(!GS) return;
  if(what==='gold') GS.gold+=10000;
  if(what==='troops') playerCities().forEach(c=>c.troops+=3000);
  if(what==='tech') GS.techPoints+=30;
  if(what==='winbattle') GS.stats.wins+=1;
  emit('state:changed');
}

return {
  clone, rand, irand, pick, clamp, fmt, dateStr, saveSettings, applySettings,
  newGame, makeGeneralState, addGeneral, getGen, baseGen, genDef, playerGenerals, genName, genClass, genStats, equipStats,
  expNeed, gainExp, genPower, rankName, starterEquip,
  city, cityStatic, playerCities, enemyCities, cityAdjacent, cityOwnerName, cityTroopCap, cityIncome, cityUpkeep, totalTroops,
  incomeSummary, orderAvg, setGovernor, buildCost, upgradeBuilding, recruitTroops, relieve, patrol, repairCity,
  hasTech, techNode, canResearch, research, techBonus,
  itemCount, addItem, equipItem, unequipItem, giftGeneral, equipSets,
  DIPLO_FACTIONS, relation, allianceTurns, isAllied, giftFaction, makeAlliance, truce, breakAlliance, RECRUIT_POOL, recruitCandidates, recruitGeneral,
  addLog, unlockAch, checkAchievements,
  currentChapter, chapterById, completeChapter, applyRewards,
  mooksForFaction, cityDefenders, enemyArmyForBattle, cityPower, playerPower,
  turnIncome, aiPlanAttacks, resolveAutoBattle, captureCity, ownerHasCities, victoryEnding,
  rollEvent, applyEventEffect,
  serialize, saveGame, loadGame, importSave, gsDefaults, slotInfo, hasSave, deleteSave,
  seasonName, dateLabel, cheat
};
})();

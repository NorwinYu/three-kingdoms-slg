/* ============================================================
   烽火三国 · 数据卷
   武将 / 城池 / 战法 / 装备 / 科技 / 事件 / 章回
   ============================================================ */
const DATA = (() => {
'use strict';

const DIFFICULTY = {
  easy:    { id:'easy',    name:'休闲', en:'STORY',    desc:'敌军较弱，粮草丰足，适合看遍三国故事。', enemy:0.82, income:1.25, aggression:0.28, exp:1.15, color:'#77b18d' },
  normal:  { id:'normal',  name:'普通', en:'BALANCED', desc:'原汁原味的攻防。每一场胜利都需谋略。', enemy:1.0,  income:1.0,  aggression:0.55, exp:1.0,  color:'#c9a45f' },
  epic:    { id:'epic',    name:'史诗', en:'EPIC',     desc:'敌军精锐，诸候环伺。唯有真正的统帅能兴复汉室。', enemy:1.18, income:0.9, aggression:0.82, exp:1.25, color:'#cf4d3e' }
};

const FACTIONS = {
  shu:     { id:'shu',     name:'刘备军', short:'蜀', color:'#3f8d63', colorHex:0x3f8d63, banner:'蜀', leader:'刘备', trait:'仁德' },
  wei:     { id:'wei',     name:'曹操军', short:'魏', color:'#4a73a8', colorHex:0x4a73a8, banner:'魏', leader:'曹操', trait:'霸道' },
  wu:      { id:'wu',      name:'孙权军', short:'吴', color:'#b0503f', colorHex:0xb0503f, banner:'吴', leader:'孙权', trait:'水战' },
  yellow:  { id:'yellow',  name:'黄巾军', short:'黄巾', color:'#c9a43a', colorHex:0xc9a43a, banner:'黄巾', leader:'张角', trait:'众志' },
  dong:    { id:'dong',    name:'董卓军', short:'董', color:'#6e4d7d', colorHex:0x6e4d7d, banner:'董', leader:'董卓', trait:'暴虐' },
  lv:      { id:'lv',      name:'吕布军', short:'吕', color:'#a33b2f', colorHex:0xa33b2f, banner:'吕', leader:'吕布', trait:'骁勇' },
  liubiao: { id:'liubiao', name:'刘表军', short:'荆', color:'#4b8580', colorHex:0x4b8580, banner:'荆', leader:'刘表', trait:'守成' },
  liuzhang:{ id:'liuzhang',name:'刘璋军', short:'益', color:'#94824a', colorHex:0x94824a, banner:'益', leader:'刘璋', trait:'暗弱' },
  zhanglu: { id:'zhanglu', name:'张鲁军', short:'汉', color:'#7d623f', colorHex:0x7d623f, banner:'汉', leader:'张鲁', trait:'五斗米' }
};

const CLASSES = {
  infantry:  { id:'infantry',  name:'步兵', icon:'步', move:3, range:1, minRange:1, hp:1.08, atk:1.0,  def:1.12, desc:'攻守均衡，结阵而战。' },
  spear:     { id:'spear',     name:'枪兵', icon:'枪', move:3, range:1, minRange:1, hp:1.02, atk:.98, def:1.06, desc:'克制骑兵，枪出如林。', antiCavalry:1.35 },
  cavalry:   { id:'cavalry',   name:'骑兵', icon:'骑', move:5, range:1, minRange:1, hp:.92, atk:1.14, def:.9,  desc:'千里奔袭，克制弓兵。', antiArcher:1.3 },
  archer:    { id:'archer',    name:'弓兵', icon:'弓', move:3, range:3, minRange:2, hp:.86, atk:1.06, def:.82, desc:'远程压制，惧于骑兵。', antiInfantry:1.15 },
  strategist:{ id:'strategist',name:'军师', icon:'策', move:3, range:3, minRange:2, hp:.8,  atk:.9,  def:.78, desc:'谋略伤害，火烧连营。' },
  commander: { id:'commander', name:'指挥', icon:'帅', move:4, range:1, minRange:1, hp:1.0, atk:1.0,  def:1.0,  desc:'鼓舞全军，攻守自如。' }
};

const TERRAIN = {
  '.': { id:'plain',  name:'平原', color:0x6f8a55, move:1, def:0,  range:0, desc:'视野开阔，无特殊效果。' },
  'p': { id:'road',   name:'官道', color:0x9a8762, move:1, def:0,  range:0, desc:'行军迅速，无特殊效果。' },
  'f': { id:'forest', name:'密林', color:0x3f6242, move:2, def:2,  range:0, desc:'防御+2，弓兵在此隐匿，火攻伤害提升。' },
  'h': { id:'hill',   name:'丘陵', color:0x7d7b4f, move:2, def:3,  range:1, desc:'防御+3，远程射程+1。' },
  'r': { id:'rock',   name:'山岩', color:0x68665e, move:0, def:0,  range:0, desc:'无法通行。' },
  'w': { id:'water',  name:'江水', color:0x3d6f7e, move:0, def:0,  range:0, desc:'无法通行，火计伤害减半。' },
  'b': { id:'bridge', name:'桥',   color:0x8a7352, move:1, def:0,  range:0, desc:'跨江通道，兵家必争。' },
  'v': { id:'village',name:'村落', color:0x8b7550, move:1, def:2,  range:0, desc:'防御+2，每回合恢复少量兵力。' },
  'c': { id:'wall',   name:'城墙', color:0x5c5b52, move:0, def:0,  range:0, desc:'不可通行。' },
  's': { id:'sand',   name:'河滩', color:0x9d8d64, move:1, def:0,  range:0, desc:'松软河滩，行军无碍。' },
  'x': { id:'scorch', name:'焦土', color:0x4d4338, move:1, def:0,  range:0, desc:'被烈焰吞噬过的土地。' }
};

const SKILLS = {
  rende:      { id:'rende', name:'仁德', icon:'仁', cost:60, target:'allAllies', range:0, kind:'heal', power:0.26, desc:'恢复全体友军兵力，并解除负面状态。', fx:'heal' },
  jijiang:    { id:'jijiang', name:'激将', icon:'激', cost:45, target:'allAllies', range:0, kind:'buff', buff:{atk:0.28}, turns:2, desc:'全军攻击提升28%，持续2回合。', fx:'buff' },
  wusheng:    { id:'wusheng', name:'武圣', icon:'圣', cost:60, target:'enemy', range:1, kind:'damage', power:2.35, crit:0.25, desc:'对单体造成235%伤害，暴击率提升。', fx:'slash' },
  yanyue:     { id:'yanyue', name:'拖刀计', icon:'刀', cost:50, target:'enemy', range:1, kind:'damage', power:1.55, debuff:{def:-0.25}, turns:2, desc:'造成155%伤害，并降低目标防御25%。', fx:'slash' },
  paoxiao:    { id:'paoxiao', name:'咆哮', icon:'吼', cost:60, target:'areaSelf', range:2, kind:'damage', power:1.25, debuff:{atk:-0.2}, turns:2, desc:'震慑周围敌军，造成125%伤害并降低攻击。', fx:'shock' },
  duanhe:     { id:'duanhe', name:'燕人断喝', icon:'喝', cost:50, target:'enemy', range:1, kind:'damage', power:1.45, stun:1, desc:'造成145%伤害，并有几率使目标眩晕1回合。', fx:'shock' },
  longdan:    { id:'longdan', name:'龙胆', icon:'胆', cost:55, target:'enemy', range:1, kind:'damage', power:2.05, selfBuff:{speed:0.3}, turns:2, desc:'造成205%伤害，自身速度提升30%。', fx:'slash' },
  qijin:      { id:'qijin', name:'七进七出', icon:'骑', cost:70, target:'areaEnemy', range:1, kind:'damage', power:1.35, healSelf:0.12, desc:'横扫周围敌军，造成135%伤害并恢复自身兵力。', fx:'slash' },
  huoji:      { id:'huoji', name:'火计', icon:'火', cost:70, target:'areaEnemy', range:3, kind:'damage', power:1.55, burn:2, desc:'引燃目标区域，造成155%伤害并附加灼烧。', fx:'fire' },
  dongfeng:   { id:'dongfeng', name:'借东风', icon:'风', cost:55, target:'allAllies', range:0, kind:'buff', buff:{atk:0.18, speed:0.2}, rage:25, turns:3, desc:'全军攻击、速度提升，并恢复25士气。', fx:'wind' },
  liegong:    { id:'liegong', name:'烈弓', icon:'烈', cost:55, target:'enemy', range:3, kind:'damage', power:2.4, desc:'蓄力一箭，造成240%远程伤害。', fx:'arrow' },
  baibu:      { id:'baibu', name:'百步穿杨', icon:'穿', cost:65, target:'lowest', range:99, kind:'damage', power:1.9, desc:'狙杀敌方兵力最低者，造成190%伤害。', fx:'arrow' },
  xiliang:    { id:'xiliang', name:'西凉铁骑', icon:'凉', cost:60, target:'areaEnemy', range:1, kind:'damage', power:1.45, debuff:{def:-0.15}, desc:'铁骑践踏周围敌军，造成145%伤害。', fx:'shock' },
  jingma:     { id:'jingma', name:'锦马超', icon:'锦', cost:50, target:'self', range:0, kind:'buff', buff:{atk:0.22, speed:0.25}, turns:3, desc:'自身攻击与速度大幅提升。', fx:'buff' },
  qimou:      { id:'qimou', name:'奇谋', icon:'奇', cost:50, target:'enemy', range:2, kind:'damage', power:1.7, crit:0.2, desc:'出奇制胜，造成170%伤害。', fx:'slash' },
  ziwugu:     { id:'ziwugu', name:'子午谷', icon:'谷', cost:60, target:'enemy', range:3, kind:'damage', power:1.6, selfBuff:{speed:0.2}, desc:'远距离突袭，造成160%伤害。', fx:'arrow' },
  taiping:    { id:'taiping', name:'太平要术', icon:'太平', cost:60, target:'allAllies', range:0, kind:'heal', power:0.22, desc:'以符水救治全军。', fx:'heal' },
  yaoshu:     { id:'yaoshu', name:'妖术', icon:'妖', cost:60, target:'areaEnemy', range:3, kind:'damage', power:1.25, debuff:{atk:-0.15}, desc:'妖风卷阵，造成伤害并削弱敌军。', fx:'fire' },
  wushuang:   { id:'wushuang', name:'无双', icon:'无', cost:70, target:'allEnemies', range:0, kind:'damage', power:1.05, desc:'方天画戟横扫全场，造成105%伤害。', fx:'slash' },
  fangtian:   { id:'fangtian', name:'画戟', icon:'戟', cost:60, target:'enemy', range:1, kind:'damage', power:2.6, desc:'天下无双的一击，造成260%伤害。', fx:'slash' },
  jianxiong:  { id:'jianxiong', name:'奸雄', icon:'奸', cost:55, target:'allAllies', range:0, kind:'buff', buff:{atk:0.2, def:0.15}, turns:3, desc:'曹军全军攻防提升。', fx:'buff' },
  tuntian:    { id:'tuntian', name:'屯田令', icon:'屯', cost:50, target:'allAllies', range:0, kind:'heal', power:0.18, desc:'以屯田之粮补给全军。', fx:'heal' },
  tiebi:      { id:'tiebi', name:'铁壁', icon:'壁', cost:45, target:'self', range:0, kind:'buff', buff:{def:0.4}, turns:3, desc:'自身防御提升40%。', fx:'buff' },
  jianxiong2: { id:'jianxiong2', name:'挟天子', icon:'挟', cost:60, target:'areaEnemy', range:3, kind:'damage', power:1.45, debuff:{atk:-0.2}, desc:'以天子之名压制敌军。', fx:'shock' },
  baonue:     { id:'baonue', name:'暴虐', icon:'暴', cost:55, target:'areaSelf', range:2, kind:'damage', power:1.3, desc:'董卓军无差别践踏周围。', fx:'shock' },
  kuanggu:    { id:'kuanggu', name:'狂骨', icon:'狂', cost:50, target:'self', range:0, kind:'buff', buff:{atk:0.35, def:-0.15}, turns:3, desc:'以伤换伤，攻击大幅提升。', fx:'buff' },
  jianxiong3: { id:'jianxiong3', name:'断粮', icon:'粮', cost:55, target:'areaEnemy', range:3, kind:'damage', power:1.3, debuff:{def:-0.2}, desc:'焚烧敌军粮草。', fx:'fire' },
  kuirou:     { id:'kuirou', name:'苦肉计', icon:'苦', cost:40, target:'self', range:0, kind:'damageSelf', power:0.15, buff:{atk:0.3}, turns:3, desc:'自损兵力，换取攻击提升。', fx:'buff' },
  huo_chuan:  { id:'huo_chuan', name:'火船', icon:'船', cost:65, target:'areaEnemy', range:3, kind:'damage', power:1.6, burn:2, desc:'火船冲阵，造成伤害并灼烧。', fx:'fire' },
  guwu:       { id:'guwu', name:'鼓舞', icon:'鼓', cost:45, target:'allAllies', range:0, kind:'buff', buff:{atk:0.16}, rage:15, turns:2, desc:'鼓舞士气，全军攻击提升。', fx:'buff' },
  jianxiong4: { id:'jianxiong4', name:'号令', icon:'令', cost:45, target:'allAllies', range:0, kind:'buff', buff:{def:0.18}, turns:2, desc:'严整军阵，全军防御提升。', fx:'buff' },
  heal:       { id:'heal', name:'回春', icon:'春', cost:45, target:'ally', range:3, kind:'heal', power:0.32, desc:'恢复友军兵力。', fx:'heal' },
  mighty:     { id:'mighty', name:'猛击', icon:'猛', cost:45, target:'enemy', range:1, kind:'damage', power:1.8, desc:'全力一击，造成180%伤害。', fx:'slash' },
  arrowRain:  { id:'arrowRain', name:'箭雨', icon:'雨', cost:50, target:'areaEnemy', range:3, kind:'damage', power:1.15, desc:'箭雨覆盖，造成范围伤害。', fx:'arrow' }
};

const GENERALS = {
  /* ---------------- 刘备军 ---------------- */
  liubei: {
    id:'liubei', name:'刘备', courtesy:'玄德', title:'汉室宗亲', faction:'shu', class:'commander', rarity:4,
    base:{ might:73, lead:82, int:74, pol:80, charm:99, speed:12 }, growth:{ might:1.3, lead:1.5, int:1.2, pol:1.3, charm:1.1, speed:.25 },
    skills:['rende','jijiang'], loyalty:100, bio:'中山靖王之后，织席贩履出身，却以仁德聚天下英豪。桃园结义，立志兴复汉室。',
    quote:'“惟贤惟德，能服于人。”',
    portrait:{ skin:'#d9ad88', hair:'#241c16', beard:'short', head:'crown', robe:'#3f7354', armor:'#557c60', accent:'#d3b06a', eye:'kind', brow:'soft', age:38 }
  },
  guanyu: {
    id:'guanyu', name:'关羽', courtesy:'云长', title:'美髯公', faction:'shu', class:'cavalry', rarity:4,
    base:{ might:97, lead:95, int:75, pol:62, charm:93, speed:15 }, growth:{ might:1.1, lead:1.2, int:.9, pol:.6, charm:.7, speed:.2 },
    skills:['wusheng','yanyue'], loyalty:100, bio:'身长九尺，髯长二尺，面如重枣，唇若涂脂。青龙偃月刀在手，义薄云天。',
    quote:'“玉可碎而不可改其白，竹可焚而不可毁其节。”',
    portrait:{ skin:'#b96b50', hair:'#1c1410', beard:'long', head:'guan', robe:'#2f6146', armor:'#476b4a', accent:'#d0ad62', eye:'phoenix', brow:'sharp', age:42 }
  },
  zhangfei: {
    id:'zhangfei', name:'张飞', courtesy:'翼德', title:'万人敌', faction:'shu', class:'spear', rarity:4,
    base:{ might:98, lead:85, int:45, pol:24, charm:62, speed:13 }, growth:{ might:1.2, lead:1.0, int:.5, pol:.2, charm:.4, speed:.2 },
    skills:['paoxiao','duanhe'], loyalty:100, bio:'燕颔虎须，声若巨雷。丈八蛇矛在手，长坂桥头一声断喝，曹军无人敢近。',
    quote:'“燕人张翼德在此，谁敢与我决一死战！”',
    portrait:{ skin:'#bd7f5e', hair:'#17110d', beard:'bushy', head:'helmet', robe:'#423b32', armor:'#4d4a3e', accent:'#b78e4f', eye:'round', brow:'fierce', age:36, plume:'#7d2f27' }
  },
  zhaoyun: {
    id:'zhaoyun', name:'赵云', courtesy:'子龙', title:'常山赵子龙', faction:'shu', class:'cavalry', rarity:4,
    base:{ might:96, lead:91, int:76, pol:65, charm:81, speed:17 }, growth:{ might:1.1, lead:1.1, int:.9, pol:.6, charm:.6, speed:.25 },
    skills:['longdan','qijin'], loyalty:95, bio:'身长八尺，姿颜雄伟。长坂坡单骑救主，七进七出，一身是胆。',
    quote:'“吾乃常山赵子龙也！”',
    portrait:{ skin:'#dcb492', hair:'#2a2018', beard:'none', head:'helmet', robe:'#b9b7a8', armor:'#c3c1b2', accent:'#d8c38e', eye:'sharp', brow:'sword', age:33, plume:'#d7d4c6' }
  },
  zhugeliang: {
    id:'zhugeliang', name:'诸葛亮', courtesy:'孔明', title:'卧龙', faction:'shu', class:'strategist', rarity:4,
    base:{ might:38, lead:92, int:100, pol:95, charm:92, speed:14 }, growth:{ might:.3, lead:1.0, int:1.2, pol:1.1, charm:.8, speed:.2 },
    skills:['huoji','dongfeng'], loyalty:96, bio:'躬耕南阳，不求闻达。三顾茅庐之后，隆中一对，三分天下。',
    quote:'“鞠躬尽瘁，死而后已。”',
    portrait:{ skin:'#e0bb98', hair:'#1f1913', beard:'goatee', head:'scarf', robe:'#d4d0bc', armor:'#b9b5a2', accent:'#d6b978', eye:'calm', brow:'soft', age:30, fan:true }
  },
  huangzhong: {
    id:'huangzhong', name:'黄忠', courtesy:'汉升', title:'老当益壮', faction:'shu', class:'archer', rarity:4,
    base:{ might:93, lead:86, int:62, pol:50, charm:70, speed:12 }, growth:{ might:.9, lead:.8, int:.5, pol:.3, charm:.4, speed:.1 },
    skills:['liegong','baibu'], loyalty:88, bio:'南阳老将，年近六旬仍能开三石之弓。定军山一役，阵斩夏侯渊，名震天下。',
    quote:'“老夫聊发少年狂！”',
    portrait:{ skin:'#c99a76', hair:'#d8d2c2', beard:'white', head:'helmet', robe:'#7a6a4a', armor:'#8a7b58', accent:'#c6a45c', eye:'sharp', brow:'white', age:61, plume:'#d6c6a2' }
  },
  machao: {
    id:'machao', name:'马超', courtesy:'孟起', title:'锦马超', faction:'shu', class:'cavalry', rarity:4,
    base:{ might:97, lead:88, int:44, pol:40, charm:82, speed:18 }, growth:{ might:1.0, lead:.9, int:.4, pol:.3, charm:.5, speed:.3 },
    skills:['xiliang','jingma'], loyalty:82, bio:'西凉锦马超，面如冠玉，目如流星。铁骑所至，曹军闻风丧胆。',
    quote:'“西凉锦马超，今日取你项上人头！”',
    portrait:{ skin:'#dfb28c', hair:'#211913', beard:'none', head:'helmet', robe:'#d9d4c2', armor:'#d2ccb8', accent:'#c9a45f', eye:'sharp', brow:'sword', age:32, plume:'#d5cfbd' }
  },
  zhoucang: {
    id:'zhoucang', name:'周仓', courtesy:'', title:'关西大汉', faction:'shu', class:'infantry', rarity:2,
    base:{ might:82, lead:76, int:35, pol:25, charm:60, speed:12 }, growth:{ might:.8, lead:.7, int:.3, pol:.2, charm:.4, speed:.1 },
    skills:['mighty','tiebi'], loyalty:90, bio:'关羽麾下步卒统领，两臂有千斤之力，忠心不二，常为关羽扛刀。',
    quote:'“愿随关将军，赴汤蹈火！”',
    portrait:{ skin:'#c08a63', hair:'#1e1711', beard:'bushy', head:'yellowband', robe:'#3f6a4c', armor:'#4a6f50', accent:'#c2a05b', eye:'round', brow:'fierce', age:34 }
  },
  weiyan: {
    id:'weiyan', name:'魏延', courtesy:'文长', title:'镇北将军', faction:'shu', class:'infantry', rarity:3,
    base:{ might:92, lead:85, int:61, pol:38, charm:50, speed:13 }, growth:{ might:1.0, lead:.9, int:.5, pol:.3, charm:.3, speed:.2 },
    skills:['qimou','ziwugu'], loyalty:62, bio:'勇略过人，性矜高。曾献子午谷奇谋，未被采纳。',
    quote:'“若用吾计，长安早已在掌中矣。”',
    portrait:{ skin:'#c98962', hair:'#1e1712', beard:'short', head:'helmet', robe:'#5b4c3a', armor:'#655844', accent:'#b9924e', eye:'sharp', brow:'fierce', age:35 }
  },

  /* ---------------- 黄巾 ---------------- */
  zhangjiao: {
    id:'zhangjiao', name:'张角', courtesy:'', title:'天公将军', faction:'yellow', class:'strategist', rarity:4,
    base:{ might:24, lead:85, int:97, pol:70, charm:90, speed:12 }, growth:{ might:.2, lead:.9, int:1.1, pol:.7, charm:.8, speed:.2 },
    skills:['taiping','yaoshu'], loyalty:100, bio:'巨鹿人，得南华老仙传授《太平要术》，以符水治病，聚众数十万，号为黄巾。',
    quote:'“苍天已死，黄天当立；岁在甲子，天下大吉！”',
    portrait:{ skin:'#c8a27e', hair:'#2a2118', beard:'long', head:'daoist', robe:'#b9a05a', armor:'#8f7a42', accent:'#d3b15d', eye:'calm', brow:'soft', age:52 }
  },
  zhangbao: {
    id:'zhangbao', name:'张宝', courtesy:'', title:'地公将军', faction:'yellow', class:'strategist', rarity:3,
    base:{ might:52, lead:72, int:83, pol:40, charm:65, speed:11 }, growth:{ might:.5, lead:.7, int:.8, pol:.3, charm:.4, speed:.1 },
    skills:['yaoshu','heal'], loyalty:95, bio:'张角之弟，号称地公将军，善以妖术惑众。', quote:'“黄天庇佑，万民来朝！”',
    portrait:{ skin:'#c29a74', hair:'#241c14', beard:'short', head:'daoist', robe:'#a88f4c', armor:'#7c6a3c', accent:'#c6a44f', eye:'round', brow:'soft', age:46 }
  },
  zhangliang: {
    id:'zhangliang', name:'张梁', courtesy:'', title:'人公将军', faction:'yellow', class:'infantry', rarity:3,
    base:{ might:78, lead:70, int:58, pol:32, charm:58, speed:12 }, growth:{ might:.8, lead:.6, int:.5, pol:.2, charm:.3, speed:.1 },
    skills:['mighty','guwu'], loyalty:95, bio:'张角之弟，人称人公将军，勇悍好战。', quote:'“黄巾百万，踏破九州！”',
    portrait:{ skin:'#bf8e68', hair:'#241b14', beard:'bushy', head:'yellowband', robe:'#a98c47', armor:'#8c7340', accent:'#c6a44f', eye:'round', brow:'fierce', age:41 }
  },
  chengyuanzhi:{ id:'chengyuanzhi', name:'程远志', courtesy:'', title:'黄巾渠帅', faction:'yellow', class:'cavalry', rarity:2,
    base:{ might:74, lead:58, int:31, pol:20, charm:33, speed:13 }, growth:{ might:.6, lead:.4, int:.2, pol:.1, charm:.2, speed:.1 },
    skills:['mighty','guwu'], loyalty:80, bio:'黄巾渠帅，率众犯涿郡，为关羽所斩。', quote:'“涿郡的钱粮，都是我们的！”',
    portrait:{ skin:'#b9805d', hair:'#1d1610', beard:'bushy', head:'yellowband', robe:'#9f8341', armor:'#846f3d', accent:'#c3a24d', eye:'round', brow:'fierce', age:35 }
  },
  dengmao:{ id:'dengmao', name:'邓茂', courtesy:'', title:'黄巾渠帅', faction:'yellow', class:'infantry', rarity:2,
    base:{ might:68, lead:52, int:28, pol:18, charm:30, speed:11 }, growth:{ might:.5, lead:.4, int:.2, pol:.1, charm:.2, speed:.1 },
    skills:['mighty'], loyalty:78, bio:'黄巾渠帅，与程远志一同进犯涿郡。', quote:'“杀！抢光他们的粮食！”',
    portrait:{ skin:'#b47750', hair:'#211912', beard:'short', head:'yellowband', robe:'#9d8140', armor:'#7f6a3a', accent:'#c3a24d', eye:'round', brow:'fierce', age:33 }
  },

  /* ---------------- 董卓 / 吕布 ---------------- */
  dongzhuo: {
    id:'dongzhuo', name:'董卓', courtesy:'仲颖', title:'相国', faction:'dong', class:'commander', rarity:3,
    base:{ might:82, lead:77, int:64, pol:26, charm:18, speed:10 }, growth:{ might:.7, lead:.6, int:.5, pol:.2, charm:.1, speed:.1 },
    skills:['baonue','kuanggu'], loyalty:100, bio:'西凉军阀，废少帝、立献帝，迁都长安，暴虐无道，天下共讨之。', quote:'“顺我者昌，逆我者亡！”',
    portrait:{ skin:'#b97a5a', hair:'#221912', beard:'bushy', head:'crown', robe:'#4b3a4f', armor:'#5a4759', accent:'#b08a4b', eye:'round', brow:'fierce', age:54 }
  },
  lvbu: {
    id:'lvbu', name:'吕布', courtesy:'奉先', title:'飞将', faction:'lv', class:'cavalry', rarity:4,
    base:{ might:100, lead:100, int:26, pol:13, charm:68, speed:20 }, growth:{ might:1.0, lead:1.0, int:.2, pol:.1, charm:.4, speed:.2 },
    skills:['wushuang','fangtian'], loyalty:70, bio:'身长一丈，腰大十围。方天画戟，赤兔宝马，人中吕布，马中赤兔。', quote:'“天下英雄，可有人敢挡我吕布！”',
    portrait:{ skin:'#d3a47f', hair:'#1d1610', beard:'short', head:'feather', robe:'#8e3c2f', armor:'#a55a3e', accent:'#d9ba62', eye:'sharp', brow:'sword', age:31, plume:'#d9c37c' }
  },
  huaxiong: {
    id:'huaxiong', name:'华雄', courtesy:'', title:'骁骑校尉', faction:'dong', class:'cavalry', rarity:3,
    base:{ might:92, lead:76, int:35, pol:20, charm:42, speed:15 }, growth:{ might:.9, lead:.7, int:.3, pol:.2, charm:.3, speed:.2 },
    skills:['mighty','kuanggu'], loyalty:88, bio:'董卓帐下猛将，虎牢关前连斩诸侯数将，直到遇见关羽。', quote:'“关外诸侯，尽是土鸡瓦狗！”',
    portrait:{ skin:'#b57b56', hair:'#1c150f', beard:'bushy', head:'helmet', robe:'#5a4350', armor:'#65505c', accent:'#b58f4d', eye:'round', brow:'fierce', age:36, plume:'#6e4b53' }
  },
  liru: {
    id:'liru', name:'李儒', courtesy:'', title:'董卓军师', faction:'dong', class:'strategist', rarity:3,
    base:{ might:28, lead:64, int:91, pol:72, charm:35, speed:11 }, growth:{ might:.2, lead:.5, int:.9, pol:.6, charm:.2, speed:.1 },
    skills:['huoji','heal'], loyalty:90, bio:'董卓女婿，多谋而狠毒，是董卓乱政背后的谋主。', quote:'“主公，成大事者，不拘小节。”',
    portrait:{ skin:'#c6a07b', hair:'#241d15', beard:'goatee', head:'scholar', robe:'#534451', armor:'#4a3c48', accent:'#b08a4b', eye:'narrow', brow:'soft', age:44 }
  },
  gaoshun: {
    id:'gaoshun', name:'高顺', courtesy:'', title:'陷阵营', faction:'lv', class:'infantry', rarity:3,
    base:{ might:88, lead:90, int:58, pol:40, charm:55, speed:12 }, growth:{ might:.8, lead:.9, int:.4, pol:.3, charm:.3, speed:.1 },
    skills:['tiebi','mighty'], loyalty:92, bio:'吕布麾下陷阵营统领，铠甲精练，每战必克。', quote:'“陷阵之志，有死无生。”',
    portrait:{ skin:'#c18c66', hair:'#211913', beard:'short', head:'helmet', robe:'#5c4038', armor:'#6b4e42', accent:'#b48b4c', eye:'sharp', brow:'sword', age:35 }
  },
  chenggong: {
    id:'chenggong', name:'陈宫', courtesy:'公台', title:'吕布军师', faction:'lv', class:'strategist', rarity:3,
    base:{ might:35, lead:70, int:88, pol:66, charm:60, speed:12 }, growth:{ might:.3, lead:.6, int:.8, pol:.5, charm:.4, speed:.1 },
    skills:['huoji','jianxiong4'], loyalty:75, bio:'性情刚直，足智多谋。弃曹操而投吕布，最终白门楼就义。', quote:'“吕布虽勇，无谋；吾当为君谋之。”',
    portrait:{ skin:'#d0a47f', hair:'#221b14', beard:'goatee', head:'scholar', robe:'#4b4a44', armor:'#56544c', accent:'#b28c4d', eye:'calm', brow:'sword', age:40 }
  },
  zhangliao: {
    id:'zhangliao', name:'张辽', courtesy:'文远', title:'雁门猛虎', faction:'lv', class:'cavalry', rarity:3,
    base:{ might:92, lead:92, int:74, pol:58, charm:72, speed:16 }, growth:{ might:.9, lead:.9, int:.6, pol:.4, charm:.4, speed:.2 },
    skills:['mighty','guwu'], loyalty:68, bio:'先事吕布，后归曹操。逍遥津八百破十万，威震江东。', quote:'“此战，八百足矣。”',
    portrait:{ skin:'#ce9a72', hair:'#201812', beard:'short', head:'helmet', robe:'#5b4539', armor:'#6a5040', accent:'#b68d4d', eye:'sharp', brow:'sword', age:34 }
  },

  /* ---------------- 曹操军 ---------------- */
  caocao: {
    id:'caocao', name:'曹操', courtesy:'孟德', title:'魏王', faction:'wei', class:'commander', rarity:4,
    base:{ might:80, lead:96, int:94, pol:95, charm:88, speed:13 }, growth:{ might:.7, lead:1.1, int:1.0, pol:1.1, charm:.7, speed:.2 },
    skills:['jianxiong','jianxiong2'], loyalty:100, bio:'治世之能臣，乱世之奸雄。挟天子以令诸侯，扫平北方群雄。', quote:'“宁教我负天下人，休教天下人负我。”',
    portrait:{ skin:'#d2a47e', hair:'#211a13', beard:'short', head:'crown', robe:'#394e6b', armor:'#465d7c', accent:'#c6a25c', eye:'narrow', brow:'sword', age:45 }
  },
  caoren: {
    id:'caoren', name:'曹仁', courtesy:'子孝', title:'大将军', faction:'wei', class:'infantry', rarity:3,
    base:{ might:86, lead:90, int:62, pol:50, charm:56, speed:11 }, growth:{ might:.7, lead:.9, int:.4, pol:.3, charm:.3, speed:.1 },
    skills:['tiebi','guwu'], loyalty:96, bio:'曹操从弟，善守能攻。樊城之战，死守不退。', quote:'“城在人在，城破人亡。”',
    portrait:{ skin:'#c18f68', hair:'#221a13', beard:'short', head:'helmet', robe:'#3d4b64', armor:'#4a5a76', accent:'#bf9c58', eye:'sharp', brow:'sword', age:40, plume:'#5c7395' }
  },
  xiahoudun: {
    id:'xiahoudun', name:'夏侯惇', courtesy:'元让', title:'独眼将军', faction:'wei', class:'cavalry', rarity:3,
    base:{ might:91, lead:88, int:55, pol:45, charm:60, speed:14 }, growth:{ might:.9, lead:.8, int:.4, pol:.3, charm:.3, speed:.2 },
    skills:['mighty','kuanggu'], loyalty:100, bio:'曹操族弟，拔矢啖睛，勇烈无双。', quote:'“父精母血，不可弃也！”',
    portrait:{ skin:'#c28b64', hair:'#201811', beard:'short', head:'helmet', robe:'#3b4b63', armor:'#485b78', accent:'#bf9c58', eye:'one', brow:'fierce', age:39, plume:'#5c7395' }
  },
  xuchu: {
    id:'xuchu', name:'许褚', courtesy:'仲康', title:'虎痴', faction:'wei', class:'infantry', rarity:3,
    base:{ might:96, lead:78, int:32, pol:24, charm:44, speed:12 }, growth:{ might:.9, lead:.6, int:.2, pol:.1, charm:.3, speed:.1 },
    skills:['mighty','kuanggu'], loyalty:100, bio:'谯国谯人，力大无穷，裸衣斗马超，人称虎痴。', quote:'“俺一锤下去，连人带马都成肉泥！”',
    portrait:{ skin:'#bd845d', hair:'#1f1711', beard:'bushy', head:'helmet', robe:'#3e4b5f', armor:'#4a5870', accent:'#b99352', eye:'round', brow:'fierce', age:36, plume:'#596c8a' }
  },
  xiahouyuan: {
    id:'xiahouyuan', name:'夏侯渊', courtesy:'妙才', title:'征西将军', faction:'wei', class:'archer', rarity:3,
    base:{ might:90, lead:86, int:58, pol:42, charm:54, speed:15 }, growth:{ might:.8, lead:.8, int:.4, pol:.3, charm:.3, speed:.2 },
    skills:['arrowRain','guwu'], loyalty:100, bio:'曹操族弟，善于奔袭，三日五百、六日一千，号称神速。', quote:'“兵贵神速！”',
    portrait:{ skin:'#c7936c', hair:'#211a13', beard:'short', head:'helmet', robe:'#3d4d68', armor:'#4a5b78', accent:'#c39d55', eye:'sharp', brow:'sword', age:42, plume:'#5b7192' }
  },
  zhanghe: {
    id:'zhanghe', name:'张郃', courtesy:'儁乂', title:'巧变将军', faction:'wei', class:'cavalry', rarity:3,
    base:{ might:89, lead:89, int:77, pol:58, charm:62, speed:15 }, growth:{ might:.8, lead:.8, int:.7, pol:.4, charm:.4, speed:.2 },
    skills:['mighty','guwu'], loyalty:78, bio:'河北四庭柱之一，用兵巧变，连诸葛亮也忌惮三分。', quote:'“用兵之道，变化无穷。”',
    portrait:{ skin:'#cd9972', hair:'#201812', beard:'goatee', head:'helmet', robe:'#3c4c65', armor:'#495a74', accent:'#bf9b56', eye:'narrow', brow:'soft', age:41, plume:'#5a7190' }
  },
  xuhuang: {
    id:'xuhuang', name:'徐晃', courtesy:'公明', title:'周亚夫之风', faction:'wei', class:'infantry', rarity:3,
    base:{ might:90, lead:88, int:70, pol:55, charm:60, speed:12 }, growth:{ might:.8, lead:.8, int:.6, pol:.4, charm:.3, speed:.1 },
    skills:['tiebi','jianxiong3'], loyalty:82, bio:'曹魏名将，治军严整，有周亚夫之风。樊城解围，长驱直入。', quote:'“军令如山，不得擅动。”',
    portrait:{ skin:'#c48e67', hair:'#211a13', beard:'short', head:'helmet', robe:'#3d4d66', armor:'#4b5c76', accent:'#c19c57', eye:'sharp', brow:'sword', age:43, plume:'#5a7191' }
  },
  simayi: {
    id:'simayi', name:'司马懿', courtesy:'仲达', title:'冢虎', faction:'wei', class:'strategist', rarity:4,
    base:{ might:42, lead:93, int:98, pol:93, charm:80, speed:12 }, growth:{ might:.3, lead:1.0, int:1.1, pol:1.0, charm:.6, speed:.1 },
    skills:['huoji','jianxiong2'], loyalty:55, bio:'鹰视狼顾，隐忍多谋。三国最后的赢家。', quote:'“忍一时风平浪静。”',
    portrait:{ skin:'#d0a17b', hair:'#241d16', beard:'goatee', head:'scholar', robe:'#33445c', armor:'#3e5069', accent:'#bf9a55', eye:'narrow', brow:'soft', age:47 }
  },

  /* ---------------- 刘表 / 孙权 / 刘璋 / 张鲁 ---------------- */
  liubiao: {
    id:'liubiao', name:'刘表', courtesy:'景升', title:'荆州牧', faction:'liubiao', class:'commander', rarity:3,
    base:{ might:50, lead:78, int:72, pol:84, charm:80, speed:10 }, growth:{ might:.4, lead:.6, int:.6, pol:.8, charm:.6, speed:.1 },
    skills:['guwu','heal'], loyalty:100, bio:'汉室宗亲，镇守荆州多年，坐拥长江之险，却无争天下之志。', quote:'“荆州沃野千里，自守足矣。”',
    portrait:{ skin:'#d4aa85', hair:'#2b231a', beard:'long', head:'crown', robe:'#3f6a63', armor:'#4a756c', accent:'#c4a15b', eye:'calm', brow:'soft', age:55 }
  },
  caimao: {
    id:'caimao', name:'蔡瑁', courtesy:'德珪', title:'荆州水军都督', faction:'liubiao', class:'archer', rarity:2,
    base:{ might:65, lead:75, int:66, pol:58, charm:45, speed:12 }, growth:{ might:.5, lead:.6, int:.5, pol:.4, charm:.3, speed:.1 },
    skills:['arrowRain','guwu'], loyalty:55, bio:'荆州水军统领，刘表妻弟。', quote:'“荆州水军，天下无双。”',
    portrait:{ skin:'#c6936d', hair:'#241c14', beard:'short', head:'helmet', robe:'#3d625b', armor:'#47706a', accent:'#b99c5e', eye:'narrow', brow:'soft', age:44, plume:'#4e7e77' }
  },
  wenpin: {
    id:'wenpin', name:'文聘', courtesy:'仲业', title:'江夏太守', faction:'liubiao', class:'infantry', rarity:2,
    base:{ might:78, lead:80, int:62, pol:50, charm:55, speed:11 }, growth:{ might:.6, lead:.7, int:.4, pol:.3, charm:.3, speed:.1 },
    skills:['tiebi','mighty'], loyalty:70, bio:'刘表大将，后归曹操，镇守江夏数十年。', quote:'“守土有责。”',
    portrait:{ skin:'#c28c65', hair:'#201812', beard:'short', head:'helmet', robe:'#3e625b', armor:'#4a6e66', accent:'#b89a5c', eye:'sharp', brow:'sword', age:38, plume:'#4e7e77' }
  },
  kuaiyue: {
    id:'kuaiyue', name:'蒯越', courtesy:'异度', title:'荆州别驾', faction:'liubiao', class:'strategist', rarity:2,
    base:{ might:32, lead:60, int:82, pol:78, charm:64, speed:11 }, growth:{ might:.2, lead:.4, int:.7, pol:.6, charm:.4, speed:.1 },
    skills:['huoji','heal'], loyalty:65, bio:'荆州名士，足智多谋，辅佐刘表平定荆襄。', quote:'“治乱者，当先权谋。”',
    portrait:{ skin:'#d1a27d', hair:'#241d15', beard:'goatee', head:'scholar', robe:'#3e635c', armor:'#476c64', accent:'#bb9d5e', eye:'calm', brow:'soft', age:46 }
  },
  huangzu: {
    id:'huangzu', name:'黄祖', courtesy:'', title:'江夏守将', faction:'liubiao', class:'archer', rarity:2,
    base:{ might:70, lead:72, int:50, pol:38, charm:40, speed:12 }, growth:{ might:.6, lead:.5, int:.4, pol:.2, charm:.2, speed:.1 },
    skills:['arrowRain','tiebi'], loyalty:60, bio:'刘表部将，镇守江夏，曾射杀孙坚。', quote:'“江东小儿，休得猖狂！”',
    portrait:{ skin:'#b9825d', hair:'#1f1711', beard:'bushy', head:'helmet', robe:'#3f625a', armor:'#4a6d65', accent:'#b59758', eye:'round', brow:'fierce', age:48, plume:'#4e7b73' }
  },
  sunquan: {
    id:'sunquan', name:'孙权', courtesy:'仲谋', title:'吴侯', faction:'wu', class:'commander', rarity:4,
    base:{ might:61, lead:86, int:80, pol:88, charm:90, speed:12 }, growth:{ might:.5, lead:.8, int:.7, pol:.9, charm:.8, speed:.1 },
    skills:['guwu','jianxiong4'], loyalty:100, bio:'生子当如孙仲谋。继承父兄基业，坐断东南。', quote:'“孤与刘豫州，共破曹贼！”',
    portrait:{ skin:'#dcb08a', hair:'#211a13', beard:'short', head:'crown', robe:'#8f3f30', armor:'#a64a38', accent:'#d4b263', eye:'sharp', brow:'sword', age:32 }
  },
  zhouyu: {
    id:'zhouyu', name:'周瑜', courtesy:'公瑾', title:'美周郎', faction:'wu', class:'strategist', rarity:4,
    base:{ might:71, lead:97, int:96, pol:85, charm:96, speed:15 }, growth:{ might:.5, lead:1.0, int:1.0, pol:.8, charm:.8, speed:.2 },
    skills:['huo_chuan','guwu'], loyalty:100, bio:'姿质风流，仪容秀丽。赤壁一把火，烧尽曹操八十万大军。', quote:'“既生瑜，何生亮！”',
    portrait:{ skin:'#e0b690', hair:'#1f1812', beard:'none', head:'helmet', robe:'#a54a38', armor:'#b45b43', accent:'#d8ba6c', eye:'sharp', brow:'sword', age:33, plume:'#d8b978' }
  },
  huanggai: {
    id:'huanggai', name:'黄盖', courtesy:'公覆', title:'苦肉将军', faction:'wu', class:'infantry', rarity:3,
    base:{ might:84, lead:82, int:64, pol:52, charm:60, speed:11 }, growth:{ might:.7, lead:.7, int:.5, pol:.3, charm:.3, speed:.1 },
    skills:['kuirou','huo_chuan'], loyalty:96, bio:'东吴三世老将，赤壁之战诈降曹操，以火船破敌。', quote:'“为了江东，老夫这把骨头，烧了也值！”',
    portrait:{ skin:'#b77f59', hair:'#cec7b6', beard:'white', head:'helmet', robe:'#8f3d2f', armor:'#a04937', accent:'#c9a45f', eye:'sharp', brow:'white', age:58, plume:'#c9b477' }
  },
  liuzhang: {
    id:'liuzhang', name:'刘璋', courtesy:'季玉', title:'益州牧', faction:'liuzhang', class:'commander', rarity:3,
    base:{ might:40, lead:62, int:55, pol:65, charm:62, speed:10 }, growth:{ might:.3, lead:.5, int:.4, pol:.5, charm:.5, speed:.1 },
    skills:['heal','tiebi'], loyalty:100, bio:'益州牧，性宽柔而无断，坐拥天府之国，终为刘备所取。', quote:'“吾父子在蜀二十余年，无恩德以加百姓。”',
    portrait:{ skin:'#d9ae87', hair:'#2a221a', beard:'short', head:'crown', robe:'#6e5f3e', armor:'#7c6d49', accent:'#c2a05a', eye:'calm', brow:'soft', age:46 }
  },
  zhangren: {
    id:'zhangren', name:'张任', courtesy:'', title:'益州枪王', faction:'liuzhang', class:'spear', rarity:3,
    base:{ might:89, lead:84, int:71, pol:50, charm:58, speed:13 }, growth:{ might:.8, lead:.8, int:.5, pol:.3, charm:.3, speed:.1 },
    skills:['mighty','tiebi'], loyalty:85, bio:'益州名将，枪法精绝，落凤坡设伏射杀庞统。', quote:'“益州之地，岂容外兵践踏！”',
    portrait:{ skin:'#c18b65', hair:'#201812', beard:'short', head:'helmet', robe:'#665739', armor:'#756443', accent:'#bf9d59', eye:'sharp', brow:'sword', age:37, plume:'#8b754c' }
  },
  yanxiang: {
    id:'yanxiang', name:'严颜', courtesy:'', title:'巴郡太守', faction:'liuzhang', class:'infantry', rarity:3,
    base:{ might:84, lead:80, int:60, pol:52, charm:66, speed:10 }, growth:{ might:.7, lead:.7, int:.4, pol:.3, charm:.4, speed:.1 },
    skills:['tiebi','guwu'], loyalty:80, bio:'巴郡老将，宁死不降，后被张飞义释。', quote:'“但有断头将军，无降将军！”',
    portrait:{ skin:'#b9835d', hair:'#d3ccba', beard:'white', head:'helmet', robe:'#675a3c', armor:'#766746', accent:'#bd9c58', eye:'sharp', brow:'white', age:59, plume:'#9b8555' }
  },
  zhanglu: {
    id:'zhanglu', name:'张鲁', courtesy:'公祺', title:'师君', faction:'zhanglu', class:'strategist', rarity:3,
    base:{ might:34, lead:65, int:80, pol:72, charm:78, speed:11 }, growth:{ might:.2, lead:.5, int:.7, pol:.5, charm:.6, speed:.1 },
    skills:['taiping','heal'], loyalty:100, bio:'五斗米道教主，据汉中三十年，以教治民。', quote:'“汉中乐土，不染兵戈。”',
    portrait:{ skin:'#cba681', hair:'#2a2118', beard:'long', head:'daoist', robe:'#7d6b44', armor:'#6d5d3c', accent:'#c1a05a', eye:'calm', brow:'soft', age:50 }
  },
  yangren: {
    id:'yangren', name:'杨任', courtesy:'', title:'汉中大将', faction:'zhanglu', class:'strategist', rarity:2,
    base:{ might:52, lead:70, int:76, pol:50, charm:45, speed:11 }, growth:{ might:.4, lead:.5, int:.6, pol:.3, charm:.3, speed:.1 },
    skills:['huoji','heal'], loyalty:78, bio:'张鲁麾下大将，善使妖法。', quote:'“五斗米道，护我汉中。”',
    portrait:{ skin:'#bd916b', hair:'#241c14', beard:'short', head:'daoist', robe:'#776641', armor:'#68593a', accent:'#bb9b57', eye:'narrow', brow:'soft', age:42 }
  },
  yanpu: {
    id:'yanpu', name:'阎圃', courtesy:'', title:'汉中谋士', faction:'zhanglu', class:'strategist', rarity:2,
    base:{ might:30, lead:58, int:78, pol:68, charm:54, speed:10 }, growth:{ might:.2, lead:.4, int:.7, pol:.5, charm:.3, speed:.1 },
    skills:['heal','guwu'], loyalty:70, bio:'张鲁谋主，劝张鲁降曹以保百姓。', quote:'“识时务者，为俊杰。”',
    portrait:{ skin:'#cfa37e', hair:'#241d15', beard:'goatee', head:'scholar', robe:'#756541', armor:'#675839', accent:'#ba9a56', eye:'calm', brow:'soft', age:45 }
  }
};

const MOOKS = {
  yellowBrute:  { name:'黄巾力士', class:'infantry', faction:'yellow', rarity:1, base:{might:62,lead:48,int:20,pol:10,charm:20,speed:10}, skills:['mighty'], portrait:{skin:'#b57e58',hair:'#1d1610',beard:'bushy',head:'yellowband',robe:'#977d3e',armor:'#7d6939',accent:'#c3a24d',eye:'round',brow:'fierce',age:30} },
  yellowArcher: { name:'黄巾弓手', class:'archer', faction:'yellow', rarity:1, base:{might:55,lead:42,int:25,pol:10,charm:20,speed:11}, skills:['arrowRain'], portrait:{skin:'#b57e58',hair:'#1d1610',beard:'short',head:'yellowband',robe:'#977d3e',armor:'#7d6939',accent:'#c3a24d',eye:'round',brow:'soft',age:28} },
  dongBrute:    { name:'西凉锐士', class:'infantry', faction:'dong', rarity:2, base:{might:76,lead:62,int:30,pol:15,charm:25,speed:11}, skills:['mighty'], portrait:{skin:'#b97f59',hair:'#1e1711',beard:'short',head:'helmet',robe:'#594653',armor:'#66525e',accent:'#b28d4d',eye:'round',brow:'fierce',age:32,plume:'#70505a'} },
  dongCavalry:  { name:'西凉铁骑', class:'cavalry', faction:'dong', rarity:2, base:{might:80,lead:64,int:28,pol:12,charm:25,speed:14}, skills:['mighty'], portrait:{skin:'#b97f59',hair:'#1e1711',beard:'short',head:'helmet',robe:'#594653',armor:'#66525e',accent:'#b28d4d',eye:'round',brow:'fierce',age:32,plume:'#70505a'} },
  dongArcher:   { name:'西凉弓手', class:'archer', faction:'dong', rarity:2, base:{might:70,lead:56,int:34,pol:12,charm:24,speed:12}, skills:['arrowRain'], portrait:{skin:'#b97f59',hair:'#1e1711',beard:'short',head:'helmet',robe:'#594653',armor:'#66525e',accent:'#b28d4d',eye:'narrow',brow:'soft',age:29,plume:'#70505a'} },
  weiInfantry:  { name:'曹军步卒', class:'infantry', faction:'wei', rarity:2, base:{might:74,lead:66,int:35,pol:20,charm:28,speed:11}, skills:['tiebi'], portrait:{skin:'#c18c66',hair:'#211a13',beard:'short',head:'helmet',robe:'#3d4c64',armor:'#4a5b75',accent:'#bf9b57',eye:'sharp',brow:'sword',age:30,plume:'#5b7190'} },
  weiArcher:    { name:'曹军弓手', class:'archer', faction:'wei', rarity:2, base:{might:66,lead:60,int:40,pol:20,charm:28,speed:12}, skills:['arrowRain'], portrait:{skin:'#c18c66',hair:'#211a13',beard:'short',head:'helmet',robe:'#3d4c64',armor:'#4a5b75',accent:'#bf9b57',eye:'sharp',brow:'soft',age:28,plume:'#5b7190'} },
  weiCavalry:   { name:'虎豹骑', class:'cavalry', faction:'wei', rarity:3, base:{might:84,lead:72,int:35,pol:18,charm:30,speed:15}, skills:['mighty'], portrait:{skin:'#c18c66',hair:'#211a13',beard:'short',head:'helmet',robe:'#334156',armor:'#40506a',accent:'#c8a25a',eye:'sharp',brow:'fierce',age:31,plume:'#526b8c'} },
  jingArcher:   { name:'荆州弓手', class:'archer', faction:'liubiao', rarity:2, base:{might:65,lead:58,int:38,pol:18,charm:28,speed:12}, skills:['arrowRain'], portrait:{skin:'#c6936d',hair:'#241c14',beard:'short',head:'helmet',robe:'#3e635c',armor:'#4a6e66',accent:'#b99c5e',eye:'narrow',brow:'soft',age:30,plume:'#4f7e76'} },
  wuMarine:     { name:'江东水军', class:'infantry', faction:'wu', rarity:2, base:{might:72,lead:68,int:40,pol:22,charm:32,speed:12}, skills:['mighty'], portrait:{skin:'#d3a27d',hair:'#241c14',beard:'short',head:'helmet',robe:'#8f3e2f',armor:'#a04a37',accent:'#cba75e',eye:'sharp',brow:'sword',age:29,plume:'#c9a45f'} },
  shuInfantry:  { name:'蜀军锐士', class:'infantry', faction:'shu', rarity:2, base:{might:80,lead:70,int:42,pol:25,charm:36,speed:12}, skills:['mighty'], portrait:{skin:'#ce9a73',hair:'#211912',beard:'short',head:'helmet',robe:'#3c6b4f',armor:'#487a5b',accent:'#c6a35c',eye:'sharp',brow:'sword',age:30,plume:'#5a8a68'} }
};

const ITEMS = {
  shuanggu:   { id:'shuanggu', name:'雌雄双股剑', type:'weapon', rarity:2, icon:'剑', stats:{atk:8,crit:.03}, price:520, desc:'刘备随身佩剑，一雌一雄，轻灵锋利。' },
  qinglong:   { id:'qinglong', name:'青龙偃月刀', type:'weapon', rarity:4, icon:'刀', stats:{atk:22,crit:.1}, price:2200, desc:'重八十二斤，刀身如青龙偃月。关羽持之，威震华夏。' },
  zhangba:    { id:'zhangba', name:'丈八蛇矛', type:'weapon', rarity:4, icon:'矛', stats:{atk:19,def:3,counter:.15}, price:2000, desc:'矛长丈八，如蛇吐信。张飞持之，喝断长坂桥。' },
  longdan:    { id:'longdan', name:'龙胆亮银枪', type:'weapon', rarity:3, icon:'枪', stats:{atk:16,speed:2}, price:1500, desc:'银光如龙，赵云少年时所佩。' },
  yitian:     { id:'yitian', name:'倚天剑', type:'weapon', rarity:3, icon:'剑', stats:{atk:14,int:6}, price:1400, desc:'曹操佩剑，削铁如泥。' },
  guding:     { id:'guding', name:'古锭刀', type:'weapon', rarity:2, icon:'刀', stats:{atk:11}, price:760, desc:'江东孙氏旧兵，刀身古拙。' },
  fangtian:   { id:'fangtian', name:'方天画戟', type:'weapon', rarity:4, icon:'戟', stats:{atk:25}, price:2600, desc:'吕布神兵，戟锋如月，天下无双。' },
  mingguang:  { id:'mingguang', name:'明光铠', type:'armor', rarity:3, icon:'甲', stats:{def:14,hp:80}, price:1300, desc:'胸甲光明如镜，刀箭难入。' },
  suozi:      { id:'suozi', name:'锁子甲', type:'armor', rarity:2, icon:'甲', stats:{def:10,hp:40}, price:720, desc:'环环相扣，轻便坚韧。' },
  tengjia:    { id:'tengjia', name:'藤甲', type:'armor', rarity:3, icon:'甲', stats:{def:17,hp:40}, price:1200, desc:'藤浸桐油，刀枪不入，唯惧火攻。', weakness:'fire' },
  delu:       { id:'delu', name:'的卢', type:'horse', rarity:3, icon:'马', stats:{speed:1,move:1,hp:60}, price:1200, desc:'额上有白纹，虽妨主，却跃马檀溪，救刘备一命。' },
  chitu:      { id:'chitu', name:'赤兔', type:'horse', rarity:4, icon:'马', stats:{speed:3,move:2,atk:5}, price:2400, desc:'日行千里，夜走八百。人中吕布，马中赤兔。' },
  jueying:    { id:'jueying', name:'绝影', type:'horse', rarity:3, icon:'马', stats:{speed:2,hp:80}, price:1100, desc:'曹操名驹，奔行如影，矢石不能及。' },
  sunzi:      { id:'sunzi', name:'孙子兵法', type:'treasure', rarity:4, icon:'书', stats:{int:12,skill:.15}, price:2000, desc:'兵者，诡道也。智谋伤害提升15%。' },
  mengde:     { id:'mengde', name:'孟德新书', type:'treasure', rarity:3, icon:'书', stats:{int:8,atk:5}, price:1200, desc:'曹操亲著兵书，集诸家之长。' },
  qingnang:   { id:'qingnang', name:'青囊书', type:'treasure', rarity:3, icon:'卷', stats:{int:6,heal:.2}, price:1000, desc:'华佗所遗医书，战法治疗提升20%。' },
  taiping:    { id:'taiping', name:'太平要术', type:'treasure', rarity:4, icon:'卷', stats:{int:14,rage:10}, price:2400, desc:'南华老仙所授，可呼风唤雨，撒豆成兵。' }
};

const SETS = {
  taoyuan: { id:'taoyuan', name:'桃园之义', items:['shuanggu','delu','qingnang'], 2:{stats:{hp:100},desc:'兵力 +100'}, 3:{stats:{atk:8,heal:.15},desc:'攻击 +8，治疗 +15%'} },
  weiwu:   { id:'weiwu', name:'魏武雄风', items:['yitian','jueying','mengde','mingguang'], 2:{stats:{atk:8},desc:'攻击 +8'}, 4:{stats:{atk:15,int:8,crit:.05},desc:'攻击 +15，智力 +8，暴击 +5%'} },
  xiliang: { id:'xiliang', name:'西凉铁骑', items:['fangtian','chitu','suozi'], 2:{stats:{speed:1},desc:'速度 +1'}, 3:{stats:{atk:12,counter:.1},desc:'攻击 +12，反击 +10%'} },
  jiangdong:{ id:'jiangdong', name:'江东基业', items:['guding','tengjia','taiping'], 2:{stats:{def:6},desc:'防御 +6'}, 3:{stats:{int:8,rage:10},desc:'智力 +8，初始士气 +10'} }
};

const FORMATIONS = {
  yulin: { id:'yulin', name:'鱼鳞阵', icon:'鳞', desc:'防御+10%，稳如磐石。', buff:{def:.1} },
  fengshi:{ id:'fengshi',name:'锋矢阵', icon:'矢', desc:'攻击+12%，锋芒毕露。', buff:{atk:.12} },
  fangyuan:{ id:'fangyuan',name:'方圆阵', icon:'圆', desc:'全军防御+6%，远程减伤15%。', buff:{def:.06}, rangedDef:.15 },
  heyi:  { id:'heyi', name:'鹤翼阵', icon:'翼', desc:'暴击+8%，两翼包抄。', buff:{crit:.08} }
};

const TECHS = {
  bingfa: {
    id:'bingfa', name:'兵法', icon:'策', color:'#c9a45f', sub:'阵形 · 奇谋 · 火攻',
    nodes:[
      { id:'array', name:'鱼鳞阵列', cost:1, desc:'全军防御提升8%。', effect:{def:.08} },
      { id:'raid', name:'轻骑急袭', cost:2, desc:'全军移动力+1，骑兵额外+1。', effect:{move:1,cavMove:1}, req:['array'] },
      { id:'fire', name:'火攻之术', cost:3, desc:'火计与灼烧伤害提升30%。', effect:{fire:.3}, req:['raid'] },
      { id:'strategy', name:'庙算', cost:4, desc:'战法伤害提升20%，初始士气+15。', effect:{skill:.2,rage:15}, req:['fire'] }
    ]
  },
  nongzheng: {
    id:'nongzheng', name:'农政', icon:'农', color:'#9fbf7f', sub:'屯田 · 商贸 · 民心',
    nodes:[
      { id:'tuntian', name:'屯田制', cost:1, desc:'城池粮草收入提升20%。', effect:{food:.2} },
      { id:'shanggu', name:'通商惠工', cost:2, desc:'城池金钱收入提升20%。', effect:{gold:.2}, req:['tuntian'] },
      { id:'minxin', name:'民心归附', cost:3, desc:'每回合治安+1，征兵消耗降低15%。', effect:{order:1,recruit:.15}, req:['shanggu'] },
      { id:'huji', name:'编户齐民', cost:4, desc:'征兵数量提升30%，粮草消耗降低15%。', effect:{recruitAmt:.3,foodUse:.15}, req:['minxin'] }
    ]
  },
  gongzao: {
    id:'gongzao', name:'工造', icon:'工', color:'#8fb6c7', sub:'锻兵 · 甲胄 · 良马',
    nodes:[
      { id:'forging', name:'百炼锻兵', cost:1, desc:'全军攻击提升8%。', effect:{atk:.08} },
      { id:'armor', name:'玄甲精工', cost:2, desc:'全军防御提升8%，兵力上限+10%。', effect:{def:.08,hp:.1}, req:['forging'] },
      { id:'siege', name:'攻城器械', cost:3, desc:'战法伤害提升10%，攻城时敌军防御-15%。', effect:{skill:.1,siege:.15}, req:['armor'] },
      { id:'horses', name:'西凉良马', cost:4, desc:'骑兵移动+1，速度+20%。', effect:{cavMove:1,cavSpeed:.2}, req:['siege'] }
    ]
  }
};

const BUILDINGS = {
  farm:    { id:'farm', name:'农田', icon:'田', desc:'提升粮草收入', base:280, max:5 },
  market:  { id:'market', name:'市集', icon:'市', desc:'提升金钱收入', base:260, max:5 },
  barracks:{ id:'barracks', name:'兵营', icon:'营', desc:'提升兵员上限与征兵效率', base:320, max:5 },
  wall:    { id:'wall', name:'城墙', icon:'墙', desc:'提升城防，守城时减伤', base:300, max:5 },
  academy: { id:'academy', name:'书院', icon:'书', desc:'每回合产出科技点', base:350, max:5 },
  forge:   { id:'forge', name:'铁匠铺', icon:'炉', desc:'全军攻击+1%/级，商肆折扣', base:320, max:5 }
};

const CITIES = {
  zhuojun:  { id:'zhuojun', name:'涿郡', region:'幽州', x:.695, y:.105, owner:'shu', level:2, troops:3200, gold:900, food:3400, order:78, morale:82, defenses:16,
    terrain:'plain', chart:'zhuojunField', desc:'刘备故乡。桃园结义之地，北临幽燕，南望中原。',
    buildings:{farm:2,market:1,barracks:2,wall:1,academy:1,forge:1}, governor:'liubei', generals:['liubei','guanyu','zhangfei'], adjacent:['yecheng'] },
  yecheng:  { id:'yecheng', name:'邺城', region:'冀州', x:.585, y:.255, owner:'yellow', level:2, troops:3600, gold:1100, food:3200, order:48, morale:76, defenses:22,
    terrain:'plain', chart:'yecheng', desc:'河北重镇，袁氏根基。今为黄巾余部所据，城高粮足。',
    buildings:{farm:2,market:2,barracks:2,wall:2,academy:0,forge:1}, governor:null, generals:['zhangbao','zhangliang','chengyuanzhi','dengmao'], adjacent:['zhuojun','luoyang','xuchang'] },
  luoyang:  { id:'luoyang', name:'洛阳', region:'司隶', x:.435, y:.345, owner:'dong', level:4, troops:6800, gold:2200, food:5200, order:35, morale:70, defenses:38,
    terrain:'city', chart:'luoyang', desc:'汉室旧都，天下之中。董卓焚城西迁，虎牢关外烽烟未散。',
    buildings:{farm:2,market:4,barracks:3,wall:4,academy:2,forge:2}, governor:null, generals:['huaxiong','liru','guosi'], adjacent:['yecheng','xuchang','xinye','hanzhong'] },
  xuchang:  { id:'xuchang', name:'许昌', region:'豫州', x:.565, y:.425, owner:'wei', level:3, troops:5400, gold:1800, food:4600, order:72, morale:85, defenses:30,
    terrain:'plain', chart:'xuchang', desc:'曹操奉天子以令诸侯之地，屯田之策自此而兴。',
    buildings:{farm:4,market:3,barracks:3,wall:3,academy:2,forge:2}, governor:'caocao', generals:['caoren','xiahoudun','xuchu'], adjacent:['yecheng','luoyang','xuzhou','xinye'] },
  xuzhou:   { id:'xuzhou', name:'徐州', region:'徐州', x:.745, y:.405, owner:'lv', level:3, troops:4200, gold:1500, food:3900, order:50, morale:78, defenses:28,
    terrain:'plain', chart:'xuzhou', desc:'陶谦三让徐州，吕布乘虚而入。此城连接青徐，乃兵家要冲。',
    buildings:{farm:3,market:2,barracks:3,wall:2,academy:1,forge:2}, governor:null, generals:['gaoshun','chenggong','zhangliao'], adjacent:['xuchang','jianye'] },
  xinye:    { id:'xinye', name:'新野', region:'荆州', x:.465, y:.555, owner:'liubiao', level:2, troops:3400, gold:950, food:3600, order:66, morale:74, defenses:20,
    terrain:'forest', chart:'xinye', desc:'荆州北门，小城一座，却因卧龙而名动天下。',
    buildings:{farm:2,market:1,barracks:2,wall:1,academy:1,forge:1}, governor:null, generals:['caimao','wenpin','kuaiyue'], adjacent:['luoyang','xuchang','jiangxia','hanzhong'] },
  jiangxia: { id:'jiangxia', name:'江夏', region:'荆州', x:.59, y:.635, owner:'liubiao', level:3, troops:3800, gold:1300, food:3700, order:62, morale:76, defenses:26,
    terrain:'river', chart:'jiangxia', desc:'长江与汉水交汇处，刘表水军驻泊之地。赤壁之战前哨。',
    buildings:{farm:2,market:2,barracks:3,wall:2,academy:1,forge:1}, governor:null, generals:['huangzu','caimao','liubiao'], adjacent:['xinye','chibi','jianye'] },
  chibi:    { id:'chibi', name:'赤壁', region:'荆州', x:.63, y:.745, owner:'wei', level:4, troops:6400, gold:2000, food:4800, order:60, morale:88, defenses:32,
    terrain:'river', chart:'chibi', desc:'长江南岸，断崖如削。曹操连舟百里，东风一起，樯橹灰飞烟灭。',
    buildings:{farm:2,market:3,barracks:4,wall:3,academy:2,forge:2}, governor:'caocao', generals:['xiahouyuan','zhanghe','xuhuang'], adjacent:['jiangxia','jianye'] },
  jianye:   { id:'jianye', name:'建业', region:'扬州', x:.805, y:.595, owner:'wu', level:4, troops:7000, gold:2400, food:5400, order:80, morale:86, defenses:36,
    terrain:'river', chart:'jianye', desc:'孙权治所，虎踞龙盘。江东子弟，据长江天险。',
    buildings:{farm:4,market:4,barracks:3,wall:3,academy:2,forge:2}, governor:'sunquan', generals:['zhouyu','huanggai','sunquan'], adjacent:['xuzhou','jiangxia','chibi'] },
  hanzhong: { id:'hanzhong', name:'汉中', region:'益州', x:.275, y:.475, owner:'zhanglu', level:3, troops:4600, gold:1500, food:4200, order:70, morale:76, defenses:34,
    terrain:'hill', chart:'hanzhong', desc:'秦岭之南，沃野千里。定军山一役，决定蜀汉基业。',
    buildings:{farm:3,market:2,barracks:3,wall:3,academy:2,forge:2}, governor:'zhanglu', generals:['zhanglu','yangren','yanpu'], adjacent:['luoyang','xinye','chengdu'] },
  chengdu:  { id:'chengdu', name:'成都', region:'益州', x:.17, y:.625, owner:'liuzhang', level:4, troops:5200, gold:2100, food:5800, order:74, morale:78, defenses:34,
    terrain:'plain', chart:'chengdu', desc:'天府之国，沃野千里。刘璋暗弱，坐拥益州而不知守。',
    buildings:{farm:5,market:3,barracks:3,wall:3,academy:2,forge:2}, governor:'liuzhang', generals:['liuzhang','zhangren','yanxiang'], adjacent:['hanzhong'] }
};

/* 额外敌方武将（仅战场出现，用于完整阵营） */
Object.assign(GENERALS, {
  guosi: { id:'guosi', name:'郭汜', courtesy:'', title:'董卓部将', faction:'dong', class:'cavalry', rarity:2,
    base:{might:78,lead:64,int:32,pol:18,charm:26,speed:13}, growth:{might:.6,lead:.5,int:.2,pol:.1,charm:.2,speed:.1},
    skills:['mighty'], loyalty:75, bio:'董卓麾下悍将，与李傕一同把持朝政。', quote:'“西凉铁骑，天下无敌！”',
    portrait:{skin:'#b87c57',hair:'#1e1711',beard:'bushy',head:'helmet',robe:'#584552',armor:'#65515d',accent:'#b18c4c',eye:'round',brow:'fierce',age:34,plume:'#6e4e58'} },
  lidian: { id:'lidian', name:'李典', courtesy:'曼成', title:'破虏将军', faction:'wei', class:'infantry', rarity:2,
    base:{might:76,lead:78,int:68,pol:50,charm:55,speed:11}, growth:{might:.6,lead:.6,int:.5,pol:.3,charm:.3,speed:.1},
    skills:['tiebi','guwu'], loyalty:85, bio:'曹操麾下儒将，深明大义。', quote:'“军旅之事，不可轻率。”',
    portrait:{skin:'#c9946e',hair:'#221a13',beard:'short',head:'helmet',robe:'#3e4d65',armor:'#4b5b74',accent:'#bd9a56',eye:'calm',brow:'soft',age:36,plume:'#5a708f'} },
  yujin: { id:'yujin', name:'于禁', courtesy:'文则', title:'左将军', faction:'wei', class:'spear', rarity:2,
    base:{might:80,lead:82,int:60,pol:45,charm:50,speed:11}, growth:{might:.6,lead:.7,int:.4,pol:.3,charm:.3,speed:.1},
    skills:['tiebi','mighty'], loyalty:70, bio:'曹魏五子良将，治军严整。', quote:'“军法如山。”',
    portrait:{skin:'#c08a63',hair:'#201812',beard:'short',head:'helmet',robe:'#3c4b63',armor:'#495972',accent:'#bb9855',eye:'sharp',brow:'sword',age:42,plume:'#596f8e'} },
  caochun:{ id:'caochun', name:'曹纯', courtesy:'子和', title:'虎豹骑统领', faction:'wei', class:'cavalry', rarity:3,
    base:{might:85,lead:82,int:55,pol:40,charm:50,speed:16}, growth:{might:.7,lead:.7,int:.4,pol:.2,charm:.3,speed:.2},
    skills:['mighty','guwu'], loyalty:92, bio:'曹操族弟，统领虎豹骑，长坂坡一日一夜追三百里。', quote:'“虎豹骑出，天下无阵！”',
    portrait:{skin:'#c58f68',hair:'#211a13',beard:'short',head:'helmet',robe:'#36445b',armor:'#43536d',accent:'#c19d57',eye:'sharp',brow:'fierce',age:35,plume:'#546b8c'} }
});

const WEATHERS = {
  clear: { id:'clear', name:'晴', icon:'晴', desc:'风和日丽，无特殊影响。', color:'#d8c8a0' },
  wind:  { id:'wind',  name:'风', icon:'风', desc:'火攻伤害提升30%，弓兵射程+1。', color:'#a8c1b4' },
  rain:  { id:'rain',  name:'雨', icon:'雨', desc:'火攻失效，弓兵命中降低，移动-1。', color:'#8fa9b8' },
  fog:   { id:'fog',   name:'雾', icon:'雾', desc:'远程射程-1，命中降低。', color:'#b9b7a8' },
  snow:  { id:'snow',  name:'雪', icon:'雪', desc:'移动-1，骑兵速度降低。', color:'#d6dde0' }
};

const RANKS = [
  { lv:1, name:'伍长' }, { lv:4, name:'校尉' }, { lv:7, name:'都尉' }, { lv:10, name:'中郎将' },
  { lv:13, name:'偏将军' }, { lv:16, name:'大将军' }, { lv:20, name:'军神' }
];

const ACHIEVEMENTS = {
  taoyuan:   { id:'taoyuan', name:'桃园之誓', icon:'义', desc:'完成第一回「桃园结义」。' },
  hulao:     { id:'hulao', name:'温酒斩华雄', icon:'斩', desc:'完成第二回「虎牢关」。' },
  wolong:    { id:'wolong', name:'三顾茅庐', icon:'龙', desc:'完成第三回「卧龙出山」。' },
  changban:  { id:'changban', name:'一身是胆', icon:'胆', desc:'完成第四回「长坂坡」。' },
  chibi:     { id:'chibi', name:'火烧赤壁', icon:'火', desc:'完成第五回「赤壁」。' },
  han:       { id:'han', name:'兴复汉室', icon:'汉', desc:'完成最终回「定军山」。' },
  rich:      { id:'rich', name:'富甲一方', icon:'富', desc:'拥有超过 10000 金。' },
  army:      { id:'army', name:'兵强马壮', icon:'兵', desc:'总兵力超过 20000。' },
  cities:    { id:'cities', name:'天下归心', icon:'城', desc:'占领十座以上城池。' },
  battles:   { id:'battles', name:'百战百胜', icon:'胜', desc:'赢得十场战斗。' },
  recruiter: { id:'recruiter', name:'求贤若渴', icon:'贤', desc:'麾下武将超过八人。' },
  collector: { id:'collector', name:'神兵天降', icon:'器', desc:'收集八件以上装备。' }
};

const EVENTS = [
  { id:'refugees', title:'流民来投', icon:'民', text:'冀州流民数百户辗转至此，面黄肌瘦，恳请收留。', requirement:s=>true,
    choices:[
      { label:'开仓赈济', hint:'消耗 300 粮草，兵力+400，治安+5', effect:{food:-300,troops:400,order:5}, result:'百姓感恩，青壮纷纷投军。' },
      { label:'量力而行', hint:'消耗 120 粮草，兵力+150', effect:{food:-120,troops:150,order:1}, result:'虽不能尽收，亦活人无数。' },
      { label:'闭门不纳', hint:'治安-8', effect:{order:-8}, result:'流民失望而去，城中议论纷纷。' } ] },
  { id:'caravan', title:'商队过境', icon:'商', text:'一支西凉商队请求借道，愿以重金换取通行。', requirement:s=>true,
    choices:[
      { label:'派兵护送', hint:'消耗 300 金，获得 800 金与名声', effect:{gold:500,fame:3}, result:'商队平安过境，慷慨酬谢。' },
      { label:'课以重税', hint:'获得 900 金，治安-6', effect:{gold:900,order:-6}, result:'商队敢怒不敢言，匆匆离去。' },
      { label:'婉言谢绝', hint:'无变化', effect:{}, result:'商队绕道而行。' } ] },
  { id:'locust', title:'蝗灾', icon:'蝗', text:'蝗虫蔽日，田亩尽毁，粮仓告急。', requirement:s=>Object.values(s.cities).filter(c=>c.owner==='shu').length>1,
    choices:[
      { label:'倾力灭蝗', hint:'消耗 400 金，粮草-200，治安+4', effect:{gold:-400,food:-200,order:4}, result:'军民齐心，灾情稍缓。' },
      { label:'开仓平粜', hint:'消耗 600 粮草，治安+8', effect:{food:-600,order:8}, result:'粮价渐平，民心稍安。' },
      { label:'听天由命', hint:'粮草-700，治安-10', effect:{food:-700,order:-10}, result:'饿殍遍野，盗贼蜂起。' } ] },
  { id:'scholar', title:'名士献策', icon:'士', text:'颍川名士前来投帖，愿献《军政要略》一卷。', requirement:s=>true,
    choices:[
      { label:'厚礼相待', hint:'消耗 300 金，科技点+3', effect:{gold:-300,tech:3}, result:'名士留下奇策，书院受益匪浅。' },
      { label:'虚席问计', hint:'消耗 100 金，名声+2', effect:{gold:-100,fame:2}, result:'虽未得书，礼贤之名远播。' },
      { label:'辞而不见', hint:'名声-2', effect:{fame:-2}, result:'名士拂袖而去。' } ] },
  { id:'plague', title:'军中疫病', icon:'疫', text:'营中突发疫病，士卒病倒过半，军心浮动。', requirement:s=>true,
    choices:[
      { label:'延医问药', hint:'消耗 500 金，兵力-5%', effect:{gold:-500,troopPct:-.05}, result:'疫病得控，军心渐稳。' },
      { label:'隔离病卒', hint:'兵力-12%，治安-3', effect:{troopPct:-.12,order:-3}, result:'虽舍弃部分袍泽，然大营保全。' },
      { label:'秘不发丧', hint:'兵力-18%，名声-5', effect:{troopPct:-.18,fame:-5}, result:'纸包不住火，军中怨声载道。' } ] },
  { id:'duel', title:'校场比武', icon:'武', text:'校场上将士们摩拳擦掌，欲以武会友。', requirement:s=>true,
    choices:[
      { label:'亲自下场', hint:'随机武将经验+150', effect:{expRandom:150}, result:'一番龙争虎斗，将士武艺精进。' },
      { label:'设宴犒军', hint:'消耗 300 金，士气+，治安+3', effect:{gold:-300,order:3}, result:'酒酣耳热，三军齐呼万岁。' },
      { label:'免了', hint:'无变化', effect:{}, result:'校场渐渐散去。' } ] },
  { id:'bandits', title:'山贼劫道', icon:'贼', text:'黑风寨山贼截断粮道，索要买路钱。', requirement:s=>true,
    choices:[
      { label:'发兵剿匪', hint:'兵力-200，获得 500 金，治安+5', effect:{troops:-200,gold:500,order:5}, result:'山贼巢穴被破，缴获颇丰。' },
      { label:'破财消灾', hint:'消耗 400 金', effect:{gold:-400}, result:'粮道恢复，然军心不忿。' },
      { label:'招安', hint:'消耗 200 金，兵力+250，治安-2', effect:{gold:-200,troops:250,order:-2}, result:'山贼下山从军，只是军纪堪忧。' } ] },
  { id:'omen', title:'夜观天象', icon:'星', text:'太史令夜观星象，见紫微星动，言主公当有天命。', requirement:s=>s.turn>=5,
    choices:[
      { label:'祭天告庙', hint:'消耗 400 金，名声+5，科技点+1', effect:{gold:-400,fame:5,tech:1}, result:'三军振奋，四方豪杰来投。' },
      { label:'戒骄戒躁', hint:'治安+3，科技点+2', effect:{order:3,tech:2}, result:'刘备曰：天命在民，不在星象。' } ] }
];

/* ---------------- 战场地图 ---------------- */
const MAPS = {
  zhuojunField: { name:'涿郡城外', time:'dawn', rows:[
    '............','..f......f..','......h.....','............','...r.pppp.r.','............','..f..h......','.....vv.....','............' ] },
  yecheng: { name:'邺城郊野', time:'dusk', rows:[
    '....pp......','..f..pp..f..','.....pp.....','..h..pp..h..','.....pp.....','............','..f......f..','............','............' ] },
  luoyang: { name:'虎牢关', time:'storm', rows:[
    'cccc....cccc','cccc....cccc','............','...h....h...','............','....f..f....','............','..h......h..','............' ] },
  xuchang: { name:'许昌城外', time:'day', rows:[
    '............','...f....f...','............','..h..cc..h..','.....cc.....','............','..f......f..','............','............' ] },
  xuzhou: { name:'徐州城下', time:'dusk', rows:[
    '..cc....cc..','..cc....cc..','............','...h....h...','............','..f..vv..f..','............','............','............' ] },
  xinye: { name:'博望坡', time:'dusk', rows:[
    '.ff......ff.','..ff....ff..','............','...hh..hh...','............','.ff..vv..ff.','............','..ff....ff..','............' ] },
  jiangxia: { name:'江夏水寨', time:'day', rows:[
    '............','..wwwwwwww..','....b..b....','..wwwwwwww..','............','..wwwwwwww..','....b..b....','............','............' ] },
  changban: { name:'长坂坡', time:'dusk', rows:[
    '....rr......','..r......r..','............','vvv....vvv..','............','....ww......','..ww........','............','............' ] },
  chibi: { name:'赤壁江面', time:'fire', rows:[
    '............','..wwwwwwww..','....b..b....','..wwwwwwww..','............','..wwwwwwww..','....b..b....','..wwwwwwww..','............' ] },
  jianye: { name:'建业江防', time:'day', rows:[
    '............','..wwwwwwww..','....b..b....','............','..wwwwwwww..','....b..b....','............','..wwwwwwww..','............' ] },
  hanzhong: { name:'定军山', time:'dawn', rows:[
    '..hhh..hhh..','.hhhh..hhhh.','..hh....hh..','............','....hh......','............','..hhh..hhh..','............','............' ] },
  chengdu: { name:'成都平原', time:'day', rows:[
    '............','..f......f..','............','...vv..vv...','............','..h......h..','............','............','............' ] }
};

const CHAPTERS = [
  {
    id:'ch0', no:'第一回', title:'桃园结义', subtitle:'涿郡举义', date:'中平元年 · 184年', battleKey:'tutorial',
    objective:'击溃进犯涿郡的黄巾军', hint:'点击「出阵」迎战黄巾。',
    pre:[
      { narration:true, text:'中平元年，巨鹿张角以“苍天已死，黄天当立”为号，三十六方同日举事。旬月之间，天下响应，京师震动。' },
      { narration:true, text:'幽州涿县，一位织席贩履的汉室宗亲，在桃园中遇见了两位豪杰。桃花正盛，酒尚温。' },
      { speaker:'liubei', side:'left', text:'备虽落魄，乃中山靖王之后。今黄巾倡乱，百姓倒悬。备愿倾尽家资，聚义兵，上报国家，下安黎庶。' },
      { speaker:'guanyu', side:'right', text:'关某愿随兄长，生死相托，患难相扶。' },
      { speaker:'zhangfei', side:'right', text:'俺也一样！这桃园花开正好，今日便结为兄弟，天地为证！' },
      { narration:true, text:'三人焚香再拜，结为异姓兄弟。桃花纷落，誓言随风，飘向烽火连天的乱世。' },
      { speaker:'liubei', side:'left', text:'二弟、三弟，黄巾贼寇已至涿郡城外。随我出阵，护一方百姓！' }
    ],
    post:[
      { speaker:'guanyu', side:'right', text:'贼众已溃，程远志、邓茂皆被斩于阵前。' },
      { speaker:'zhangfei', side:'right', text:'痛快！这群黄巾，连俺老张一矛都挡不住！' },
      { speaker:'liubei', side:'left', text:'首战虽捷，然黄巾势大，天下英雄并起。涿郡只是起点，兴复汉室之路，尚在千里之外。' },
      { narration:true, text:'桃园一诺，自此踏上征途。汉末的天幕下，群雄逐鹿，烽火将燃遍九州。' }
    ],
    rewards:{ gold:600, food:800, fame:5, exp:120, tech:1, items:['mingguang'] },
    achievement:'taoyuan'
  },
  {
    id:'ch1', no:'第二回', title:'虎牢关', subtitle:'三英战吕布', date:'初平元年 · 190年', battleKey:'hulao',
    objective:'攻取洛阳，破虎牢关', hint:'占领邺城后，挥师洛阳。',
    pre:[
      { narration:true, text:'初平元年，董卓挟天子迁都长安，焚毁洛阳。关东诸侯会盟讨董，却畏吕布之勇，屯兵虎牢关前，逡巡不进。' },
      { speaker:'liubei', side:'left', text:'洛阳乃汉室旧都，今为董卓所占。虎牢关前，诸侯皆按兵不动。此战，我刘备愿为天下先。' },
      { speaker:'guanyu', side:'right', text:'某愿斩华雄，以振我军声威。' },
      { narration:true, text:'关外，华雄连斩数将，诸侯失色。一骑青袍，提刀而出。曹操斟酒一杯，尚未温。' },
      { speaker:'huaxiong', side:'right', text:'无名小卒，也敢来送死？' },
      { speaker:'guanyu', side:'left', text:'酒且斟下，某去去便回。' },
      { narration:true, text:'刀光起处，华雄授首。然虎牢关内，赤兔嘶鸣，方天画戟已破关而出。' },
      { speaker:'lvbu', side:'right', text:'天下英雄，可有人敢挡我吕布！' }
    ],
    post:[
      { speaker:'zhangfei', side:'right', text:'三姓家奴！燕人张飞在此，与你大战三百回合！' },
      { speaker:'guanyu', side:'left', text:'三弟，我来助你！' },
      { speaker:'liubei', side:'left', text:'吕布虽勇，终究一人。二弟三弟，结阵！' },
      { narration:true, text:'三英战吕布，虎牢关前杀声震天。董卓弃关西走，洛阳收复，汉室旧都重见天日。' },
      { speaker:'liubei', side:'left', text:'洛阳残破，百姓流离。传令，开仓赈济，修缮城池。' },
      { narration:true, text:'虎牢关一战，刘玄德之名传于诸侯。然乱世棋盘上，每个人都是棋子。' }
    ],
    rewards:{ gold:1200, food:1200, fame:10, exp:260, tech:2, items:['delu'] },
    achievement:'hulao'
  },
  {
    id:'ch2', no:'第三回', title:'卧龙出山', subtitle:'三顾茅庐 · 博望坡', date:'建安十二年 · 207年', battleKey:'bowang',
    objective:'据守新野，以火破曹仁', hint:'攻取新野，三顾茅庐，迎战曹仁。',
    pre:[
      { narration:true, text:'数年后，刘备辗转依附刘表，屯驻新野。曹操平定北方，兵锋南指，荆州危如累卵。' },
      { speaker:'liubei', side:'left', text:'曹操势大，新野兵微将寡。若无经天纬地之才，恐难立足。' },
      { speaker:'liubei', side:'left', text:'徐元直曾言：襄阳城外卧龙岗中，有诸葛孔明者，真卧龙也。备当亲往。' },
      { narration:true, text:'一顾茅庐，不遇。二顾茅庐，风雪满身。三顾之时，草堂春睡方足。' },
      { speaker:'zhugeliang', side:'right', text:'大梦谁先觉，平生我自知。主公既来，亮愿效犬马之劳。' },
      { speaker:'zhugeliang', side:'right', text:'曹操北来，必经博望坡。此地山高林密，可用火攻。' },
      { speaker:'liubei', side:'left', text:'得孔明，如鱼得水！' }
    ],
    post:[
      { speaker:'zhugeliang', side:'right', text:'火起之处，曹军自乱。曹仁败走，新野暂安。' },
      { speaker:'guanyu', side:'left', text:'军师妙计，关某拜服。' },
      { speaker:'zhangfei', side:'right', text:'俺老张服了！以后军师说打哪，俺就打哪！' },
      { speaker:'liubei', side:'left', text:'曹操不会善罢甘休。传令，安抚百姓，整军备战。' },
      { narration:true, text:'卧龙出山，风云将变。可曹操的十万大军，已在南下的路上。' }
    ],
    rewards:{ gold:1000, food:1400, fame:8, exp:320, tech:3, items:['sunzi'] },
    achievement:'wolong', recruit:['zhugeliang']
  },
  {
    id:'ch3', no:'第四回', title:'长坂坡', subtitle:'单骑救主', date:'建安十三年 · 208年', battleKey:'changban',
    objective:'坚守八回合，护百姓南撤', hint:'曹操大军追至，整军迎战。',
    pre:[
      { narration:true, text:'建安十三年，曹操亲率大军南下。刘备弃新野，携百姓南撤，日行十余里，军民相杂，哭声震野。' },
      { speaker:'liubei', side:'left', text:'百姓相随，是信我刘备。纵死不弃！' },
      { speaker:'zhangfei', side:'right', text:'大哥先走，俺断后！长坂桥头，看谁敢过！' },
      { speaker:'caocao', side:'right', text:'刘备，你带着百姓，走得掉吗？传令，虎豹骑追！' },
      { speaker:'zhaoyun', side:'left', text:'主公先行，赵云去寻阿斗与夫人！' },
      { narration:true, text:'长坂坡上，血染征袍。赵云单骑冲阵，往来七进七出。曹军阵中，无人能挡。' }
    ],
    post:[
      { speaker:'zhaoyun', side:'left', text:'末将无能，只救得阿斗与甘夫人。糜夫人……投井了。' },
      { speaker:'liubei', side:'left', text:'为这孺子，几损我一员大将！' },
      { speaker:'zhaoyun', side:'left', text:'云虽肝脑涂地，不能报也！' },
      { speaker:'zhugeliang', side:'right', text:'曹操大军已至江夏。为今之计，只有联吴抗曹。' },
      { narration:true, text:'长坂坡一役，赵云名震天下。而真正的决战，将在赤壁的江面上展开。' }
    ],
    rewards:{ gold:1200, food:1600, fame:12, exp:420, tech:4, items:['qingnang'] },
    achievement:'changban', recruit:['zhaoyun']
  },
  {
    id:'ch4', no:'第五回', title:'赤壁', subtitle:'东风卷烈焰', date:'建安十三年 · 208年', battleKey:'chibi',
    objective:'击败曹操，火烧赤壁', hint:'取江夏，联孙权，决战赤壁。',
    pre:[
      { narration:true, text:'江夏，鲁肃过江。诸葛亮舌战群儒，孙刘联盟，就此结成。' },
      { speaker:'sunquan', side:'right', text:'曹操八十万大军，号称投鞭断流。公等可有破敌之策？' },
      { speaker:'zhugeliang', side:'left', text:'曹军北来，不习水战。今江水正急，可用火攻。' },
      { speaker:'zhouyu', side:'right', text:'火攻需东风。孔明，三日之内，你可能借来东风？' },
      { speaker:'zhugeliang', side:'left', text:'亮愿立军令状。' },
      { narration:true, text:'是夜，东南风起。黄盖诈降，火船顺风而下，赤壁江面化为火海。' },
      { speaker:'caocao', side:'right', text:'中计矣！传令，撤军！' }
    ],
    post:[
      { speaker:'zhouyu', side:'right', text:'赤壁一炬，曹军胆寒。刘豫州，你我合力，可保江南。' },
      { speaker:'zhugeliang', side:'left', text:'曹操虽败，北方根基未动。天下三分之势，成矣。' },
      { speaker:'liubei', side:'left', text:'传令，取荆州，定南郡。兴复汉室，从今日始。' },
      { narration:true, text:'东风卷烈焰，长江映赤霞。三分天下的第一笔，写在了赤壁的波涛之上。' }
    ],
    rewards:{ gold:1800, food:2200, fame:16, exp:560, tech:5, items:['chitu'] },
    achievement:'chibi', recruit:['huangzhong']
  },
  {
    id:'ch5', no:'最终回', title:'定军山', subtitle:'汉室复兴', date:'建安二十四年 · 219年', battleKey:'dingjun',
    objective:'攻取汉中，击败曹操', hint:'赤壁之后，挥师汉中，毕其功于一役。',
    pre:[
      { narration:true, text:'建安二十四年，刘备据荆州、益州，进位汉中王。曹操亲率大军，争夺汉中。' },
      { narration:true, text:'定军山下，夏侯渊据险而守。老将黄忠，挺刀请战。' },
      { speaker:'huangzhong', side:'left', text:'老夫虽老，两臂尚开三石之弓！夏侯渊，可敢与我一战！' },
      { speaker:'zhugeliang', side:'right', text:'定军山南，有座高地。若占据此处，可俯冲曹营。' },
      { speaker:'liubei', side:'left', text:'传令，黄忠、赵云为先锋，马超、魏延为左右。此战，定汉中！' },
      { speaker:'xiahouyuan', side:'right', text:'刘备，汉中乃魏土，休想踏过一步！' }
    ],
    post:[
      { speaker:'huangzhong', side:'left', text:'夏侯渊已斩！曹军大乱！' },
      { speaker:'caocao', side:'right', text:'吾收天下英雄，唯独玄德，与你并立于世！' },
      { speaker:'liubei', side:'left', text:'曹操，汉室未亡，天下未定。这江山，不是你一个人的。' },
      { narration:true, text:'定军山一役，曹军退守长安。刘备进位汉中王，蜀汉基业，至此鼎成。' },
      { narration:true, text:'桃园花开又落，英雄白发渐生。可那一声“兴复汉室”的誓言，仍在山河之间回响。' }
    ],
    rewards:{ gold:3000, food:3000, fame:30, exp:800, tech:6, items:[] },
    achievement:'han', recruit:['machao']
  }
];

const STORY_BATTLES = {
  tutorial: {
    key:'tutorial', map:'zhuojunField', time:'dawn', weather:'clear', enemyFaction:'yellow', difficultyLv:1,
    objective:{ type:'eliminate', text:'击溃黄巾军', sub:'击败全部敌军' },
    enemies:[ { g:'chengyuanzhi', lv:2, pos:[6,2] }, { g:'dengmao', lv:2, pos:[8,4] }, { mook:'yellowBrute', lv:1, pos:[7,6] }, { mook:'yellowArcher', lv:1, pos:[9,5] } ],
    intro:'黄巾贼众已列阵于涿郡城外。',
    rewards:{ gold:500, food:600, exp:100, fame:4, tech:1 }
  },
  hulao: {
    key:'hulao', map:'luoyang', time:'storm', weather:'wind', enemyFaction:'dong', difficultyLv:4,
    objective:{ type:'boss', boss:'lvbu', text:'击败吕布', sub:'击破虎牢关' },
    enemies:[ { g:'huaxiong', lv:4, pos:[8,4] }, { g:'guosi', lv:3, pos:[9,6] }, { mook:'dongBrute', lv:3, pos:[10,3] }, { mook:'dongCavalry', lv:3, pos:[9,2] }, { mook:'dongArcher', lv:3, pos:[10,5] } ],
    waves:[ { round:3, units:[ { g:'lvbu', lv:6, pos:[10,4] } ], shout:'吕布亲临战场！' } ],
    intro:'虎牢关前，董卓军严阵以待。',
    rewards:{ gold:900, food:900, exp:220, fame:8, tech:2 }
  },
  bowang: {
    key:'bowang', map:'xinye', time:'dusk', weather:'wind', enemyFaction:'wei', difficultyLv:3,
    objective:{ type:'eliminate', text:'火计破曹仁', sub:'击败全部敌军' },
    enemies:[ { g:'caoren', lv:5, pos:[9,4] }, { g:'lidian', lv:4, pos:[10,2] }, { g:'yujin', lv:4, pos:[9,6] }, { mook:'weiArcher', lv:3, pos:[10,5] }, { mook:'weiInfantry', lv:3, pos:[10,3] } ],
    special:'bowangFire', intro:'博望坡林深草密，正是用火之地。',
    rewards:{ gold:800, food:1100, exp:280, fame:6, tech:3 }
  },
  changban: {
    key:'changban', map:'changban', time:'dusk', weather:'rain', enemyFaction:'wei', difficultyLv:5,
    objective:{ type:'survive', rounds:8, text:'坚守八回合', sub:'护百姓撤离' },
    enemies:[ { g:'caochun', lv:6, pos:[10,4] }, { g:'zhanghe', lv:6, pos:[9,2] }, { g:'xuchu', lv:6, pos:[9,6] }, { mook:'weiCavalry', lv:4, pos:[10,3] }, { mook:'weiCavalry', lv:4, pos:[10,5] } ],
    waves:[ { round:3, units:[ { mook:'weiCavalry', lv:4, pos:[10,1] }, { mook:'weiCavalry', lv:4, pos:[10,7] } ], shout:'虎豹骑合围而来！' }, { round:5, units:[ { g:'caocao', lv:7, pos:[10,4] } ], shout:'曹操亲临长坂坡！' } ],
    intro:'长坂坡上，百姓哭声与追兵马蹄声混作一片。',
    rewards:{ gold:1000, food:1400, exp:380, fame:10, tech:4 }
  },
  chibi: {
    key:'chibi', map:'chibi', time:'fire', weather:'wind', enemyFaction:'wei', difficultyLv:7,
    objective:{ type:'boss', boss:'caocao', text:'击败曹操', sub:'火烧赤壁' },
    enemies:[ { g:'caocao', lv:8, pos:[10,4] }, { g:'xiahouyuan', lv:7, pos:[9,2] }, { g:'zhanghe', lv:7, pos:[9,6] }, { g:'xuhuang', lv:7, pos:[10,3] }, { mook:'weiInfantry', lv:5, pos:[10,5] }, { mook:'weiArcher', lv:5, pos:[9,4] } ],
    allies:[ { g:'zhouyu', lv:7, pos:[2,2] }, { g:'huanggai', lv:6, pos:[2,6] } ],
    special:'chibiFire', intro:'东风已起，江面雾气翻涌。火船整装待发。',
    rewards:{ gold:1600, food:2000, exp:520, fame:14, tech:5 }
  },
  dingjun: {
    key:'dingjun', map:'hanzhong', time:'dawn', weather:'clear', enemyFaction:'wei', difficultyLv:9,
    objective:{ type:'eliminate', text:'击溃曹军，夺取汉中', sub:'击败全部敌军' },
    enemies:[ { g:'xiahouyuan', lv:9, pos:[8,3] }, { g:'caocao', lv:10, pos:[10,4] }, { g:'zhanghe', lv:8, pos:[9,2] }, { g:'xuhuang', lv:8, pos:[9,6] }, { g:'simayi', lv:9, pos:[10,7] }, { mook:'weiCavalry', lv:6, pos:[10,1] } ],
    special:'dingjun', intro:'定军山下，两军对垒。汉中之争，在此一役。',
    rewards:{ gold:2600, food:2800, exp:760, fame:25, tech:6 }
  }
};

const LORE = [
  { id:'taoyuan', title:'桃园结义', no:'卷一', meta:'中平元年 · 涿郡', needChapter:0,
    quote:'“不求同年同月同日生，但愿同年同月同日死。”',
    text:'东汉末年，朝纲崩坏，黄巾蜂起。刘备、关羽、张飞相遇于涿郡，桃园之中，备下乌牛白马，祭告天地，结为异姓兄弟。刘备年长，为兄；关羽次之；张飞为弟。三人誓以同心协力，救困扶危，上报国家，下安黎庶。这一拜，拜出了蜀汉四十年的基业，也拜出了中国历史上最动人的兄弟情义。' },
  { id:'yellow', title:'黄巾之乱与十常侍', no:'卷二', meta:'光和七年 · 巨鹿', needChapter:0,
    quote:'“苍天已死，黄天当立；岁在甲子，天下大吉。”',
    text:'汉灵帝时，宦官十常侍把持朝政，卖官鬻爵，民不聊生。巨鹿人张角以《太平要术》治病传道，创立太平道，十余年间聚众数十万，遍布八州。中平元年，张角率众起义，头裹黄巾，史称黄巾之乱。朝廷震动，解除党锢，调集各路兵马镇压。刘备、曹操、孙坚等人，皆在这一年登上历史舞台。' },
  { id:'hulao', title:'虎牢关三英战吕布', no:'卷三', meta:'初平元年 · 洛阳', needChapter:1,
    quote:'“人中吕布，马中赤兔。”',
    text:'董卓专权，废少帝，立献帝，迁都长安，焚毁洛阳。关东诸侯推袁绍为盟主，起兵讨董。虎牢关前，董卓部将华雄连斩数将，诸侯束手。关羽温酒斩华雄，一战成名。随后吕布出关搦战，张飞挺矛而上，关羽、刘备相继加入，三英战吕布，杀得难解难分。吕布虽勇，终因寡不敌众，退守关内。这一战，让刘备兄弟名扬天下。' },
  { id:'wolong', title:'三顾茅庐', no:'卷四', meta:'建安十二年 · 隆中', needChapter:2,
    quote:'“鞠躬尽瘁，死而后已。”',
    text:'刘备屯驻新野，经徐庶推荐，得知隆中卧龙诸葛亮。刘备亲自前往拜访，前两次均未见到。第三次，诸葛亮正在草堂昼寝，刘备立于阶下等候。诸葛亮醒来，与刘备纵论天下，提出“跨有荆益、西和诸戎、南抚夷越、外结孙权、内修政理”的隆中对策。刘备大喜，说“孤之有孔明，犹鱼之有水也”。从此，卧龙出山，风云变色。' },
  { id:'changban', title:'长坂坡单骑救主', no:'卷五', meta:'建安十三年 · 当阳', needChapter:3,
    quote:'“吾乃常山赵子龙也！”',
    text:'曹操南下荆州，刘备携百姓南撤，在当阳长坂坡被曹军追上。刘备军大乱，甘夫人与幼子刘禅失散。赵云拨转马头，冲入曹军阵中，七进七出，斩杀曹营名将五十余员，救出甘夫人与阿斗。张飞在长坂桥头横矛立马，一声断喝，曹军无人敢近。刘备接过阿斗，掷之于地，说“为汝这孺子，几损我一员大将”。赵云泣拜，誓以死报。' },
  { id:'chibi', title:'赤壁之战', no:'卷六', meta:'建安十三年 · 赤壁', needChapter:4,
    quote:'“东风不与周郎便，铜雀春深锁二乔。”',
    text:'曹操平定北方后，率大军南下，荆州刘琮不战而降。曹操得荆州水军，顺江东下，欲一举统一天下。孙权与刘备结盟，以周瑜为大都督，率三万水军迎战。周瑜采纳黄盖诈降之计，以火船突袭曹军水寨。是夜东南风大起，火借风势，曹军战船连营尽焚，死伤无数。曹操败走华容道，天下三分之势由此奠定。' },
  { id:'dingjun', title:'定军山之战', no:'卷七', meta:'建安二十四年 · 汉中', needChapter:5,
    quote:'“老当益壮，宁移白首之心。”',
    text:'刘备夺取益州后，与曹操争夺汉中。夏侯渊据守定军山，刘备采纳法正之谋，夜袭夏侯渊营寨，放火烧毁鹿角。夏侯渊分兵救援，被黄忠居高临下突袭，阵斩于马下。曹军大败，曹操退守长安。刘备遂取汉中，进位汉中王。这一年，刘备五十九岁。从桃园结义到汉中称王，他走了三十五年。' },
  { id:'era', title:'汉末风云录', no:'卷八', meta:'汉末 · 天下', needChapter:0,
    quote:'“天下大势，分久必合，合久必分。”',
    text:'东汉末年，外戚与宦官交替专权，土地兼并严重，天灾频仍。黄巾之乱后，地方州牧拥兵自重，中央权威荡然无存。董卓乱政，群雄并起；官渡之战，曹操统一北方；赤壁之战，三分天下；夷陵之战，蜀汉元气大伤。最终司马氏篡魏，灭蜀、平吴，天下复归一统。百年乱世，英雄辈出，谋士如云，猛将如雨。他们的故事，被写进《三国演义》，传唱千年。' }
];

const HELP_TEXT = [
  { title:'战旗 · 基础', items:['点击我方武将选中，蓝色格子为可移动范围；右上角「自动」或 A 键可让 AI 接管我方行动。','移动后可选择攻击、战法或待机。攻击或战法会结束该武将行动。','枪兵克骑兵，骑兵克弓兵，弓兵克步兵，占据地利可获防御加成。','士气达到战法需求后，可释放专属战法，往往能扭转战局。'] },
  { title:'内政 · 经营', items:['每回合城池产出钱粮，兵员消耗粮草。粮草不足将导致逃亡。','升级农田、市集、兵营、城墙、书院、铁匠铺，可获得不同收益。','委任太守可提升城池收入与治安。治安过低会引发民变。','每回合有两次军令，可用于出征。出征消耗城池兵力。'] },
  { title:'天下 · 外交', items:['与曹操、孙权等势力维持关系，可避免腹背受敌。','赠礼可提升关系；关系达到七十可缔结盟约。','盟约期间对方不会进攻你的城池，但攻城会破坏盟约。','占领城池会降低该势力关系，灭亡势力后其城池归你所有。'] },
  { title:'成长 · 养成', items:['战斗胜利可获得经验，武将升级后属性提升。','装备分为武器、防具、坐骑、宝物四类，可在商肆购买或战斗缴获。','科技分为兵法、农政、工造三系，永久强化全军。','完成章回可获得丰厚奖励与新的武将。'] }
];

return {
  DIFFICULTY, FACTIONS, CLASSES, TERRAIN, SKILLS, GENERALS, MOOKS, ITEMS, SETS, FORMATIONS, TECHS,
  BUILDINGS, CITIES, WEATHERS, RANKS, ACHIEVEMENTS, EVENTS, MAPS, CHAPTERS, STORY_BATTLES,
  LORE, HELP_TEXT
};
})();

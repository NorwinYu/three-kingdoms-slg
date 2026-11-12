/* ============================================================
   烽火三国 · 声韵
   纯 WebAudio 程序化配乐与音效，无外部音频文件
   ============================================================ */
class AudioEngine {
  constructor(){
    this.ctx = null; this.master = null; this.musicGain = null; this.sfxGain = null; this.reverb = null; this.comp = null;
    this.mode = null; this.timer = null; this.nextTime = 0; this.step = 0; this.ambient = null; this.ambientGain = null;
    this.musicVol = 0.55; this.sfxVol = 0.7; this.ready = false; this.enabled = true;
    this.scale = [0,3,5,7,10,12,15,17,19,22];
  }
  init(){
    if(this.ready || !this.enabled) return;
    try{
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.9;
      this.comp = this.ctx.createDynamicsCompressor();
      this.comp.threshold.value = -18; this.comp.ratio.value = 3.5; this.comp.attack.value = .005; this.comp.release.value = .25;
      this.master.connect(this.comp); this.comp.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = this.musicVol; this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = this.sfxVol; this.sfxGain.connect(this.master);
      this.reverb = this.ctx.createConvolver(); this.reverb.buffer = this.makeImpulse(2.8, 2.4);
      const wet = this.ctx.createGain(); wet.gain.value = .32; this.reverb.connect(wet); wet.connect(this.musicGain);
      this.reverbSfx = this.ctx.createConvolver(); this.reverbSfx.buffer = this.makeImpulse(1.6, 1.6);
      const wet2 = this.ctx.createGain(); wet2.gain.value = .18; this.reverbSfx.connect(wet2); wet2.connect(this.sfxGain);
      this.noiseBuf = this.makeNoise(2.5);
      this.ready = true;
      this.startAmbient();
      if(this.mode) this.startMusic(this.mode, true);
    }catch(e){ console.warn('Audio init failed', e); }
  }
  resume(){ if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(()=>{}); }
  makeImpulse(dur, decay){
    const sr = this.ctx.sampleRate, len = Math.floor(sr*dur), buf = this.ctx.createBuffer(2,len,sr);
    for(let ch=0; ch<2; ch++){
      const d = buf.getChannelData(ch);
      for(let i=0;i<len;i++){ d[i] = (Math.random()*2-1) * Math.pow(1-i/len, decay); }
    }
    return buf;
  }
  makeNoise(dur){
    const sr = this.ctx.sampleRate, len = Math.floor(sr*dur), buf = this.ctx.createBuffer(1,len,sr), d = buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i] = Math.random()*2-1;
    return buf;
  }
  setVolumes(music, sfx){
    this.musicVol = music; this.sfxVol = sfx;
    if(this.ready){ this.musicGain.gain.setTargetAtTime(music, this.ctx.currentTime, .1); this.sfxGain.gain.setTargetAtTime(sfx, this.ctx.currentTime, .1); }
  }
  startAmbient(){
    if(!this.ready || this.ambient) return;
    try{
      const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
      const bp = this.ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=480; bp.Q.value=.55;
      const lfo = this.ctx.createOscillator(); lfo.frequency.value=.08; const lg = this.ctx.createGain(); lg.gain.value=220; lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
      this.ambientGain = this.ctx.createGain(); this.ambientGain.gain.value=.032;
      src.connect(bp); bp.connect(this.ambientGain); this.ambientGain.connect(this.musicGain); src.start();
      this.ambient = src; this.ambientLfo = lfo;
    }catch(e){}
  }
  pluck(freq, when, dur=1.6, gain=.15, bus){
    if(!this.ready) return;
    const ctx=this.ctx, t=when||ctx.currentTime;
    const out=ctx.createGain(); out.gain.setValueAtTime(0,t); out.gain.linearRampToValueAtTime(gain,t+.006); out.gain.exponentialRampToValueAtTime(.0001,t+dur);
    const filt=ctx.createBiquadFilter(); filt.type='lowpass'; filt.frequency.setValueAtTime(3200,t); filt.frequency.exponentialRampToValueAtTime(600,t+dur); filt.Q.value=.8;
    const o1=ctx.createOscillator(); o1.type='triangle'; o1.frequency.setValueAtTime(freq*1.006,t); o1.frequency.exponentialRampToValueAtTime(freq*.998,t+dur);
    const o2=ctx.createOscillator(); o2.type='sine'; o2.frequency.setValueAtTime(freq*2,t); o2.frequency.exponentialRampToValueAtTime(freq*2,t+dur*.5);
    const g2=ctx.createGain(); g2.gain.value=.18;
    o1.connect(filt); o2.connect(g2); g2.connect(filt); filt.connect(out); out.connect(bus||this.musicGain);
    if(this.reverb) out.connect(this.reverb);
    o1.start(t); o2.start(t); o1.stop(t+dur+.05); o2.stop(t+dur+.05);
  }
  flute(freq, when, dur=1.4, gain=.07){
    if(!this.ready) return;
    const ctx=this.ctx, t=when||ctx.currentTime;
    const out=ctx.createGain(); out.gain.setValueAtTime(0,t); out.gain.linearRampToValueAtTime(gain,t+.12); out.gain.setValueAtTime(gain,t+dur*.7); out.gain.exponentialRampToValueAtTime(.0001,t+dur);
    const o=ctx.createOscillator(); o.type='sine'; o.frequency.value=freq;
    const vib=ctx.createOscillator(); vib.frequency.value=5.2; const vg=ctx.createGain(); vg.gain.value=2.5; vib.connect(vg); vg.connect(o.frequency);
    const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=freq*2; bp.Q.value=1.2;
    o.connect(bp); bp.connect(out); out.connect(this.musicGain); if(this.reverb) out.connect(this.reverb);
    o.start(t); vib.start(t); o.stop(t+dur+.05); vib.stop(t+dur+.05);
  }
  drum(when, gain=.4, low=1){
    if(!this.ready) return;
    const ctx=this.ctx, t=when||ctx.currentTime;
    const o=ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(150*low,t); o.frequency.exponentialRampToValueAtTime(42,t+.32);
    const g=ctx.createGain(); g.gain.setValueAtTime(gain,t); g.gain.exponentialRampToValueAtTime(.0001,t+.5);
    o.connect(g); g.connect(this.sfxGain); o.start(t); o.stop(t+.55);
    const n=ctx.createBufferSource(); n.buffer=this.noiseBuf; const ng=ctx.createGain(); ng.gain.setValueAtTime(gain*.25,t); ng.gain.exponentialRampToValueAtTime(.0001,t+.09);
    const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=420;
    n.connect(lp); lp.connect(ng); ng.connect(this.sfxGain); n.start(t); n.stop(t+.1);
  }
  gong(when, gain=.2, pitch=1){
    if(!this.ready) return;
    const ctx=this.ctx, t=when||ctx.currentTime;
    [1,2.01,2.98,4.13,5.4].forEach((m,i)=>{
      const o=ctx.createOscillator(); o.type='sine'; o.frequency.value=92*m*pitch;
      const g=ctx.createGain(); const gg=gain/(1+i*1.4); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(gg,t+.01); g.gain.exponentialRampToValueAtTime(.0001,t+3.2/(1+i*.3));
      o.connect(g); g.connect(this.musicGain); if(this.reverb) g.connect(this.reverb); o.start(t); o.stop(t+3.5);
    });
  }
  noteFreq(semi){ return 146.83 * Math.pow(2, semi/12); }
  startMusic(mode, instant){
    this.mode = mode;
    if(!this.ready) return;
    clearInterval(this.timer);
    this.step = 0; this.nextTime = this.ctx.currentTime + .12;
    const tempos = { menu:64, campaign:74, battle:112, ending:70 };
    const bpm = tempos[mode] || 72;
    this.stepDur = 60/bpm/2;
    this.timer = setInterval(()=>this.schedule(), 90);
    this.schedule();
  }
  stopMusic(){ clearInterval(this.timer); this.timer=null; this.mode=null; }
  schedule(){
    if(!this.ready || !this.mode) return;
    const ctx=this.ctx;
    while(this.nextTime < ctx.currentTime + .55){
      this.scheduleStep(this.step, this.nextTime);
      this.nextTime += this.stepDur;
      this.step++;
    }
  }
  scheduleStep(step, t){
    const bar = Math.floor(step/8), s = step%8;
    const mode = this.mode;
    const roots = [0,-2,3,-4];
    const root = roots[Math.floor(bar/2)%roots.length];
    // drone at bar start
    if(s===0){
      const o=this.ctx.createOscillator(); o.type='sine'; o.frequency.value=this.noteFreq(root-12);
      const g=this.ctx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(mode==='battle'?.045:.032,t+.8); g.gain.setValueAtTime(mode==='battle'?.045:.032,t+this.stepDur*7); g.gain.exponentialRampToValueAtTime(.0001,t+this.stepDur*8);
      o.connect(g); g.connect(this.musicGain); o.start(t); o.stop(t+this.stepDur*9);
      if(this.reverb) g.connect(this.reverb);
    }
    if(mode==='menu'){
      if(s===0 && bar%2===0) this.gong(t,.07,.8);
      if([0,3,4,6].includes(s) && Math.random()<.55){
        const semi = this.scale[Math.floor(Math.random()*this.scale.length)] + root;
        this.pluck(this.noteFreq(semi), t, 2.4, .065 + Math.random()*.03);
      }
      if(s===7 && Math.random()<.3) this.flute(this.noteFreq(root+17), t, 1.6, .032);
    } else if(mode==='campaign'){
      if(s===0) this.drum(t,.10,.8);
      if(s===4 && bar%2===1) this.drum(t,.06,.6);
      if([0,2,3,5,6].includes(s) && Math.random()<.42){
        const semi = this.scale[Math.floor(Math.random()*5)] + root + 12;
        this.pluck(this.noteFreq(semi), t, 1.4, .05);
      }
      if(s===5 && Math.random()<.28) this.flute(this.noteFreq(root+15), t, 1.8, .026);
    } else if(mode==='battle'){
      if([0,2,4,6].includes(s)) this.drum(t, s===0?.24:.12, s===4?.7:1);
      if(s===7 && Math.random()<.2) this.drum(t,.08,1.3);
      if(s===0 && bar%4===0) this.gong(t,.05,.6);
      if([1,3,5,7].includes(s) && Math.random()<.25){
        const semi = [0,3,7,10][Math.floor(Math.random()*4)] + root;
        this.pluck(this.noteFreq(semi+12), t, .7, .035);
      }
    } else if(mode==='ending'){
      if(s===0) this.gong(t,.08,.7);
      if([0,2,4,6].includes(s)){ this.pluck(this.noteFreq(this.scale[(s/2+3)%8]+root), t, 2.8, .07); }
      if(s===2 || s===6) this.flute(this.noteFreq(root+19), t, 2.2, .03);
    }
  }
  sfx(name){
    if(!this.ready || !this.enabled) return;
    const ctx=this.ctx, t=ctx.currentTime;
    const out=this.sfxGain;
    const noise = (dur, type, freq, gain, q=.7, bus=out)=>{
      const n=ctx.createBufferSource(); n.buffer=this.noiseBuf;
      const f=ctx.createBiquadFilter(); f.type=type; f.frequency.value=freq; f.Q.value=q;
      const g=ctx.createGain(); g.gain.setValueAtTime(gain,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      n.connect(f); f.connect(g); g.connect(bus); n.start(t); n.stop(t+dur+.02);
    };
    switch(name){
      case 'click': noise(.05,'highpass',1800,.06,1); this.pluck(880,t,.08,.02,out); break;
      case 'hover': noise(.03,'highpass',2400,.025,1); break;
      case 'sword':
        noise(.18,'highpass',2200,.14,1); this.pluck(420,t,.2,.08,out);
        const o=ctx.createOscillator(); o.type='square'; o.frequency.setValueAtTime(1300,t); o.frequency.exponentialRampToValueAtTime(240,t+.16);
        const g=ctx.createGain(); g.gain.setValueAtTime(.05,t); g.gain.exponentialRampToValueAtTime(.0001,t+.18); o.connect(g); g.connect(out); o.start(t); o.stop(t+.2);
        break;
      case 'arrow': noise(.22,'bandpass',900,.12,.5); noise(.1,'highpass',3000,.04,1); break;
      case 'hit': this.drum(t,.22,.55); noise(.1,'lowpass',300,.18,.8); break;
      case 'heavy': this.drum(t,.4,.4); noise(.18,'lowpass',180,.25,.9); break;
      case 'fire': noise(.8,'lowpass',700,.14,.5); noise(.4,'bandpass',1800,.05,.7); break;
      case 'heal':
        [0,3,7,12].forEach((s,i)=>this.pluck(this.noteFreq(12+s),t+i*.07,.9,.045,out)); break;
      case 'buff':
        [0,5,10].forEach((s,i)=>this.pluck(this.noteFreq(7+s),t+i*.05,1.2,.05,out)); break;
      case 'coin':
        [0,7].forEach((s,i)=>this.pluck(this.noteFreq(24+s),t+i*.06,.5,.05,out)); break;
      case 'levelup':
        this.gong(t,.1,1.2); [0,4,7,12,16].forEach((s,i)=>this.pluck(this.noteFreq(12+s),t+.2+i*.1,1.2,.06,out)); break;
      case 'victory':
        this.gong(t,.18,1); [0,4,7,12,15,19].forEach((s,i)=>this.pluck(this.noteFreq(7+s),t+.3+i*.13,2.4,.06,out)); break;
      case 'defeat':
        this.gong(t,.14,.5); this.pluck(this.noteFreq(-5),t,.8,.09,out); this.pluck(this.noteFreq(-10),t+.2,1.3,.07,out); break;
      case 'march': this.drum(t,.12,.8); this.drum(t+.12,.09,.8); break;
      case 'gong': this.gong(t,.16,.8); break;
      case 'error': this.pluck(this.noteFreq(-7),t,.18,.07,out); this.pluck(this.noteFreq(-8),t+.1,.2,.05,out); break;
      case 'ui': this.pluck(this.noteFreq(19),t,.18,.025,out); break;
      default: noise(.05,'highpass',1800,.05,1);
    }
  }
}
const AUDIO = new AudioEngine();

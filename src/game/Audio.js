// Synthesized audio via Web Audio API — no external assets needed.
export class GameAudio {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.master = null;
  }
  ensure() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);
  }
  playTone(freq, dur, type = 'sine', vol = 0.2) {
    this.ensure();
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.master); o.start(); o.stop(this.ctx.currentTime + dur);
  }
  engineStart() {
    this.ensure();
    if (this.engineOsc) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 60;
    this.engineGain.gain.value = 0.04;
    this.engineOsc.connect(this.engineGain); this.engineGain.connect(this.master);
    this.engineOsc.start();
  }
  setEngineRpm(speed) {
    if (!this.engineOsc) return;
    this.engineOsc.frequency.setTargetAtTime(50 + Math.abs(speed) * 4, this.ctx.currentTime, 0.1);
  }
  engineStop() {
    if (this.engineOsc) { try { this.engineOsc.stop(); } catch(e){} this.engineOsc = null; this.engineGain = null; }
  }
}

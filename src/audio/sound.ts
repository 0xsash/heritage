// Procedural audio — no asset files. Wind rush that follows airspeed,
// wingbeat "whumps", footsteps, and synthesised church bells built from real
// bell partials (hum, prime, minor-third tierce, quint, nominal).

export class Sound {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private windGain!: GainNode;
  private windFilter!: BiquadFilterNode;
  private noise!: AudioBuffer;
  muted = false;

  start() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(this.ctx.destination);

    // shared white-noise buffer
    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const ch = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 400;
    this.windFilter.Q.value = 0.7;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;
    src.connect(this.windFilter).connect(this.windGain).connect(this.master);
    src.start();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.7;
  }

  /** speed in m/s, 0 when on foot */
  wind(speed: number, boosting: boolean) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const s = Math.min(speed / 80, 1.2);
    this.windGain.gain.setTargetAtTime(0.02 + s * s * 0.35 + (boosting ? 0.08 : 0), t, 0.15);
    this.windFilter.frequency.setTargetAtTime(250 + s * 1400, t, 0.2);
  }

  private burst(dur: number, freq: number, gain: number, type: BiquadFilterType = 'lowpass', q = 0.8) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.4), t + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 1.5, dur + 0.05);
  }

  flap(strength: number) {
    // randomise pitch a little every time (GMTK: randomise SFX)
    this.burst(0.32, 420 + Math.random() * 120, 0.18 + strength * 0.25);
    this.thump(55 + Math.random() * 10, 0.08 + strength * 0.08, 0.18);
  }

  step() {
    this.burst(0.07, 1800 + Math.random() * 900, 0.05, 'bandpass', 1.5);
  }

  land(impact: number) {
    this.thump(48, 0.35 * impact + 0.1, 0.4);
    this.burst(0.5, 700, 0.2 * impact + 0.05);
  }

  takeoff() {
    this.burst(0.7, 900, 0.35);
    this.thump(60, 0.25, 0.3);
  }

  private thump(freq: number, gain: number, dur: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * 1.8, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + dur * 0.5);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /**
   * A church bell. Partials of a tuned Flemish bell relative to the nominal:
   * hum 0.5, prime 1, tierce 1.2 (minor third), quint 1.5, nominal 2, upper partials.
   * `cracked` detunes and buzzes — for the Mustard Pot.
   */
  bell(fundamental = 196, gain = 0.35, cracked = false) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.02;
    const partials: [number, number, number][] = [
      [0.5, 0.5, 9], [1, 0.6, 7], [1.2, 0.45, 5], [1.5, 0.25, 4], [2, 0.5, 3.5], [2.5, 0.2, 2.5], [3, 0.15, 2], [4.2, 0.08, 1.4],
    ];
    const out = this.ctx.createGain();
    out.gain.value = gain;
    out.connect(this.master);
    for (const [ratio, amp, decay] of partials) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      const detune = cracked ? (Math.random() - 0.5) * 60 : (Math.random() - 0.5) * 4;
      o.frequency.value = fundamental * ratio;
      o.detune.value = detune;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(amp, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + decay + 0.1);
    }
    // strike transient
    if (cracked) this.burst(0.35, 3000, 0.08, 'bandpass', 4);
  }

  /** a short carillon phrase */
  chime(cracked = false) {
    const notes = cracked ? [196, 233, 175] : [392, 330, 294, 262];
    notes.forEach((f, i) => setTimeout(() => this.bell(f, 0.22, cracked), i * 260));
  }
}

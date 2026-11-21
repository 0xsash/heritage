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

  // ---------------------------------------------------------------- combat
  // Layered like the research says: a body (low thump), a bite (noise), and a
  // little random pitch so a hundred hits never sound like one.

  swing(heavy = false) {
    this.burst(heavy ? 0.28 : 0.18, heavy ? 1400 : 2600 + Math.random() * 700, heavy ? 0.16 : 0.1, 'bandpass', 1.2);
  }

  hit(crit = false, metal = false) {
    this.thump(70 + Math.random() * 20, crit ? 0.55 : 0.38, 0.22);
    this.burst(0.16, metal ? 4200 : 1500 + Math.random() * 500, crit ? 0.32 : 0.22, metal ? 'bandpass' : 'lowpass', metal ? 6 : 0.8);
    if (metal) this.ring(1800 + Math.random() * 400, 0.05, 0.25);
  }

  kill() {
    this.thump(45, 0.6, 0.5);
    this.burst(0.45, 900, 0.25);
  }

  hurt() {
    this.thump(90, 0.45, 0.25);
    this.burst(0.22, 600, 0.25);
  }

  whoosh() {
    this.burst(0.35, 1200, 0.2, 'bandpass', 0.9);
  }

  fire() {
    this.burst(0.5, 800 + Math.random() * 200, 0.3, 'lowpass', 0.6);
    this.thump(80, 0.15, 0.2);
  }

  boom() {
    this.thump(38, 0.8, 0.7);
    this.burst(0.9, 1100, 0.4, 'lowpass', 0.5);
  }

  shot() {
    this.burst(0.08, 5000, 0.5, 'highpass', 0.7);
    this.thump(60, 0.6, 0.3);
    this.burst(0.6, 700, 0.15);
  }

  howl() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, t);
    o.frequency.linearRampToValueAtTime(420, t + 0.5);
    o.frequency.linearRampToValueAtTime(300, t + 1.6);
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 700;
    f.Q.value = 3;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    o.connect(f).connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 1.9);
  }

  coins() {
    for (let i = 0; i < 4; i++) setTimeout(() => this.ring(2600 + Math.random() * 900, 0.06, 0.12), i * 55);
  }

  loot(rarity: number) {
    // rarer things get a brighter, longer jingle (Diablo's drop sounds)
    const notes = [[523], [523, 659], [523, 659, 784], [523, 659, 784, 1047]][rarity] ?? [523];
    notes.forEach((f, i) => setTimeout(() => this.bell(f, 0.12 + rarity * 0.04), i * 110));
  }

  levelUp() {
    [262, 330, 392, 523, 659].forEach((f, i) => setTimeout(() => this.bell(f, 0.22), i * 140));
  }

  questDone() {
    [392, 523, 659].forEach((f, i) => setTimeout(() => this.bell(f, 0.2), i * 180));
  }

  // ---------------------------------------------------------------- cinematic
  // Beds that loop and can swell or fade (a drone, water, a crowd), a room for
  // distant things (a generated echo, no file), and a few one-shots. All of it
  // is made from oscillators and the shared noise buffer.

  private beds = new Map<string, { gain: GainNode; stop: () => void; extra?: (v: number, t: number) => void }>();
  private room: ConvolverNode | null = null;
  private roomIn: GainNode | null = null;

  /** A long, dark echo for bells across fields and voices in a church. */
  private reverb() {
    if (!this.ctx) return null;
    if (this.roomIn) return this.roomIn;
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * 3.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    this.room = ctx.createConvolver();
    this.room.buffer = ir;
    this.roomIn = ctx.createGain();
    this.roomIn.gain.value = 0.55;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    this.roomIn.connect(this.room).connect(lp).connect(this.master);
    return this.roomIn;
  }

  private makeBed(name: string): { gain: GainNode; stop: () => void; extra?: (v: number, t: number) => void } | null {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(this.master);
    const nodes: AudioScheduledSourceNode[] = [];
    const osc = (type: OscillatorType, f: number, g: number, dest: AudioNode, detune = 0) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = detune;
      const gg = ctx.createGain();
      gg.gain.value = g;
      o.connect(gg).connect(dest);
      o.start();
      nodes.push(o);
      return { o, g: gg };
    };
    const noise = (dest: AudioNode) => {
      const s = ctx.createBufferSource();
      s.buffer = this.noise;
      s.loop = true;
      s.connect(dest);
      s.start(0, Math.random() * 1.5);
      nodes.push(s);
      return s;
    };
    const lfo = (rate: number, depth: number, param: AudioParam) => {
      const o = ctx.createOscillator();
      o.frequency.value = rate;
      const g = ctx.createGain();
      g.gain.value = depth;
      o.connect(g).connect(param);
      o.start();
      nodes.push(o);
    };
    let extra: ((v: number, t: number) => void) | undefined;
    if (name === 'drone') {
      // a low organ-like pad on D: root, fifth, octave, slowly beating, under a lowpass that opens as it swells
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 320;
      f.Q.value = 0.6;
      f.connect(out);
      const room = this.reverb();
      if (room) {
        const send = ctx.createGain();
        send.gain.value = 0.35;
        f.connect(send).connect(room);
      }
      osc('sawtooth', 73.4, 0.16, f, -6);
      osc('sawtooth', 73.4, 0.16, f, 7);
      osc('triangle', 110, 0.14, f, 3);
      osc('sawtooth', 146.8, 0.06, f, -4);
      osc('sine', 36.7, 0.35, out);
      lfo(0.07, 90, f.frequency);
      extra = (v, t) => f.frequency.setTargetAtTime(240 + v * 900, t, 1.2);
    } else if (name === 'water') {
      // slow lapping: low noise, its level breathing
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 520;
      const am = ctx.createGain();
      am.gain.value = 0.6;
      noise(f);
      f.connect(am).connect(out);
      lfo(0.31, 0.3, am.gain);
      const f2 = ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.value = 1500;
      f2.Q.value = 2;
      const am2 = ctx.createGain();
      am2.gain.value = 0.08;
      noise(f2);
      f2.connect(am2).connect(out);
      lfo(0.83, 0.07, am2.gain);
    } else if (name === 'murmur') {
      // many voices, far off: band-limited noise with syllable-rate wobble on three bands
      for (const [fc, rate] of [[420, 3.1], [700, 4.3], [1050, 2.4]] as const) {
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = fc;
        f.Q.value = 3;
        const am = ctx.createGain();
        am.gain.value = 0.35;
        noise(f);
        f.connect(am).connect(out);
        lfo(rate, 0.25, am.gain);
        lfo(rate * 0.37, 60, f.frequency);
      }
    } else if (name === 'night') {
      // a still night: a faint high wind and, far away, a frog chorus (pulsed sine)
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 900;
      f.Q.value = 0.5;
      const g = ctx.createGain();
      g.gain.value = 0.25;
      noise(f);
      f.connect(g).connect(out);
      lfo(0.11, 0.12, g.gain);
      const frogs = osc('square', 1850, 0.0, out);
      const pulse = ctx.createGain();
      pulse.gain.value = 0;
      frogs.g.disconnect();
      frogs.g.connect(pulse).connect(out);
      frogs.g.gain.value = 0.012;
      lfo(13, 1, pulse.gain);
    } else if (name === 'wind') {
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 500;
      f.Q.value = 0.8;
      noise(f);
      f.connect(out);
      lfo(0.13, 260, f.frequency);
    } else return null;
    const bed = {
      gain: out,
      stop: () => {
        for (const n of nodes) {
          try {
            n.stop();
          } catch {
            /* already stopped */
          }
        }
        out.disconnect();
      },
      extra,
    };
    this.beds.set(name, bed);
    return bed;
  }

  /** Bring a bed (drone, water, murmur, night, wind) to a level over some seconds. 0 silences it. */
  bed(name: 'drone' | 'water' | 'murmur' | 'night' | 'wind', level: number, seconds = 2) {
    if (!this.ctx) return;
    const b = this.beds.get(name) ?? (level > 0 ? this.makeBed(name) : null);
    if (!b) return;
    const t = this.ctx.currentTime;
    const peak: Record<string, number> = { drone: 0.22, water: 0.16, murmur: 0.09, night: 0.07, wind: 0.12 };
    b.gain.gain.cancelScheduledValues(t);
    b.gain.gain.setTargetAtTime(Math.max(0, level) * (peak[name] ?? 0.1), t, Math.max(0.05, seconds / 3));
    b.extra?.(level, t);
  }

  /** Everything cinematic falls silent (a film ended or was skipped). */
  cineStop(seconds = 0.6) {
    for (const name of this.beds.keys()) this.bed(name as 'drone', 0, seconds);
  }

  /** A bell far away, across the fields: darker, softer, with a long echo. */
  bellFar(fundamental = 147, gain = 0.25) {
    if (!this.ctx) return;
    const room = this.reverb();
    const t = this.ctx.currentTime + 0.02;
    const out = this.ctx.createGain();
    out.gain.value = gain;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    out.connect(lp);
    lp.connect(this.master);
    if (room) lp.connect(room);
    for (const [ratio, amp, decay] of [[0.5, 0.5, 9], [1, 0.6, 7], [1.2, 0.4, 5], [1.5, 0.2, 4], [2, 0.45, 3.5], [3, 0.1, 2]] as [number, number, number][]) {
      const o = this.ctx.createOscillator();
      o.frequency.value = fundamental * ratio;
      o.detune.value = (Math.random() - 0.5) * 5;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(amp, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + decay + 0.1);
    }
  }

  /** The bells of the land, one after another, each further and fainter; the last one does not come. */
  bellsGoingOut(n = 5, every = 1.6) {
    for (let i = 0; i < n; i++) setTimeout(() => this.bellFar(196 - i * 14, 0.3 * Math.pow(0.62, i)), i * every * 1000);
  }

  /** A deep hit for a cut to black or a title. */
  hitLow(gain = 0.5) {
    this.thump(32, gain, 1.6);
    this.burst(1.4, 260, gain * 0.25, 'lowpass', 0.4);
    const room = this.reverb();
    if (room && this.ctx) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const t = this.ctx.currentTime;
      o.frequency.setValueAtTime(55, t);
      o.frequency.exponentialRampToValueAtTime(30, t + 1.5);
      g.gain.setValueAtTime(gain * 0.4, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      o.connect(g).connect(room);
      o.start(t);
      o.stop(t + 2.3);
    }
  }

  /** A shuttle passing through a loom, and the beater: tak-tak. */
  loom() {
    this.burst(0.12, 900, 0.07, 'bandpass', 2);
    setTimeout(() => this.thump(140, 0.12, 0.08), 180);
    setTimeout(() => this.thump(120, 0.1, 0.08), 330);
  }

  /** A crossbow or a bowstring. */
  twang() {
    this.ring(220, 0.08, 0.35);
    this.burst(0.15, 3000, 0.08, 'bandpass', 1.5);
  }

  /** Cart wheels on a dirt track and a creaking axle. */
  creak() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(180 + Math.random() * 60, t);
    o.frequency.linearRampToValueAtTime(130 + Math.random() * 40, t + 0.45);
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 900;
    f.Q.value = 6;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.03, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(f).connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.55);
  }

  /** A drum roll far off, for the garrison. */
  drum(beats = 6) {
    for (let i = 0; i < beats; i++) setTimeout(() => { this.thump(90, 0.12, 0.12); this.burst(0.06, 1800, 0.04, 'bandpass', 1); }, i * 140 + (i % 2) * 30);
  }

  /** A high, thin ring that comes when the world goes quiet. */
  silence(seconds = 3) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.frequency.value = 3520;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.006, t + seconds * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + seconds + 0.05);
  }

  /** A splash, small or large. */
  splash(big = false) {
    this.burst(big ? 0.9 : 0.4, big ? 1600 : 2400, big ? 0.3 : 0.12, 'lowpass', 0.7);
    if (big) this.thump(50, 0.4, 0.5);
  }

  private ring(freq: number, gain: number, dur: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}

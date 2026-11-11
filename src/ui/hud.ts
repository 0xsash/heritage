// HUD: compass with landmarks, discovery cards, location line (real street
// names), context prompts, controls help, and a parchment map.

import type { Discovery, World } from '../world/world';

const el = (cls: string, html = '') => {
  const d = document.createElement('div');
  d.className = cls;
  d.innerHTML = html;
  return d;
};

export class Hud {
  root: HTMLElement;
  private compass = el('compass');
  private compassMarks: { el: HTMLElement; yaw?: number; d?: Discovery }[] = [];
  private card = el('discovery');
  private loc = el('loc');
  private prompt = el('prompt');
  private toast = el('toast');
  private toastTimer = 0;
  private help: HTMLElement;
  private map = el('map');
  private mapCanvas = document.createElement('canvas');
  private mapBase: HTMLCanvasElement | null = null;
  private cardTimer = 0;
  private cardQueue: { kicker: string; title: string; text: string }[] = [];
  overlay = el('overlay');

  constructor(root: HTMLElement, private world: World) {
    this.root = root;
    this.compass.appendChild(el('needle'));
    for (const [label, yaw] of [['N', Math.PI], ['E', Math.PI / 2], ['S', 0], ['W', -Math.PI / 2]] as const) {
      const m = el('mark card', label);
      this.compass.appendChild(m);
      this.compassMarks.push({ el: m, yaw });
    }
    this.help = el(
      'help',
      `<h3>CONTROLS</h3><table>
      <tr><td>Mouse</td><td>Steer &amp; look (click to capture, or drag)</td></tr>
      <tr><td>W / S</td><td>Flap harder / brake &amp; hover</td></tr>
      <tr><td>Space / C</td><td>Climb / dive</td></tr>
      <tr><td>Shift</td><td>Boost (flying) · run (on foot)</td></tr>
      <tr><td>E</td><td>Land · mount · call your dragon</td></tr>
      <tr><td>WASD</td><td>Walk (on foot) · Space jump</td></tr>
      <tr><td>M · T · H</td><td>Map · change the light · hide help</td></tr>
      <tr><td>Gamepad</td><td>LS steer · RS camera · RT/LT speed · A climb · B dive · X boost · Y land/mount</td></tr>
      </table>`,
    );
    this.map.appendChild(this.mapCanvas);
    this.map.appendChild(el('legend', 'DIEST &amp; THE DEMER VALLEY — press M to close'));
    root.append(
      this.compass, this.card, this.loc, this.prompt, this.toast, this.help, this.map,
      el('attrib', 'Map data © OpenStreetMap contributors'),
      this.overlay,
    );
  }

  /** Call once the world (and its discoveries) is built. */
  initMarks() {
    for (const d of this.world.discoveries.filter((d) => d.major)) {
      const m = el('mark poi', '◆ ' + d.title);
      this.compass.appendChild(m);
      this.compassMarks.push({ el: m, d });
    }
  }

  showTitle(loading: string) {
    this.overlay.innerHTML = `
      <h1>BELFORT</h1>
      <h2>PROLOGUE · THE QUIET BELLS OF DIEST</h2>
      <p>Flanders, in a Long Golden Age that never quite ended. The belfries have gone silent, the Demer runs black, and a gilded hatchling has chosen <em>you</em>. Neither of you is sure why.</p>
      <div class="loading">${loading}</div>`;
  }

  ready(onStart: () => void) {
    this.overlay.querySelector('.loading')?.remove();
    const cta = el('cta', 'CLICK TO TAKE FLIGHT');
    const small = el('small', 'Best with mouse &amp; keyboard or a gamepad · headphones recommended');
    this.overlay.append(cta, small);
    this.overlay.addEventListener(
      'click',
      () => {
        this.overlay.classList.add('hidden');
        onStart();
      },
      { once: true },
    );
  }

  setLoading(msg: string) {
    const l = this.overlay.querySelector('.loading');
    if (l) l.textContent = msg;
  }

  pauseOverlay(show: boolean) {
    if (show) {
      this.overlay.innerHTML = '<h2>PAUSED</h2><div class="cta">CLICK TO RESUME</div>';
      this.overlay.classList.remove('hidden');
    } else this.overlay.classList.add('hidden');
  }

  /** Brief message at the bottom of the screen (time of day, quality changes). */
  flash(text: string) {
    this.toast.textContent = text;
    this.toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast.classList.remove('show'), 2600);
  }

  toggleHelp() {
    this.help.classList.toggle('hidden');
  }

  discover(d: Discovery) {
    this.cardQueue.push({ kicker: d.major ? 'DISCOVERED' : 'NOTED', title: d.title, text: d.text });
  }

  announce(kicker: string, title: string, text: string) {
    this.cardQueue.push({ kicker, title, text });
  }

  setPrompt(html: string | null) {
    if (html) {
      this.prompt.innerHTML = html;
      this.prompt.classList.add('show');
    } else this.prompt.classList.remove('show');
  }

  setLocation(where: string, meta: string) {
    this.loc.innerHTML = `<div class="where">${where}</div><div class="meta">${meta}</div>`;
  }

  update(dt: number, camYaw: number, px: number, pz: number) {
    // cards
    this.cardTimer -= dt;
    if (this.cardTimer <= 0 && this.card.classList.contains('show')) this.card.classList.remove('show');
    if (this.cardTimer < -1.2 && this.cardQueue.length) {
      const c = this.cardQueue.shift()!;
      this.card.innerHTML = `<div class="kicker">${c.kicker}</div><div class="title">${c.title}</div><div class="rule"></div><div class="text">${c.text}</div>`;
      this.card.classList.add('show');
      this.cardTimer = 7.5;
    }
    // compass: camera yaw 0 faces +z (south)
    const w = this.compass.clientWidth;
    const fovSpan = Math.PI * 0.75;
    for (const m of this.compassMarks) {
      let yaw: number;
      if (m.yaw !== undefined) yaw = m.yaw;
      else {
        const d = m.d!;
        const dist = Math.hypot(d.x - px, d.z - pz);
        if (dist < 40 || dist > 9000) { m.el.style.display = 'none'; continue; }
        yaw = Math.atan2(d.x - px, d.z - pz);
        m.el.classList.toggle('found', d.found);
        let r2 = camYaw - yaw;
        r2 = Math.atan2(Math.sin(r2), Math.cos(r2));
        // Only the marker nearest the centre gets a label; the rest are diamonds.
        const label = Math.abs(r2) < 0.07 && m === this.centred(camYaw, px, pz);
        m.el.textContent = (d.found ? '◆' : '◇') + (label ? ' ' + d.title + '  ' + (dist > 1000 ? (dist / 1000).toFixed(1) + ' km' : Math.round(dist) + ' m') : '');
      }
      let rel = camYaw - yaw;
      rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      if (Math.abs(rel) > fovSpan / 2) { m.el.style.display = 'none'; continue; }
      m.el.style.display = '';
      m.el.style.left = `${w / 2 + (rel / (fovSpan / 2)) * (w / 2)}px`;
    }
    if (this.map.classList.contains('show')) this.drawMap(px, pz, camYaw);
  }

  private centred(camYaw: number, px: number, pz: number) {
    let best: (typeof this.compassMarks)[number] | null = null, bd = Infinity;
    for (const m of this.compassMarks) {
      if (!m.d) continue;
      const dist = Math.hypot(m.d.x - px, m.d.z - pz);
      if (dist < 40 || dist > 9000) continue;
      let r = camYaw - Math.atan2(m.d.x - px, m.d.z - pz);
      r = Math.abs(Math.atan2(Math.sin(r), Math.cos(r)));
      const score = r + dist / 200000;
      if (score < bd) { bd = score; best = m; }
    }
    return best;
  }

  toggleMap() {
    this.map.classList.toggle('show');
    return this.map.classList.contains('show');
  }

  private bakeMap() {
    const [x0, z0, x1, z1] = this.world.data.bounds;
    const S = 0.25; // px per metre
    const c = document.createElement('canvas');
    c.width = Math.ceil((x1 - x0) * S);
    c.height = Math.ceil((z1 - z0) * S);
    const g = c.getContext('2d')!;
    g.fillStyle = '#d9c9a3';
    g.fillRect(0, 0, c.width, c.height);
    const poly = (p: number[]) => {
      g.beginPath();
      for (let i = 0; i < p.length; i += 2) {
        const X = (p[i] - x0) * S, Y = (p[i + 1] - z0) * S;
        if (i === 0) g.moveTo(X, Y); else g.lineTo(X, Y);
      }
    };
    const landCol: Record<string, string> = { wood: '#93a06c', farm: '#d4c48f', meadow: '#c2c78e', grass: '#c2c78e', park: '#b5c086', res: '#d0bf98', wet: '#a9b494' };
    for (const l of this.world.data.land) {
      const col = landCol[l.k];
      if (!col) continue;
      g.fillStyle = col;
      poly(l.p); g.fill();
    }
    g.fillStyle = '#6f8b93';
    for (const w of this.world.data.waterAreas) { poly(w); g.fill(); }
    g.strokeStyle = '#4f6b73';
    g.lineCap = 'round';
    for (const w of this.world.data.waterLines) { g.lineWidth = Math.max(1, w.w * S * 1.4); poly(w.p); g.stroke(); }
    g.strokeStyle = '#a58f6c';
    for (const r of this.world.data.roads) {
      if (r.k === 'path' || r.k === 'footway' || r.k === 'track' || r.k === 'cycleway') continue;
      g.lineWidth = Math.max(0.6, r.w * S); poly(r.p); g.stroke();
    }
    g.fillStyle = '#7a4a34';
    for (const b of this.world.data.buildings) { poly(b.p); g.fill(); }
    this.mapBase = c;
  }

  private drawMap(px: number, pz: number, yaw: number) {
    if (!this.mapBase) this.bakeMap();
    const base = this.mapBase!;
    const cw = (this.mapCanvas.width = this.map.clientWidth * devicePixelRatio);
    const ch = (this.mapCanvas.height = this.map.clientHeight * devicePixelRatio);
    const g = this.mapCanvas.getContext('2d')!;
    const [x0, z0] = this.world.data.bounds;
    const S = 0.25;
    const zoom = Math.min(cw / base.width, ch / base.height) * 1.0;
    const ox = (cw - base.width * zoom) / 2, oy = (ch - base.height * zoom) / 2;
    g.fillStyle = '#1a140d';
    g.fillRect(0, 0, cw, ch);
    g.drawImage(base, ox, oy, base.width * zoom, base.height * zoom);
    const toScreen = (x: number, z: number) => [ox + (x - x0) * S * zoom, oy + (z - z0) * S * zoom];
    g.font = `${13 * devicePixelRatio}px "EB Garamond", serif`;
    g.textAlign = 'center';
    for (const d of this.world.discoveries) {
      if (!d.major && !d.found) continue;
      const [X, Y] = toScreen(d.x, d.z);
      g.fillStyle = d.found ? '#3a2410' : '#7a6448';
      g.beginPath(); g.arc(X, Y, 4 * devicePixelRatio, 0, Math.PI * 2); g.fill();
      g.fillText(d.found ? d.title : '?', X, Y - 8 * devicePixelRatio);
    }
    const [X, Y] = toScreen(px, pz);
    g.save();
    g.translate(X, Y);
    g.rotate(-yaw + Math.PI);
    g.fillStyle = '#b3261e';
    g.beginPath();
    const s = 9 * devicePixelRatio;
    g.moveTo(0, -s); g.lineTo(s * 0.6, s * 0.7); g.lineTo(0, s * 0.3); g.lineTo(-s * 0.6, s * 0.7); g.closePath();
    g.fill();
    g.restore();
  }
}

// HUD: compass with landmarks, discovery cards, location line, context
// prompts, the quest tracker, controls help, and a parchment map.

import type { Discovery, World } from '../world/world';
import { CONTROLS } from '../core/input';
import { hint } from './nav';

const escH = (t: string) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

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
  private questMark = el('mark quest', '');
  private tracker = el('tracker', '');
  /** the tracked quest objective: shown on the compass, the map and the tracker */
  questTarget: { x: number; z: number; title: string; objective: string; r?: number } | null = null;
  /** up to three quests for the tracker: the tracked one first, with its objectives */
  trackerList: { title: string; kind: string; level?: number; objectives: string[]; tracked: boolean }[] = [];
  /** extra map marks: quest givers (! / ?), enemy camps */
  mapMarks: { x: number; z: number; kind: '!' | '?' | 'camp' | 'camp-cleared' | 'svc' | 'pin'; label: string; glyph?: string }[] = [];
  /** map zoom (1: the whole valley); opening the map near Diest zooms in on the town, the wheel changes it */
  mapScale = 1;
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
  /** hold discovery cards back (a banner is showing) */
  hold = false;

  constructor(root: HTMLElement, private world: World) {
    this.root = root;
    this.compass.appendChild(el('needle'));
    this.compass.appendChild(this.questMark);
    for (const [label, yaw] of [['N', Math.PI], ['O', Math.PI / 2], ['Z', 0], ['W', -Math.PI / 2]] as const) {
      const m = el('mark card', label);
      this.compass.appendChild(m);
      this.compassMarks.push({ el: m, yaw });
    }
    // H shows the keys of the moment (in the air or on foot, for the device in use); the pause menu has them all
    this.help = el('help');
    this.setHelp(false, false);
    this.help.classList.add('hidden'); // H shows it; the tutorial teaches the rest as you go
    this.map.appendChild(this.mapCanvas);
    this.map.appendChild(el('legend', `DIEST &amp; HET DEMERDAL · ANNO 1650 <span class="mapzoom">· ${hint('muiswiel: in- en uitzoomen · M of Esc: sluiten', 'RB / LB: in- en uitzoomen · B: sluiten')}</span>`));
    window.addEventListener('wheel', (e) => {
      if (!this.map.classList.contains('show')) return;
      this.zoomMap(e.deltaY < 0 ? 1 : -1);
    });
    this.map.appendChild(el('map-credit', 'Stadsplan naar OpenStreetMap-bijdragers (ODbL) en de Ferrariskaart van 1777 (Digitaal Vlaanderen)'));
    root.append(
      this.compass, this.tracker, this.card, this.loc, this.prompt, this.toast, this.help, this.map,
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
      <h2>HET HERTOGDOM BRABANT · ANNO 1650</h2>
      <div class="loading">${loading}</div>`;
  }

  ready(onStart: () => void) {
    this.overlay.querySelector('.loading')?.remove();
    const cta = el('cta', 'KLIK OM TE BEGINNEN');
    const small = el('small', 'Je speelt het best met muis en toetsenbord of een gamepad, en met een koptelefoon<br><span class="credit">Stadsplan naar OpenStreetMap-bijdragers (ODbL) en de Ferrariskaart van 1777 (Digitaal Vlaanderen)</span>');
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
      this.overlay.innerHTML = '<h2>PAUZE</h2><div class="cta">KLIK OM VERDER TE SPELEN</div>';
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

  private helpKey = '';
  /** The H card: the keys of the situation (flying or on foot) for the device in use. */
  setHelp(flying: boolean, pad: boolean) {
    const key = `${flying}${pad}`;
    if (key === this.helpKey) return;
    this.helpKey = key;
    const g = CONTROLS.find((c) => c.when === (flying ? 'fly' : 'foot'))!;
    const any = CONTROLS.find((c) => c.when === 'any')!.rows.slice(0, 3);
    const row = (r: { what: string; kbd: string; pad: string }) => `<tr><td>${escH(pad ? r.pad : r.kbd)}</td><td>${escH(r.what)}</td></tr>`;
    this.help.innerHTML = `<h3>BESTURING · ${flying ? 'IN DE LUCHT' : 'TE VOET'}</h3><table>${g.rows.map(row).join('')}${any.map(row).join('')}</table>
      <div class="help-more">${pad ? 'Alle knoppen: Start, dan Besturing' : 'H: verbergen · alle toetsen: Esc, dan Besturing'}</div>`;
  }

  /** The controls, all of them, keyboard and gamepad side by side: the pause menu's BESTURING page. */
  helpHtml() {
    const table = (c: (typeof CONTROLS)[number]) => `<table><tr><th>${escH(c.group.toUpperCase())}</th><th>Toetsenbord</th><th>Gamepad</th></tr>${c.rows.map((r) => `<tr><td>${escH(r.what)}</td><td>${escH(r.kbd)}</td><td>${escH(r.pad)}</td></tr>`).join('')}</table>`;
    return `<h3>BESTURING</h3><div class="gm-help-cols"><div>${CONTROLS.slice(0, 2).map(table).join('')}</div><div>${CONTROLS.slice(2).map(table).join('')}</div></div>`;
  }

  /** Zoom the map in (+1) or out (-1): the wheel, RB / LB, up / down. */
  zoomMap(d: number) {
    this.mapScale = Math.max(1, Math.min(8, this.mapScale * (d > 0 ? 1.25 : 0.8)));
  }

  get mapOpen() {
    return this.map.classList.contains('show');
  }

  /** the map's element (a screen of its own: nav.ts) */
  get mapEl() {
    return this.map;
  }

  discover(d: Discovery) {
    this.cardQueue.push({ kicker: d.major ? 'ONTDEKT' : 'GEZIEN', title: d.title, text: d.text });
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
    if (this.cardTimer < -1.2 && this.cardQueue.length && !this.hold) {
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
        m.el.textContent = (d.found ? '◆' : '◇') + (label ? ' ' + d.title : '');
      }
      let rel = camYaw - yaw;
      rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      if (Math.abs(rel) > fovSpan / 2) { m.el.style.display = 'none'; continue; }
      m.el.style.display = '';
      m.el.style.left = `${w / 2 + (rel / (fovSpan / 2)) * (w / 2)}px`;
    }
    // the one named landmark keeps its name readable: cardinals and diamonds under it step aside
    const named = this.compassMarks.find((m) => m.d && m.el.style.display !== 'none' && m.el.textContent!.length > 2);
    const nx = named ? parseFloat(named.el.style.left) : 0, nw = named ? named.el.offsetWidth / 2 + 6 : 0;
    for (const m of this.compassMarks) {
      if (m === named || m.el.style.display === 'none') { m.el.style.visibility = ''; continue; }
      const hit = !!named && Math.abs(parseFloat(m.el.style.left) - nx) < nw + m.el.offsetWidth / 2;
      m.el.style.visibility = hit ? 'hidden' : '';
    }
    // tracked quest objective
    const qt = this.questTarget;
    if (qt) {
      let rel = camYaw - Math.atan2(qt.x - px, qt.z - pz);
      rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      const edge = Math.abs(rel) > fovSpan / 2;
      const r = Math.max(-fovSpan / 2, Math.min(fovSpan / 2, rel));
      this.questMark.style.display = '';
      // at the edge, keep the whole marker (with its arrow) inside the strip
      const pad = edge ? 22 : 8;
      this.questMark.style.left = `${Math.max(pad, Math.min(w - pad, w / 2 + (r / (fovSpan / 2)) * (w / 2)))}px`;
      this.questMark.textContent = edge ? (rel < 0 ? '◂ ⬥' : '⬥ ▸') : '⬥';
    } else {
      this.questMark.style.display = 'none';
    }
    const html = this.trackerList
      .slice(0, 3)
      .map((t) => `<div class="tq${t.tracked ? ' on' : ''} k-${t.kind}"><div class="t-title">${t.kind === 'main' ? '◆ ' : ''}${t.title}${t.level ? `<span class="t-lv">${t.level}</span>` : ''}</div>${(t.tracked ? t.objectives : t.objectives.slice(0, 1)).map((o) => `<div class="t-obj">${o}</div>`).join('')}</div>`)
      .join('');
    const full = html || (qt ? `<div class="tq on"><div class="t-title">${qt.title}</div><div class="t-obj">${qt.objective}</div></div>` : '');
    if (this.tracker.innerHTML !== full) this.tracker.innerHTML = full;
    this.tracker.style.display = full ? '' : 'none';
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

  toggleMap(px?: number, pz?: number) {
    this.map.classList.toggle('show');
    const open = this.map.classList.contains('show');
    // the map is a screen: the mouse is let go, like for the book
    if (open) document.exitPointerLock?.();
    // in and around Diest the town is what you want to see; out in the valley, the valley
    if (open && px !== undefined && pz !== undefined) this.mapScale = Math.hypot(px - 200, pz) < 1500 ? 4 : 1;
    return open;
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
    const zoom = Math.min(cw / base.width, ch / base.height) * this.mapScale;
    let ox = (cw - base.width * zoom) / 2, oy = (ch - base.height * zoom) / 2;
    if (this.mapScale > 1) {
      // zoomed: keep the player in the middle, but never show past the edge of the map
      ox = Math.min(0, Math.max(cw - base.width * zoom, cw / 2 - (px - x0) * S * zoom));
      oy = Math.min(0, Math.max(ch - base.height * zoom, ch / 2 - (pz - z0) * S * zoom));
    }
    g.fillStyle = '#1a140d';
    g.fillRect(0, 0, cw, ch);
    g.drawImage(base, ox, oy, base.width * zoom, base.height * zoom);
    const toScreen = (x: number, z: number) => [ox + (x - x0) * S * zoom, oy + (z - z0) * S * zoom];
    g.textAlign = 'center';
    const dp = devicePixelRatio;
    // labels last, most important first, and none on top of another ("MarkMarskraamster")
    type Label = { text: string; x: number; y: number; font: string; fill: string; halo?: string; prio: number };
    const labels: Label[] = [];
    for (const d of this.world.discoveries) {
      if (!d.major && !d.found) continue;
      const [X, Y] = toScreen(d.x, d.z);
      g.fillStyle = d.found ? '#3a2410' : '#7a6448';
      g.beginPath(); g.arc(X, Y, 4 * dp, 0, Math.PI * 2); g.fill();
      labels.push({ text: d.found ? d.title : '?', x: X, y: Y - 8 * dp, font: `${13 * dp}px "EB Garamond", serif`, fill: d.found ? '#3a2410' : '#7a6448', prio: d.found ? 3 : 5 });
    }
    g.font = `bold ${15 * dp}px Cinzel, Georgia, serif`;
    for (const m of this.mapMarks) {
      const [MX, MY] = toScreen(m.x, m.z);
      if (m.kind === 'svc' || m.kind === 'pin') {
        // a service (shop, guide, board) or a place someone pointed you to
        const r = (m.kind === 'pin' ? 9 : 7.5) * dp;
        g.fillStyle = m.kind === 'pin' ? '#e8a91e' : '#f2e6cc';
        g.strokeStyle = '#2a1a08';
        g.lineWidth = 1.5 * dp;
        g.beginPath(); g.arc(MX, MY, r, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = '#2a1a08';
        g.font = `${11 * dp}px "EB Garamond", serif`;
        g.textBaseline = 'middle';
        g.fillText(m.glyph ?? '•', MX, MY + 0.5 * dp);
        g.textBaseline = 'alphabetic';
        if (m.kind === 'pin' || this.mapScale >= 3) labels.push({ text: m.label, x: MX, y: MY + r + 12 * dp, font: `${12 * dp}px "EB Garamond", serif`, fill: '#2a1a08', halo: 'rgba(242, 230, 204, 0.85)', prio: m.kind === 'pin' ? 1 : 4 });
        g.font = `bold ${15 * dp}px Cinzel, Georgia, serif`;
      } else if (m.kind === '!' || m.kind === '?') {
        g.lineWidth = 4 * dp;
        g.strokeStyle = '#2a1a08';
        g.strokeText(m.kind, MX, MY);
        g.fillStyle = '#e8a91e';
        g.fillText(m.kind, MX, MY);
      } else {
        g.fillStyle = m.kind === 'camp' ? '#8a1e14' : '#6a5a48';
        g.beginPath();
        g.arc(MX, MY - 5 * dp, 6 * dp, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#f2e6cc';
        g.font = `${10 * dp}px "EB Garamond", serif`;
        g.fillText('✕', MX, MY - 1.5 * dp);
        labels.push({ text: m.label, x: MX, y: MY + 12 * dp, font: `${12 * dp}px "EB Garamond", serif`, fill: m.kind === 'camp' ? '#6a160e' : '#6a5a48', prio: 2 });
        g.font = `bold ${15 * dp}px Cinzel, Georgia, serif`;
      }
    }
    if (this.questTarget) {
      const [QX, QY] = toScreen(this.questTarget.x, this.questTarget.z);
      if (this.questTarget.r) {
        g.fillStyle = 'rgba(232, 169, 30, 0.22)';
        g.strokeStyle = 'rgba(160, 100, 10, 0.8)';
        g.lineWidth = 2 * dp;
        g.beginPath();
        g.arc(QX, QY, this.questTarget.r * S * zoom, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
      g.fillStyle = '#c8901e';
      g.strokeStyle = '#2a1a08';
      g.lineWidth = 2 * dp;
      const q = 8 * dp;
      g.beginPath(); g.moveTo(QX, QY - q); g.lineTo(QX + q * 0.7, QY); g.lineTo(QX, QY + q); g.lineTo(QX - q * 0.7, QY); g.closePath();
      g.fill(); g.stroke();
      labels.push({ text: this.questTarget.title, x: QX, y: QY - q - 4 * dp, font: `600 ${14 * dp}px "EB Garamond", serif`, fill: '#2a1a08', halo: 'rgba(242, 230, 204, 0.9)', prio: 0 });
    }
    const placed: number[][] = [];
    for (const l of labels.sort((a, b) => a.prio - b.prio)) {
      g.font = l.font;
      const w = g.measureText(l.text).width, h = parseFloat(/([\d.]+)px/.exec(l.font)?.[1] ?? '') || 13 * dp;
      const box = [l.x - w / 2 - 2 * dp, l.y - h, l.x + w / 2 + 2 * dp, l.y + 3 * dp];
      if (placed.some((p) => box[0] < p[2] && p[0] < box[2] && box[1] < p[3] && p[1] < box[3])) continue;
      placed.push(box);
      if (l.halo) {
        g.lineWidth = 3 * dp;
        g.strokeStyle = l.halo;
        g.strokeText(l.text, l.x, l.y);
      }
      g.fillStyle = l.fill;
      g.fillText(l.text, l.x, l.y);
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

// Het Schilderij: the view as a small Flemish cabinet painting, with varnish,
// craquelure, a dark ripple-moulded frame and a brass plate. Something to
// keep or pass on: the game's look is its best advertisement.

import { rng } from '../core/math';

/** Paint the current frame of `source` (the game canvas, just rendered) into a framed picture. */
export async function paintPicture(source: HTMLCanvasElement, title: string, plate: string): Promise<Blob | null> {
  const W = 1600, H = 1060, F = 86; // outer size and frame width
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const r = rng(Math.floor(performance.now()));

  // --- the frame: ebony ripple moulding, a gilt slip next to the picture
  g.fillStyle = '#120c08';
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < F; i++) {
    const t = i / F;
    const ripple = Math.sin(t * Math.PI * 9) * 0.5 + 0.5;
    const v = Math.round(14 + ripple * 34 + (1 - Math.abs(t - 0.5) * 2) * 14);
    g.strokeStyle = `rgb(${v + 8},${v},${Math.round(v * 0.8)})`;
    g.strokeRect(i + 0.5, i + 0.5, W - i * 2 - 1, H - i * 2 - 1);
  }
  g.strokeStyle = '#c9a44e';
  g.lineWidth = 5;
  g.strokeRect(F - 3, F - 3, W - F * 2 + 6, H - F * 2 + 6);
  g.strokeStyle = 'rgba(255, 236, 170, 0.5)';
  g.lineWidth = 1;
  g.strokeRect(F - 5, F - 5, W - F * 2 + 10, H - F * 2 + 10);

  // --- the picture: cover-fit, a little richer, as under old varnish
  const pw = W - F * 2, ph = H - F * 2;
  const sa = source.width / source.height, pa = pw / ph;
  const sw = sa > pa ? source.height * pa : source.width, sh = sa > pa ? source.height : source.width / pa;
  g.save();
  g.beginPath();
  g.rect(F, F, pw, ph);
  g.clip();
  g.filter = 'saturate(1.14) contrast(1.07) brightness(0.97)';
  g.drawImage(source, (source.width - sw) / 2, (source.height - sh) / 2, sw, sh, F, F, pw, ph);
  g.filter = 'none';
  // warm varnish
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = 'rgba(226, 196, 130, 0.9)';
  g.globalAlpha = 0.22;
  g.fillRect(F, F, pw, ph);
  g.globalAlpha = 1;
  // darkened edges, as panel paintings have
  const vg = g.createRadialGradient(W / 2, H / 2, ph * 0.35, W / 2, H / 2, pw * 0.72);
  vg.addColorStop(0, 'rgba(255,255,255,1)');
  vg.addColorStop(1, 'rgba(96, 70, 40, 1)');
  g.fillStyle = vg;
  g.fillRect(F, F, pw, ph);
  g.globalCompositeOperation = 'source-over';
  // the weave of the canvas
  g.globalAlpha = 0.05;
  g.strokeStyle = '#000';
  g.lineWidth = 1;
  g.beginPath();
  for (let x = F; x < W - F; x += 3) { g.moveTo(x + 0.5, F); g.lineTo(x + 0.5, H - F); }
  for (let y = F; y < H - F; y += 3) { g.moveTo(F, y + 0.5); g.lineTo(W - F, y + 0.5); }
  g.stroke();
  // craquelure: fine cracks that wander and branch
  g.globalAlpha = 0.13;
  g.strokeStyle = '#1a1208';
  g.lineWidth = 0.7;
  for (let i = 0; i < 150; i++) {
    let x = F + r() * pw, y = F + r() * ph, a = r() * Math.PI * 2;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 6 + r() * 12; k++) {
      a += (r() - 0.5) * 1.3;
      x += Math.cos(a) * (5 + r() * 9);
      y += Math.sin(a) * (5 + r() * 9);
      g.lineTo(x, y);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
  // a sheen across the varnish
  const sheen = g.createLinearGradient(F, F, W - F, H - F);
  sheen.addColorStop(0, 'rgba(255, 244, 214, 0.10)');
  sheen.addColorStop(0.4, 'rgba(255, 244, 214, 0)');
  g.fillStyle = sheen;
  g.fillRect(F, F, pw, ph);
  g.restore();

  // --- the brass plate
  g.font = '600 25px Cinzel, Georgia, serif';
  const tw = Math.min(pw - 120, Math.max(380, g.measureText(title).width + 90));
  const px = (W - tw) / 2, py = H - F + 13, phh = 60;
  const brass = g.createLinearGradient(0, py, 0, py + phh);
  brass.addColorStop(0, '#e2c676');
  brass.addColorStop(0.5, '#b8923c');
  brass.addColorStop(1, '#8a6a22');
  g.fillStyle = brass;
  g.fillRect(px, py, tw, phh);
  g.strokeStyle = 'rgba(40, 26, 6, 0.8)';
  g.lineWidth = 1.5;
  g.strokeRect(px + 3.5, py + 3.5, tw - 7, phh - 7);
  g.fillStyle = '#2a1a06';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(title, W / 2, py + 23, tw - 40);
  g.font = 'italic 17px "EB Garamond", Georgia, serif';
  g.fillText(plate, W / 2, py + 45, tw - 40);
  for (const sx of [px + 12, px + tw - 12]) {
    g.beginPath();
    g.arc(sx, py + phh / 2, 3, 0, Math.PI * 2);
    g.fillStyle = '#5a4212';
    g.fill();
  }
  return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/jpeg', 0.9));
}

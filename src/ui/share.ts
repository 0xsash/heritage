// A result you can pass on: the day's flight (and later, paintings). Text is
// spoiler-free and short, in the manner of the daily puzzle games: what, when,
// how well, and a streak. Copy always works; the share sheet where the
// browser has one.

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export interface ShareResult {
  kicker: string;
  title: string;
  /** big line (a time, a score) */
  big: string;
  lines: string[];
  /** what goes to the clipboard */
  text: string;
  /** an image to go with it, when there is one */
  image?: Blob;
}

/** Where the game lives, if that is a link worth passing on (not a private preview frame). */
export function publicUrl() {
  const h = location.hostname;
  if (!/^https?:$/.test(location.protocol) || h === 'localhost' || /claude|anthropic|usercontent/.test(h)) return '';
  return location.origin + location.pathname;
}

export class ShareCard {
  el = document.createElement('div');
  open = false;
  onClose: () => void = () => {};
  private res: ShareResult | null = null;

  constructor(root: HTMLElement) {
    this.el.className = 'leeskaart sharecard';
    this.el.hidden = true;
    root.appendChild(this.el);
    window.addEventListener('keydown', (e) => {
      if (this.open && (e.code === 'Escape' || e.code === 'Enter')) {
        e.preventDefault();
        this.close();
      }
    });
    this.el.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t === this.el || t.dataset.act === 'close') this.close();
      else if (t.dataset.act === 'copy') void this.copy(t);
      else if (t.dataset.act === 'share') void this.share();
      else if (t.dataset.act === 'save') this.saveImage();
    });
  }

  show(res: ShareResult) {
    this.res = res;
    this.open = true;
    document.exitPointerLock?.();
    const canShare = typeof navigator.share === 'function';
    const img = res.image ? `<img class="sc-img" src="${URL.createObjectURL(res.image)}" alt="">` : '';
    this.el.innerHTML = `<div class="lk-in">
      <div class="lk-kick">${esc(res.kicker)}</div>
      <h2>${esc(res.title)}</h2>
      <div class="lk-rule"></div>
      ${img}
      ${res.big ? `<div class="sc-big">${esc(res.big)}</div>` : ''}
      ${res.lines.map((l) => `<div class="sc-line">${esc(l)}</div>`).join('')}
      <pre class="sc-text">${esc(res.text)}</pre>
      <div class="sc-acts">
        <button data-act="copy">KOPIEER</button>
        ${canShare ? '<button data-act="share">DEEL</button>' : ''}
        ${res.image ? '<button data-act="save">BEWAAR</button>' : ''}
        <button data-act="close">VERDER</button>
      </div>
    </div>`;
    this.el.hidden = false;
    this.el.classList.remove('in');
    void this.el.offsetWidth;
    this.el.classList.add('in');
  }

  close() {
    if (!this.open) return;
    this.open = false;
    this.el.hidden = true;
    this.onClose();
  }

  private async copy(btn: HTMLElement) {
    if (!this.res) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(this.res.text);
      ok = true;
    } catch {
      // no clipboard here (an embedded frame): select the text so Ctrl+C works
      const pre = this.el.querySelector('.sc-text');
      if (pre) {
        const r = document.createRange();
        r.selectNodeContents(pre);
        const sel = getSelection();
        sel?.removeAllRanges();
        sel?.addRange(r);
        ok = document.execCommand?.('copy') ?? false;
      }
    }
    btn.textContent = ok ? 'GEKOPIEERD' : 'DRUK CTRL+C';
  }

  private async share() {
    if (!this.res) return;
    try {
      const files = this.res.image ? [new File([this.res.image], 'belfort.jpg', { type: this.res.image.type })] : undefined;
      if (files && navigator.canShare?.({ files })) await navigator.share({ text: this.res.text, files });
      else await navigator.share({ text: this.res.text });
    } catch {
      /* dismissed */
    }
  }

  private saveImage() {
    if (!this.res?.image) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(this.res.image);
    a.download = 'belfort-schilderij.jpg';
    a.click();
  }
}

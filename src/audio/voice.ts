// Spoken lines. Every line of dialogue and narration has an id; when a
// recording for it exists (public/voice/<id>.mp3, listed in
// public/voice/manifest.json) it is played, and the text stays on screen as
// its subtitle. With no recordings the game is simply silent-with-subtitles.
// tools/voice/export-lines.mjs writes the full script for a voice actor or a
// speech service.

import { asset } from '../core/assets';

export class Voice {
  private have = new Set<string>();
  private cur: HTMLAudioElement | null = null;
  volume = 1;

  async load() {
    try {
      const res = await fetch(asset('voice/manifest.json'));
      if (!res.ok) return;
      const list = (await res.json()) as string[];
      for (const id of list) this.have.add(id);
    } catch {
      /* no recordings yet */
    }
  }

  get count() {
    return this.have.size;
  }

  has(id: string) {
    return this.have.has(id);
  }

  /** Play a line; resolves when it has been spoken (at once when there is no recording). */
  play(id: string): Promise<void> {
    this.stop();
    if (!this.have.has(id)) return Promise.resolve();
    return new Promise((resolve) => {
      const a = new Audio(asset(`voice/${id}.mp3`));
      a.volume = this.volume;
      this.cur = a;
      a.onended = a.onerror = () => resolve();
      a.play().catch(() => resolve());
    });
  }

  stop() {
    if (this.cur) {
      this.cur.pause();
      this.cur = null;
    }
  }

  /** Seconds a subtitle should stay up when nobody speaks it. */
  static readTime(text: string) {
    return Math.max(2.2, 1.1 + text.length * 0.058);
  }
}

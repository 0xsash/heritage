// The whole spoken script of the story films, by line id: [speaker, text].
// A recording for any of these ids (public/voice/<id>.mp3, listed in
// public/voice/manifest.json) is played by src/audio/voice.ts in place of the
// silent subtitle timing; nothing else needs to change.

import { INTRO_LINES } from './intro';
import { PROLOGUE_LINES } from './prologue';

export const STORY_LINES: Record<string, [string, string]> = { ...INTRO_LINES, ...PROLOGUE_LINES };

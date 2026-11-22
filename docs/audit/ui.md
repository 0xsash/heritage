# Interface audit

Build of this worktree, `vite preview` on port 4196, Chromium with SwiftShader, driven through `window.belfort`
(about 1 frame per second, so the game was steered by script, not played). Gamepad tests use a fake standard pad
(Gamepad API stub, each press held ~1.8 s). In a real browser Escape releases the mouse instead of reaching the
page; the scripts did the same (`exitPointerLock`) where the mouse was captured.

Screenshots: `/tmp/claude-0/-home-user-heritage/fbffb122-b5ad-5a04-9543-7e04a3e8c2ba/scratchpad/uiaudit/shots/`
(below: file name only, `-1280` / `-1024` / `-844` is the viewport width). Scripts and logs are one level up
(`t_front.cjs`, `t_game*.cjs`, `t_film.cjs`, `*.log`). The scratchpad is temporary: re-run the scripts to regenerate.

Counts: 1 blocker, 5 major, 12 minor, 5 polish. Every blocker and major was reproduced twice (two runs or two screens).

**Fix pass (worktree agent-a6f2b54857f092ce6):** all 23 findings addressed; #21 partly (see its status). Each finding
below carries a **Status** line. Re-test scripts and logs: `scratchpad/uifix/` (`t_fx_front.cjs`, `t_fx_pad.cjs`,
`t_fx_padrun.cjs`, `t_fx_film.cjs`, plus the old `t_main2`, `t_settings`, `t_old`, `smoke`); before/after shots in
`scratchpad/uifix/shots/before` and `shots/after`.

## Findings, ranked

### 1. BLOCKER: a gamepad cannot operate the dialogue box or any panel
- **Status (fix pass):** FIXED. One navigation for every screen, `src/ui/nav.ts` (the pause menu's pad reading and key map moved there; the menu, the chapter card, the front end, the dialogue, the book, the shop, the reading card, the share card and the map all use it). D-pad / left stick (or arrows, WASD, Tab) move the focus by where controls lie on screen, A / Enter / Space press, B / Escape close or step back, LB / RB turn the book's page (and the creation tabs, and zoom the map). The screen on top owns its keys and buttons; `Input.ui` keeps the pad and the movement keys out of the game behind it. Each box says how to go on and leave, for the device in use (`A · verder`, `B weggaan`). D-pad right now opens Personage. Re-test (`uifix/t_fx_pad.cjs`, `t_fx_padrun.cjs`): Pieter's conversation advanced with A, choices moved with the d-pad, chosen with A, closed with B; journal → Kroniek → Personage with RB, LB back, B closes; shop by Y, A buys, B closes; reading card closed with A.
- **Screens:** dialogue (every conversation, the board and the dice game are dialogues), shop and character panel,
  Kroniek, reading card.
- **What happens:** Y next to a person opens the dialogue (the prompt even says `Y Spreek met …`). After that A, Y, B,
  d-pad and Start do nothing: no advance, no choice, no way out. The only exits are keyboard keys. The same holds for the
  shop (B does not close it), the reading card (A does not close it) and the character panel and Kroniek, which have no
  pad button at all (only RB toggles the journal). A pad-only player is stuck in the first main-quest conversation.
- **Repro:** connect a pad, walk to Pieter or any merchant, press Y; press A / Y / B / d-pad / Start. Run 1
  (`t_game3.log`): six buttons, dialogue still open, line unchanged. Run 2 (`t_game4.log`): A, Y, B, same result.
  Also `shop pad B` and `leeskaart pad A` in `t_game3.log`.
- **Shot:** `dialogue-1280.png`, `shop-clean-1280.png`, `leeskaart-1280.png`.
- **Where:** `src/ui/rpgui.ts:26-40` (keyboard only), `src/ui/gamehud.ts:341-343`, `src/ui/kroniekui.ts:31-37`,
  `src/core/input.ts:200-210` (no pad action for character/Kroniek/close), `src/main.ts:805-808` (interact is
  swallowed while a panel is open).
- **Fix:** one small pad poller shared by all panels (the pattern already exists in `src/ui/menu.ts:256-296` and
  `src/ui/chapter.ts:62-77`): d-pad/left stick moves a highlighted choice or button, A presses it (or advances a line),
  B closes or steps back, LB/RB switch the book tabs. Show a pad line in the box (`A · verder   B · weggaan`) when
  `input.device === 'pad'`.

### 2. MAJOR: the title, first-visit screen and character creation need a mouse
- **Status (fix pass):** FIXED. The front end is a screen of `nav.ts`: Tab, arrows and the pad move a visible gold focus (`.nav-focus`, plus `:focus-visible`), A / Enter press. `Input` no longer calls `preventDefault` before the game has started (`gameKeys`) and ignores keys typed into a text field. Each front-end page shows a key line for the device in use. Re-test (`t_fx_front.cjs`): Tab moves BEGIN → INSTELLINGEN, pad A on BEGIN opens creation, pad A on VERDER SPELEN starts the game.
- **What happens:** Tab does not move focus (it stays on `<body>`), arrow keys do nothing, the pad's A does nothing.
  A keyboard or pad player cannot choose VERDER SPELEN, NIEUW SPEL, BEGIN or INSTELLINGEN. The front-end buttons have
  no focus style either. The screen itself says "Je speelt met muis en toetsenbord of met een gamepad".
- **Repro:** open `/?dpr=1&lowq` (first visit) and, with a save, `/` (title). Press Tab twice: `document.activeElement`
  is BODY on both screens. Press pad A: nothing (`t_front.log`: `promise pad A -> creation? false`,
  `title pad A -> left title? false`).
- **Shot:** `promise-1280.png`, `title-1280.png`, `promise-focus.png`.
- **Where:** `src/core/input.ts:81` calls `preventDefault()` on Tab and arrows for the whole window, and `Input` is
  created at boot (`src/main.ts:79`), before the front end; `src/ui/creation.ts` has no pad code;
  `src/ui/style.css:261` (`all: unset` on front-end buttons, no `:focus-visible`).
- **Fix:** only swallow Tab/arrows while the game has the mouse or no front end is showing; give the front end the
  menu's navigation (reuse `GameMenu`'s `nav()`/`pollPad()` over `.fe-menu button`, `.cc-*` controls); add
  `:focus-visible` with the same gold outline as `.gm-panel > button.focus` (`style.css:685`).

### 3. MAJOR: Enter on the creation screen starts the game, whatever has focus
- **Status (fix pass):** FIXED. Enter presses the focused control; only in a name field does it mean BEGIN. Creation opens with the focus on the first tab, not on BEGIN. Re-test: Enter on "Man" keeps creation open (sex set to m), Enter on the Haar tab switches the tab, Enter in the name field begins.
- **What happens:** with a button focused (a tab, Man/Vrouw, a swatch), Enter does not press it: it runs BEGIN and the
  game starts with the old choice.
- **Repro:** creation screen, click into it so a control has focus (or focus `.cc-seg button[data-k="f"]`), press
  Enter. Run 1: on "Vrouw", sex stays `m`, front end leaves. Run 2: on the "Haar" tab, front end leaves
  (`t_front.log`).
- **Shot:** `cc-enter-on-button.png`.
- **Where:** `src/ui/creation.ts:587`.
- **Fix:** begin on Enter only when focus is in a name field or on BEGIN; let a focused button take its own Enter.

### 4. MAJOR: no way back from character creation
- **Status (fix pass):** FIXED. TERUG left of BEGIN, Escape and pad B go back to the title (or to the first page on a first visit); the save is untouched until BEGIN. The browser `confirm()` is replaced by an in-game question in the dark panel style ("Wil je een nieuw spel beginnen? Je huidige personage, …, gaat dan verloren." NIEUW SPEL BEGINNEN / TERUG, focus on TERUG, B cancels). Re-test: no browser dialog, B closes the question, TERUG returns to the title with VERDER SPELEN and the old save.
- **What happens:** creation has no TERUG button and ignores Escape. A returning player who clicks NIEUW SPEL (and
  accepts the browser `confirm()`) cannot get back to VERDER SPELEN without reloading the page. The confirm itself is
  the browser's own dialog (browser-language buttons, not reachable by pad, out of style).
- **Repro:** title with a save, NIEUW SPEL, OK; look for a way back; press Escape (`t_front.log`: `cc after Escape
  still there true`). No back control in any of the 15 creation shots.
- **Shot:** `cc-body-1280.png`.
- **Where:** `src/ui/creation.ts:182` (confirm), `:218-262` (no back control), `:585-590` (keys).
- **Fix:** a `TERUG` button left of BEGIN and Escape → `title()` (or `promise(false)` on a first visit); replace
  `confirm()` with an in-style two-button question ("Je huidige personage gaat verloren. NIEUW SPEL / TERUG").

### 5. MAJOR: the map is not treated as a screen
- **Status (fix pass):** FIXED. `mapOpen` is part of `uiOpen()` (the HUD fades under `ui-open`, Start and the pause menu are blocked, the world waits); the map lets go of the mouse like the book; Escape / B / Back close it; opening a book from the map closes the map; J, K, I and M are ignored in the prologue. Legend ends with `M of Esc: sluiten` (pad: `RB / LB: in- en uitzoomen · B: sluiten`). Re-test: M then J → `journal:true, map:false`; M then Escape → map closed, no pause menu; pad Back / RB zoom / B.
- **What happens:** with the map open, J/K/I open a panel on top of it; Escape opens the pause menu over it and after
  VERDER SPELEN the map is still open; the compass and the action bar are drawn over the map; the map says how to zoom
  but not how to close it.
- **Repro:** M, then J → `journal:true, map:true`; J, Escape → pause over the map; VERDER SPELEN → `map:true`.
  Run 1 `t_game1.log`, run 2 `t_game4.log`.
- **Shot:** `map-1280.png`, `map-plus-journal.png`, `map-plus-pause.png`.
- **Where:** `src/main.ts:466` (`uiOpen()` leaves out the map), `:779`, `:616-617`; `src/ui/hud.ts:70`;
  `src/ui/style.css:75`.
- **Fix:** add `mapOpen` to `uiOpen()` (so `ui-open` hides the HUD and books cannot stack), close the map on Escape and
  pad B before the menu sees the key, and end the legend with `· M of Esc: sluiten`.

### 6. MAJOR: the controls card (H) is cut off, and the controls list is incomplete and partly wrong
- **Status (fix pass):** FIXED. The key lists live next to the key maps (`CONTROLS` in `src/core/input.ts`). The H card shows only the keys of the moment (in the air or on foot, 10–11 rows) for the device in use, at the bottom left above the place name; it fits at 1280×720 (y 237–570) and 1024×640 (y 157–490). The pause menu's BESTURING page shows everything, keyboard and gamepad side by side, in two columns; it fits 1024×640 without scrolling (502/502). Corrected: B is the second skill on foot, G, Tab, F, Escape/Start, RB, Back and the d-pad are listed, "hulp verbergen" → "Besturing tonen of verbergen".
- **What happens:** below 1360 px wide the card moves to the top left with `max-height: calc(100% - 250px)`; at
  1280×720 and 1024×640 it ends after "P", so the "T · H" and "Gamepad" rows are hidden, and it cannot be scrolled while
  the mouse is captured. It also covers the discovery card. The list itself has no Escape/Start (pause), Tab, F,
  G (draak te hulp), and nothing of the pad's RB (dagboek), Back (kaart), d-pad (zalf, licht); it says "B dalen" although
  B is the second skill on foot; "T · H … hulp verbergen" while H also shows it. The pause menu's BESTURING page shows
  the same table.
- **Repro:** press H in flight at 1280×720 and at 1024×640 (`t_game1.log`; help rows reported offscreen at 1024 and
  844, visibly cut at 1280).
- **Shot:** `help-1280.png`, `help-1024.png`, `pause-help-1024.png`.
- **Where:** `src/ui/hud.ts:52-66`, `src/ui/style.css:342-344`.
- **Fix:** two short tables (Toetsenbord / Gamepad) generated from the key maps in `input.ts`, shown in the pause menu
  only; the H card shows the five keys of the current situation (flying / on foot) and fits without scrolling.

### 7. MINOR: keys leak to the game behind the dialogue and panels
- **Status (fix pass):** FIXED. T, H and the dawn-time key run only when no screen is open (and not in the prologue); with a screen open `Input.ui` zeroes both sticks, the throttle, WASD and the mouse, and the pad's buttons act only in the screen. Re-test (dialogue open): T → light unchanged, H → card unchanged, right stick → camera yaw change 0.0000.
- **What happens:** T changes the time of day during a conversation (Gouden uur → Maannacht); H toggles the controls
  card hidden behind the panel, so it pops up after closing; the right stick turns the camera behind the dialogue.
- **Repro:** open any dialogue, press T and H, close it. Run 1 `t_game3.log`, run 2 `t_game4.log`
  (`dialogue T/H Gouden uur -> Maannacht help false -> true`); stick: `camera yaw change -0.130`.
- **Shot:** `after-dialogue-escape.png`.
- **Where:** `src/main.ts:773-777` (help and time run without `!uiOpen()`), `:820` (`rig.update` reads the stick).
- **Fix:** gate `help`, `time`, `paint` on `!uiOpen() && !mapOpen`; pass zero look input to the rig while a panel is open.

### 8. MINOR: book panels and the shop have no close control
- **Status (fix pass):** FIXED. Dagboek, Kroniek, Personage and the shop have `SLUITEN Esc` (pad: `SLUITEN B`) at the top right; the button, Escape and B all go through one `closeBook()` that calls `closeUi()` (mouse taken back, `uiClosedAt` set).
- **What happens:** Dagboek, Kroniek, Personage and the shop show no SLUITEN and no "Esc" hint (only the share card has
  SLUITEN). Closing with Escape skips `closeUi()`, so the mouse is not taken back and the click that captures it again is
  also a sword swing or a fire breath (`uiClosedAt` is not set). The last part is from reading the code.
- **Repro:** J / K / I / talk to a merchant: no close button (`t_game2.log`: `close button? []` for all three).
- **Shot:** `journal-1280.png`, `character-1280.png`, `shop-clean-1280.png`.
- **Where:** `src/ui/kroniekui.ts:9-12` (`bookTabs`), `src/ui/rpgui.ts:123`, `src/ui/gamehud.ts:342`, `src/main.ts:1100`.
- **Fix:** a `SLUITEN  Esc` button at the right end of the header (same style as the tabs) for all four; route every
  close (Escape, button, tab key) through one `close()` that calls `closeUi()`.

### 9. MINOR: the books and the map open during the prologue, under the film bars
- **Status (fix pass):** FIXED. `book()` and the map ignore J/K/I/M (and Back / RB / d-pad right) while the prologue or a film runs. Re-test: J, M, K, I in the prologue → nothing opens.
- **What happens:** J/K/I/M work during the prologue. The letterbox bars, the objective and the subtitles are drawn over
  the journal (cine layer z-index 6, panels 5), and the journal advises "Spreek met de mensen van Diest: zoek het gouden !"
  while you are on the riverbank with Neelke.
- **Repro:** `?autostart&prologue&nointro`, wait for the walk, press J; then M.
- **Shot:** `prologue-journal.png`, `prologue-walk-1280.png`.
- **Where:** `src/main.ts:441-452` (`book()`), `:779`; `src/ui/style.css:387`, `:501`.
- **Fix:** ignore journal/kroniek/character/map while `prologue.active` (or raise panels above `.cine` and hide its
  objective and subtitle while a panel is open).

### 10. MINOR: films cannot be skipped or paused with a pad; the skip hint is barely visible
- **Status (fix pass):** FIXED. Films: hold B on the pad, or Escape / Backspace, for 0.8 s (measured on the clock, so slow frames do not stretch it); the hint names the device's key at 70 % opacity. The prologue (which is played, not watched) keeps Escape for the pause menu, and the pause menu now has PROLOOG OVERSLAAN, so a pad skips it with Start, A; Backspace held still skips it. Re-test (`t_fx_film.cjs`): hold B → film ends; hold Escape → film ends, no pause menu; Start → PROLOOG OVERSLAAN → prologue done, main_arrive active.
- **What happens:** holding B, Start or A for 8 s does not skip the faction film; Escape does nothing during a film (no
  pause either). "Backspace ingedrukt houden · overslaan" is grey at 32-38 % opacity on black.
- **Repro:** `?autostart&intro=gilden`, hold each pad button (`t_film.log`: `still playing true` ×3), press Escape.
- **Shot:** `intro-sub0-1280.png`, `intro-escape.png`.
- **Where:** `src/story/cine.ts:449-470`, `src/story/prologue.ts:137-146`, `src/ui/style.css:511`, `:671`.
- **Fix:** hold B (pad) or Escape to skip, same 0.8 s hold; show the hint for the device in use at 70 % opacity.

### 11. MINOR: film subtitles lose contrast over bright water
- **Status (fix pass):** FIXED. Film and prologue subtitles sit on a soft dark backing (`rgba(5,4,3,.45)`, sized to the line).
- **What happens:** subtitles sit on the picture above the bottom bar, white serif with only a shadow; over the bright
  Demer at 1280 they are hard to read.
- **Shot:** `intro-sub0-1280.png`, `intro-sub0-844.png`.
- **Where:** `src/ui/style.css:663` (`.film-sub`), `:505` (`.cine-sub`).
- **Fix:** put the line in the black bar (bottom ≈ 3vh) or give it a soft dark backing (`background: rgba(5,4,3,.45)`,
  padding 4px 12px).

### 12. MINOR: toasts are hard to read and share their place with the Klokkenronde timer
- **Status (fix pass):** FIXED. The toast has a dark plate with a gold edge and sits at `top: 90px`, below the Klokkenronde timer (52px) and above the boss bar (118px).
- **What happens:** the toast is 13 px gold capitals with wide spacing and only a shadow; on a bright sky it is nearly
  invisible. It sits at `top: 58px`, the Klokkenronde timer at `top: 52px`, both centred: the round's own start toast
  ("KLOKKENRONDE · luid de zeven klokken") is pushed at the moment the timer appears (overlap from the CSS geometry; the
  timer is re-hidden every frame, so it was not forced on screen).
- **Shot:** `dv-toast-1280.png`.
- **Where:** `src/ui/style.css:85`, `:427`; `src/main.ts:331`.
- **Fix:** give the toast the same dark plate as `.dv`; move it below the timer (`top: 96px`) or merge the start toast
  into the timer line.

### 13. MINOR: the centre of the screen stacks notices on top of each other
- **Status (fix pass):** FIXED. The banner is at 22 %; while it shows (`banner.active`) the prompt, the tutorial hint, the discovery card and the street note fade (`#ui.banner-up`), below 900 px the tracker too, and the street signs, readables' signs and NPC markers are not drawn (the rings and the guide stay).
- **What happens:** the banner sits on the waypoint ring and under world icons (a shop sign covers "NIEUWE OPDRACHT");
  at 844×390 the banner, the prompt, the tutorial hint and the tracker overlap.
- **Shot:** `notices-1280.png`, `notices-844.png`, `hud-foot-844.png`, `hud-fly-1280.png`.
- **Where:** `src/ui/style.css:178`, `:315`, `:392`, `:140`.
- **Fix:** one notice column: banner at 22 %, prompt and tutorial hint never shown while a banner is up (`banner.active`
  already exists), world signs hidden under the banner like the guide (`guide.hush`).

### 14. MINOR: dying has no screen
- **Status (fix pass):** FIXED. On death the banner queue is cleared and a dark screen with VERSLAGEN comes up at once; at respawn it adds where you woke and what the surgeon charged, then lifts after 2.6 s. No late VERSLAGEN banner any more. Re-test (`t_fx_death.cjs`, two banners queued, then `hurtPlayer(999999)`): VERSLAGEN at once, queue empty; on waking "Je komt bij in Diest. De chirurgijn rekende 1 stuiver aan.", no banner; the dark lifts 2.6 s later.
- **What happens:** at 0 HP the game shows 0/145 and whatever was on screen for 3.4 s, then moves you to a town; the
  VERSLAGEN banner is queued behind other banners, so it can arrive late and out of context (here a level banner stayed up).
- **Repro:** `combat.hurtPlayer(999999, …)` on foot.
- **Shot:** `death-down.png`, `death-banner-1280.png`.
- **Where:** `src/main.ts:1106-1124`, `src/ui/gamehud.ts:245-275`.
- **Fix:** on death clear the banner queue and show VERSLAGEN at once with a dark fade; respawn after it.

### 15. MINOR: map legend unreadable, labels collide
- **Status (fix pass):** FIXED. Legend and credit on a parchment plate in dark ink; labels are placed last, the quest title first, and a label that would overlap an earlier one is skipped; RB/LB (and up/down) zoom on a pad.
- **What happens:** the legend (gold on parchment) and the credit (55 % ink) are near invisible; in town the labels run
  into each other ("MarkMarskraamster", the quest title over icons); no zoom on a pad.
- **Shot:** `map-1280.png`.
- **Where:** `src/ui/style.css:78`, `:88`; `src/ui/hud.ts:280-383`.
- **Fix:** dark legend on a parchment plate; skip a label that hits an earlier one; LB/RB zoom.

### 16. MINOR: shop layout and prices
- **Status (fix pass):** FIXED. In a shop: two columns, your bag and what you wear | the merchant, each as tall as the panel with its own scroll and a fade at the foot while there is more; every price button reads `KOPEN · 4 st.`, `VERKOPEN · 12 st.`, `TERUGKOPEN · 12 st.`. Buy, too poor, sell with the rare-piece question and buyback are unchanged in code.
- **What happens:** the wares column is clipped inside its own scroll box with no sign that more is below
  ("Verf: Wouwgeel" cut), while IN JE ZAK and WAT JE DRAAGT stand half empty; prices read "KOPEN · 4" without a unit,
  the header says "60 stuivers", the board says "· 10 stuivers".
- **Shot:** `shop-clean-1280.png`, `shop-clean-1024.png`.
- **Where:** `src/ui/gamehud.ts:388-406`, `src/ui/style.css:226`.
- **Fix:** in a shop, two columns (your bag | the merchant), the merchant's column full height; a fade at the bottom of
  a scrolled column; `KOPEN · 4 st.` everywhere (or `stuivers(n)`).

### 17. MINOR: front end at 844×390
- **Status (fix pass):** FIXED. `.fe-center` scrolls (`justify-content: safe center`, so BELFORT is never cut at the top); creation's side columns scroll on their own above the name bar.
- **What happens:** first-visit screen: BELFORT cut off at the top, INSTELLINGEN below the screen. Creation: the left
  and right columns run into the name bar (WILLEKEURIG under JE NAAM, the party list hidden).
- **Shot:** `promise-844.png`, `title-844.png`, `cc-face-844.png`, `settings-title-844.png` (settings scrolls; fine).
- **Where:** `src/ui/style.css` front-end block (`.fe-center`, `.cc-left`, `.cc-right`).
- **Fix:** `overflow-y: auto` on `.fe-center`; below 480 px height let `.cc-left`/`.cc-right` scroll above the bar.

### 18. MINOR: pad players are shown mouse and keyboard keys
- **Status (fix pass):** FIXED. Tutorial hints, the action bar, the dialogue, the reading card, the character panel, creation's lore, the level-up and loot banners and the film hints show the pad's buttons when the pad is in use (`PAD_KEY` in gamehud.ts, `hint()` spans switched by `html.dev-pad`). A mouse event without movement no longer takes the device back from the pad.
- **What happens:** tutorial hints show LMB (attack), RMB (skill), J K (book), RMB/R and G (dragon skills) whatever the
  device; the dialogue says "SPATIE / E · VERDER"; the character panel and creation say "Rechtermuis · …".
- **Where:** `src/ui/tutorial.ts:69`, `:71`, `:77-78`, `:83`; `src/ui/rpgui.ts:72`; `src/ui/gamehud.ts:418-420`.
- **Fix:** pass `pad` into every `keys()`; use `keyGlyph()` with a device-aware map for panels.

### 19. POLISH: compass labels collide
- **Status (fix pass):** FIXED. Cardinals and diamonds within the named landmark's width are hidden.
- "Sint-Sulpitiuskerk" is printed under the W and the diamonds (`hud-fly-1280.png`). `src/ui/hud.ts:175-195`: hide
  cardinals and other marks within the label's width.

### 20. POLISH: HUD shows around open panels
- **Status (fix pass):** FIXED. Under `ui-open` the compass, location line, action bar, buffs and tutorial hint fade to 0.
- The compass shows above the book panels and the shop, the location line under their bottom-left corner, the action
  bar through the dialogue box (`character-1280.png`, `dialogue-1280.png`). `src/ui/style.css:135`, `:255`: under
  `ui-open` fade `.compass`, `.loc`, `.pframe` to 0.

### 21. POLISH: creation text clipped
- **Status (fix pass):** MOSTLY FIXED. The left column is 20 px wider, stepper values wrap onto two lines, the label column is wider, the tabs are centred. The face camera now frames the face in the part of the view the lore box leaves free (`preview.ts`). Not re-shot on the Gezicht tab with the full kit at 1024.
- Stepper values cut ("Lang, met …", "Zoals geschilderd" at 1024); HOOFDDEKSEL touches its stepper; the five tabs are
  unevenly spaced; on the Gezicht tab the lore box covers the chin (`cc-hair-1024.png`, `cc-face-1024.png`).
  `src/ui/style.css:546-593`: let the stepper value wrap to two lines or widen the control column by 20 px.

### 22. POLISH: wording (voice.md rule 1 and 5)
- **Status (fix pass):** FIXED. "het prikbord" → "het aanplakbord", "klokkenronde" → "Klokkenronde" (chapter card); reading card "E verder" → "E sluiten" (pad: "A sluiten"); "Camera op en neer omkeren"; "Sfeergeluid in filmpjes"; "Besturing tonen of verbergen"; creation says "Levenskracht", the salve text "de helft van je levenskracht"; the character panel explains Resonantie in one line.
- "het prikbord" on the chapter card; the game everywhere else says "aanplakbord" (`src/content/diest_end.ts:51`), and
  writes "klokkenronde" there with a small k.
- Reading card: "E verder" closes the card → "E · sluiten" (`src/ui/kroniekui.ts:66`).
- Settings: "Op en neer omkeren" → "Camera op en neer omkeren"; "Achtergrond in filmpjes" does not say it is a volume →
  "Sfeergeluid in filmpjes" (`src/ui/menu.ts:37`, `:150`).
- Controls card: "hulp verbergen" → "besturing tonen of verbergen" (`src/ui/hud.ts:64`).
- One word for hit points: creation "Leven", panel "Levenskracht", salve "de helft van je leven"
  (`src/ui/creation.ts:559`, `src/ui/gamehud.ts:413`, `src/content/diest_life.ts:214`).
- "Resonantie" under the HP bar is never explained on screen (`src/main.ts:1005`): add one line to the character panel.

### 23. POLISH: Kroniek list is mostly dots
- **Status (fix pass):** FIXED. The Kroniek lists the known pages, then one line "Nog N bladzijden te vinden" that opens the hidden pages and their hints.
- 80 of 84 entries are "· · ·" rows (`kroniek-1280.png`). `src/ui/kroniekui.ts:94-96`: list the known entries, then
  one line "Nog 27 bladzijden te vinden" that opens the hints.

## Consistency: rules for the polish pass

1. **One button.** Display font, 13 px, letter-spacing 0.16em, gold text, 1 px border `rgba(214,173,87,.55)`,
   padding 6px 14px, hover and `:focus-visible` = `rgba(214,173,87,.18)` fill plus the 2 px outline of
   `.gm-panel > button.focus`. Two sizes only: this one, and the large menu button (`.gm-panel > button`, 15 px,
   10px 18px). Today there are eight variants (`style.css:104, 129, 251, 268, 422, 467, 546, 682`).
2. **One panel frame.** Dark gradient, 1 px border at .5, the same header row (tabs or title left, purse right,
   SLUITEN Esc far right). The light parchment card stays for things you *read* (reading card, share card, chapter
   card); everything you *operate* uses the dark frame.
3. **Every screen says how to leave,** in the same words and place: `SLUITEN · Esc` / `B` at the top right, `TERUG`
   for a step back in a menu. Escape and pad B always close the topmost screen and nothing else.
4. **One spacing and type scale.** Font sizes 12 / 13 / 15 / 17 / 20 / 26 (today 20 sizes, down to 9.5 px). Spacing
   4 / 8 / 12 / 16 / 24. Border alphas .25 / .5 only (today ten values). Put them in `:root` next to `--gold`.
5. **Money is always `stuivers(n)`** (or `n st.` on buttons), never a bare number.
6. **Keys are shown for the device in use,** through `keyGlyph()`, in hints, prompts, panels and the controls page.
7. **Same thing, same word:** aanplakbord, Klokkenronde, levenskracht, Dagboek (not "journal"/"quest log" anywhere
   the player sees), Personage. Buttons say what happens (rule 5): KOPEN, VERKOPEN, DRAGEN, TERUGKOPEN, SLUITEN, TERUG.
8. **While a screen is open the HUD steps back:** compass, location, action bar and tracker fade under `ui-open`;
   no game key except the screen's own reaches the game.
9. **The style sheet is appended in sections with later overrides** (`.prompt`, `.tracker`, `.slot .k` defined two or
   three times). Fold each into one rule when touching it.

**Status of the rules (fix pass):**
1. Partly: the new and reworked controls (SLUITEN, VERDER, TERUG, the front-end question, the dialogue foot) use the one
   button; hover and keyboard/pad focus share the gold outline everywhere (`.nav-focus`, `:focus-visible`). The older
   variants (share card, shop card buttons at 11.5 px so the gear cards fit) were left as they are.
2. Partly: every panel has the same header row with SLUITEN far right; the frames themselves were not merged.
3. Done: SLUITEN · Esc / B top right on the book and the shop, TERUG in menus and creation, Escape and B close the
   topmost screen only (one manager decides which screen is on top).
4. Partly: the scale is in `:root` (`--fs-*`, `--sp-*`, `--line-soft`, `--line`, `--focus`) and the new rules use it;
   old rules were not migrated.
5. Done for buttons (`n st.`); headers use `stuivers(n)`.
6. Done: hints, prompts, panels, the action bar and the controls page show the device in use.
7. Done for the words named here.
8. Done (compass, location, action bar, tracker, buffs, hint fade under `ui-open`; no game key leaks).
9. Done for `.prompt`, `.tracker` and `.slot .k` (each one rule now).

## What was tested

M = mouse, K = keyboard, P = gamepad (fake). Sizes 1280×720 / 1024×640 / 844×390. "✓" = shot and checked for
overflow/overlap; "–" = not shot at that size.

| Screen | Open / close by | 1280 | 1024 | 844 | Notes |
|---|---|---|---|---|---|
| First-visit screen | M, K (Tab), P (A) | ✓ | ✓ | ✓ | #2, #17 |
| Title | M, K, P | ✓ | ✓ | ✓ | #2, #4 |
| Settings (title and pause) | M, K, P (B) | ✓ | ✓ | ✓ | works by all three; panel scrolls at 844 |
| Creation, 5 tabs | M, K (Enter, Escape) | ✓ | ✓ | ✓ | #3, #4, #21; 15 shots |
| Intro film subtitles | K (Escape), P (hold B/Start/A) | ✓ | ✓ | ✓ | #10, #11 |
| Prologue cards and subtitles | K (J, M) | ✓ | ✓ | ✓ | #9 |
| HUD in flight | – | ✓ | ✓ | ✓ | #12, #13, #19 |
| HUD on foot, tracker, waypoint | – | ✓ | ✓ | ✓ | tracker updated at once after taking a board job |
| Controls help (H, pause page) | K, M | ✓ | ✓ | ✓ | #6 |
| Pause menu | K (Escape), M | ✓ | ✓ | ✓ | settings/pad already covered by `decide/t_settings.cjs` |
| Map | K (M, J, Escape) | ✓ | ✓ | ✓ | #5, #15 |
| Dialogue | K (E, 1-9, Escape, W/T/H/M/J), P (6 buttons, stick) | ✓ | ✓ | ✓ | #1, #7 |
| Journal | K (J, Escape, W), M (tabs), P (RB, B) | ✓ | ✓ | ✓ | #8; RB toggles it |
| Kroniek | K (K, Escape), M (tabs) | ✓ | ✓ | ✓ | #23 |
| Reading card | K (E), P (A) | ✓ | ✓ | – | #1 |
| Character / standing | K (I, Escape, W), M (tabs) | ✓ | ✓ | ✓ | #8, #20 |
| Shop: buy, too poor, sell, rare confirm, buyback | M, K (Escape), P (B) | ✓ | ✓ | ✓ | purse in header and HUD updated at once after every buy/sell/buyback; rare piece asks once; buyback holds only the last sale (by design) |
| Notice board, take a job | M/K | ✓ | ✓ | – | job appears in tracker and journal at once |
| Dice game | M/K | ✓ | ✓ | – | purse updated (54 → 53) |
| Tutorial hint | – | ✓ | ✓ | ✓ | #18 |
| Toasts, banners, discovery cards | – | ✓ | ✓ | ✓ | #12, #13 |
| Death | – | ✓ | ✓ | – | #14 |
| Chapter-end card | K (arrows, PageDown), P (A) | ✓ | ✓ | ✓ | fits at 1280/1024; scrolls at 844 (arrows do not scroll it; Enter closes it) |

Not covered: the share card and Het Schilderij (P) were read in code only; touch input; panels after a reload
(a reload rebuilds every panel from the save, so no stale state can survive; within a session no stale numbers were
found). Test artefacts left out of the findings: panels opened by script on top of each other, the pause menu that
appears when a scripted talk opens and closes in one frame, and the HOOG/LAAG reload warning caused by `?lowq`.

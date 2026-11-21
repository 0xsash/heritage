# Belfort: independent review (November 2026)

A cold pass through the game as a new player would meet it (title, creation, prologue, first flight, Diest,
town life, a fight, flying, the panels, death, the daily round, painting), then fixes. Ranked by how much each
problem hurts someone who clicked a link out of curiosity. Every "fixed" item was checked with a screenshot or a
scripted run that uses the game's own code (scripts and shots in the session scratchpad, `review/`).

Status: **fixed** · **partly fixed** · **not fixed** (with the reason) · **proposal** (needs the owner).

## Ranked findings

1. **The hero had no mantle at all, and the colour you picked did nothing.** The kit's hero outfits leave the
   mantle out on purpose ("the game adds it"); the game never did. The hero's signature piece and the whole
   "Mantel" row in creation were dead. **Fixed** (`src/rpg/look.ts`): the mantle is added and takes the chosen
   colour, live in creation and in the game; old saves get it too.

2. **The prologue's key moment happened out of sight.** The water took Neelke the moment she reached the bank,
   wherever you were; players who had walked home (as told) were 100 m away and saw a light column, not the
   Kludde. Then the Kludde "caught" you after 9 seconds even from far off, and the hero stayed standing while
   "down". **Fixed** (`src/story/prologue.ts`): she waits at the water, counting, until you are within 26 m
   (60 s fallback); you are thrown to the ground (death clip) and get up when the dragon has come.

3. **After the prologue the dragon just hung there.** On mounting, its cruising speed was 0 and the only hint
   was "steer"; the W/S hint only came after the first landing. A newcomer hovered at tree height in a wood with
   no idea how to go on. **Fixed** (`src/main.ts`, `src/ui/tutorial.ts`): at dawn (screen dark) the rider is
   lifted over the trees and turned to face Diest and the first ring; the dragon flies on at a gentle cruise; the
   W/S hint also shows whenever the dragon is hovering. The dawn view from there is the best shot in the game.

4. **The "lights on the water" were pale squares.** Sprites without a texture draw as hard squares: every
   will-o'-the-wisp and every hound's eye (the Kludde's included) in the game. **Fixed**
   (`src/combat/enemies.ts`): a soft round glow; the prologue's wisps also sit on the water and light it.

5. **A big yellow light column stood on Neelke** during the night scene. **Fixed**: the prologue keeps only
   the small on-screen mark (`pillar: false` on the guide target).

6. **The Grote Markt was nearly empty**: five stalls and a board on a huge square. **Fixed**
   (`src/life/life.ts`, `src/life/props.ts`): market day. Eight more stalls (fish, cheese, vegetables, pots,
   poultry, cloth, bread, herbs) with goods, a seller behind each, and barrels, crates, sacks or a handcart
   beside them. Sellers call out as you pass (one line, now and then, never over each other). They do not trade:
   the merchants you can deal with still carry their trade sign.

7. **The "something within 40 m" filler.** Worth having (signs and doors have good lines, shrines give a
   blessing), but the 134 shrines were bare boxes and the street icons were drawn in the same gold as a quest
   giver's "!": at 20–30 m a gold door arch reads as "!". **Fixed**: a proper little chapel (pitched roof,
   iron cross, blue niche, Our Lady, candle, flowers); icons in ivory, a little larger. **Not changed:** the
   number of spots (289) and the 46 wells; fewer wells would be more believable, but they count for the density.

8. **The daily round's medals were free, and some days could not be flown.** Flown with the real flight model
   (an autopilot aiming at the next ring): holding W alone beat the gold time by 15–25 % on every day tried; on
   1 December 2026 the first bell was 50 m behind the start ring, a hairpin the dragon could not make at speed.
   **Fixed** (`src/world/rings.ts`): no bell within 150 m of the start; gold now needs boosting on the
   straights, silver a clean line, bronze getting round (from the measured speeds); the per-bell "on time" pace
   matches silver. The first-flight rings are fine (16 s, reachable from the bank and from the skip spawn).

9. **"What is there to do" pointers hid the main quest** for 2.5 minutes (10 for Scherpenheuvel). **Fixed**:
   with a quest tracked, the pillar returns to it after 45 s; the map keeps the pin until it runs out.

10. **Creation: cut-off text.** Four faction taglines and one origin perk ended in "…". **Fixed**: they wrap
    onto a second line. Checked the rest of the suspicion: `hair_braid` (Vlecht) and `hair_tail` (Staart) are
    offered; the mantle now updates live; body labels read well (Gemiddeld / Slank / Fors); `beiaardier` maps to
    the bell-ringer origin (`klokkenluider`); `rider.glb` is not downloaded when the kit covers the hero
    (verified in creation, in a new game and on a loaded save).

11. **The hero's hair looks painted on.** Partly true. Men's long hair reads as hair; the women's bun has a high,
    hard hairline that does look like a cap. **Partly fixed**: a woman whose class wears no hat now wears a linen
    coif (the creation text already says women wore their hair "onder een muts"); "Hoed: Af" takes it off.
    **Proposal**: a hair pass in the kit (a softer, lower hairline and some loose strands with alpha).

12. **The hero looked barefoot.** The kit's boots are a light tan that reads as skin at play distance (seen from
    behind in almost every shot). **Fixed** for the hero (creation and game): the boots are darkened to worn brown.
    The crowd's boots are unchanged.

13. **Women wear the men's cut.** True: doublet, breeches and buff coat on a woman's body; the schutter's buff
    coat flares like a short skirt. **Proposal** (a kit rebuild): a women's cut of the three outfits.

14. **Riding pose and mantle in the saddle.** True: in flight the mantle stood straight up behind the rider like
    a red board. The cause was not only the stand-in tuning: the game added a full wind swing on top of
    `ride_idle`'s own cloak pose. **Fixed** at run time (`src/player/hero.ts`): in the saddle the wind adds a
    little; the mantle now streams back over the dragon. **Proposal**: retune `anim.RIDE_CLOAK` on the real
    dragon at the next kit build (the side view is mostly hidden by the wings, so it matters less).

15. **Street walkers' names.** An earlier audit shows "Willem, oude vrouw"; "Marten" was in the women's names.
    **Fixed**: the role decides whether a name is a man's or a woman's; Marten replaced by Janneke. Identity is
    otherwise stable (name and look belong to the figure); the same figure does reappear elsewhere as the crowd
    is recycled, which is the crowd technique, not a bug.

16. **Notice-board jobs could change under you** when templates change (a job is rebuilt from its id).
    **Fixed** for jobs taken from now on: the template, client and camp/sender/spot are kept in the save
    (`job_…_pin`) and used when rebuilding. Jobs already taken in old saves keep the old behaviour.

17. **`wouter_r_lie` overflow.** Not the line: the hidden glossary explanation of "drossaard" was measured. It
    was real in a small way: near the right edge the explanation stuck out of the box. **Fixed**: the
    explanation exists only while hovered, and moves inwards near the screen edge.

18. **Boost shook the camera every 1.4 s while held.** **Fixed**: the kick comes when the boost starts.
    Boost itself is still unlimited while Shift is held; **proposal**: decide whether it should cost something.

19. **Furrows on the fields** were so strong they read as corrugated iron at walking height. **Fixed**
    (`src/world/ground.ts`): softer rows.

20. **Downloads.** 7.4 MB kit + 5.2 MB dragon + 6 MB textures + sky; `rider.glb` (4 MB) is not fetched. The
    dragon was only requested after the town was built. **Fixed**: it now downloads while you make your character.
    **Proposal**: meshopt/Draco compression of `townsfolk.glb` and `dragon.glb` (the loader already supports
    meshopt) and KTX2 textures would roughly halve the download.

21. **Pressing E during the dawn titles landed the dragon** and broke the moment. **Fixed**.

22. **The dawn title card** was never seen end to end: it works (BELFORT over the dawn meadows, Diest on the
    skyline), but its subtitle was dim grey on a bright sky and could not be read. **Fixed**: light ink on a
    dark halo.

23. **Wayside shrines on posts faced any way**, often showing their back to the path. **Fixed**: the niche
    looks along the street.

24. **A stale line in `docs/design/gameplay.md`** (§11) still says the game uses the 17th-century "gij"; the
    voice guide and the game use "je/jij". **Not fixed** (no document edits beyond this one were in scope).

## Checked and fine

- Title, "what this is" screen and the epigraph and place cards read well; the prologue text is strong.
- No page or console errors in a full new game (title → creation → prologue → dawn → first flight) or when
  loading an existing save ("Verder spelen", "Vorige keer" banner, quest state intact).
- Death and respawn: you wake in the nearest town and pay the surgeon 10 %.
- The daily round's share card and Het Schilderij (P) work; the share text is right. (The painting crashed the
  test browser twice while other test browsers ran beside it, a memory limit of the test machine; alone it works.)
- Combat reads: enemies glow red on the wind-up, hit-stop and shake are there.
- The text-fit audits (title, creation, HUD, panels, shops, board, notary, map, 100 conversation lines, 83
  Kroniek cards, 29 discovery cards) at 1024×640, 1280×720 and 1400×800 show nothing new; the four clipped
  creation subtitles and `wouter_r_lie` are gone. (At 1024×640 the wrapped subtitles first pushed the right
  column 26 px too long; the list is a little tighter at low heights now.) What remains is old: list items
  scrolled out of view in shops, and the pulsing waypoint arrow measured wider than its box.

## Not verified

- Talking to Pieter by script did not open in the shot (the pose landed outside talking range); his lines are
  covered by the conversation audit, not by a screenshot.
- The child's race, the soldier's camp marker, weathercocks and dice were only exercised by script, as before.
- Software rendering runs at about one frame per second, so nothing here was played by hand in real time;
  timings (rings, prologue) were checked by stepping the game's own update code.

## Proposals for the owner

1. A kit pass on hair (softer hairline, a few loose strands) and on the riding mantle (`RIDE_CLOAK`).
2. A women's cut of the three hero outfits.
3. Boost: free and unlimited, or a stamina cost?
4. Compressed models and textures for the hosted page.

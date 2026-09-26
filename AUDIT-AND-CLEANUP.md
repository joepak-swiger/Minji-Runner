# Minji Runner archive audit

## Bottom line

**Do not restart the concept from zero.** The project had a good game buried under too many forks.

`Minji Runner2.0` was the strongest preserved gameplay branch. The later React/modular folders looked newer, but several were ports, regressions, or unfinished refactors. Gold therefore uses a **hybrid salvage/rebuild**: preserve the working mechanics and intended rules, migrate useful newer art, and put them into one clean canonical codebase.

## Folder-by-folder verdict

| Uploaded archive | What it really is | Verdict |
| --- | --- | --- |
| `Minji Runner Assets.zip` | Small source-art archive with unique GIF/Piskel/source material for Minji, Joe variants, llama, Miloctopus, etc. | **KEEP as ART SOURCE ARCHIVE.** Do not use it as the active game folder. |
| `Minji Runner.zip` | Original older plain-JS runner. About 12 files / 12.35 MB. Its useful ideas are superseded by 2.0. | **DELETE after Gold is safely backed up.** |
| `Minji Runner2.0.zip` | The most complete legacy game: weighted stages, four enemy behaviors, platforms/cloud riders, score, collision, start/pause/restart/game over, difficulty ramp, and correct first-real-spawn banner semantics. | **KEEP one archived copy as LEGACY REFERENCE.** Do not keep developing it. |
| `Minji-Runner React 2.zip` | Empty archive: directory only, zero actual files. | **DELETE NOW.** Pure dead space. |
| `minji-runner-react.zip` | Large React/Vite port containing bundled `node_modules`; roughly 3,575 files / 72.26 MB. It carries some 2.0 concepts but also source inconsistencies/regressions. | **DELETE after Gold backup.** |
| `minji-runner-react (2).zip` | Near-duplicate React/Vite port, again roughly 3,575 files / 72.26 MB, mostly duplication and bundled dependency weight. Slightly different port experiment, not a better canonical game. | **DELETE after Gold backup.** |
| `minji-runner-20260206T010330Z-1-001.zip` | Cleaner-looking React engine refactor, but gameplay is unfinished: placeholder enemy updates, intentionally empty spawner, and missing parts of the complete game loop. | **DELETE after Gold backup.** Architectural ideas worth keeping have been incorporated conceptually. |
| `minji-runner.zip` | Newest-looking React modular branch and source of useful newer art, but still incomplete and internally inconsistent. Spawner/enemies are unfinished and some physics/config APIs no longer match. | **DELETE after Gold backup.** Useful art was migrated to Gold. |
| `Minji-Runner-Gold-v0.7` | Current consolidated canonical project with geometry fixes, layered audio, categorized food effects, two-thumb controls, Expo Go, and landscape-first mobile play. | **KEEP + DEVELOP THIS ONE.** |

## Why “newest” was not “best”

The February modular branch looked more professional because it had folders such as `game/engine` and per-enemy modules. But several enemy `update()` methods were still placeholders and its spawner intentionally did nothing. It also had API mismatches in player update/ground/config behavior. That makes it an unfinished refactor, not the version with the most working game.

By contrast, the August 2025 `Minji Runner2.0` branch already contained the important design behavior: weighted stage pools, distinct enemy logic, platform/cloud spawning, progression, scoring, collisions, difficulty scaling, game states, and first-spawn banners.

## Dependency bloat found

Several React archives bundled the entire `node_modules` directory. For example:

- `minji-runner-react.zip`: ~3,575 total files, but only ~38 files outside `node_modules`.
- `minji-runner-react (2).zip`: ~3,575 total files, but only ~38 files outside `node_modules`.
- `minji-runner.zip`: ~2,387 total files, but only ~125 files outside `node_modules`.
- `minji-runner-20260206T010330Z-1-001.zip`: ~2,336 total files, but only ~119 files outside `node_modules`.

Dependencies should be reproducible, not treated as source code. The browser build still does not bundle dependencies or require a framework to run. The optional Expo Go shell has its own reproducible `package.json`; its `node_modules` is intentionally excluded from the ZIP.

## What Gold preserves or improves

- Modular enemy system, one enemy class per file
- Weighted stage system
- Stage progression
- First-real-spawn-only introduction banners
- Four legacy enemy archetypes
- Moving platforms and cloud riders
- Start / pause / resume / restart / game-over flow
- Keyboard plus touch controls
- Scoring and survival timer
- Best score/time persisted locally
- Progressive speed and spawn pressure
- Newer player/enemy art migrated into a consistent assets folder
- Player movement upgraded with acceleration, jump buffering, coyote time, variable jump height, and fast fall
- No React dependency and no bundled `node_modules`
- One `PLAY_MINJI_RUNNER.bat` launcher for browser play
- One `PLAY_MINJI_RUNNER_MOBILE.bat` launcher for Expo Go practice
- Responsive ground/platform corrections from Gold v0.2
- Randomized 25-icon food collectibles from Gold v0.3, expanded into four effect categories in Gold v0.5

## Cleanup procedure I recommend

First copy `Minji-Runner-Gold-v0.7.zip`, `Minji Runner2.0.zip`, and `Minji Runner Assets.zip` to one safe backup location. Open Gold on your PC and play a few runs. Once you are comfortable that it launches and the recovered mechanics are there, permanently delete the other five nonempty experimental game archives plus the empty `Minji-Runner React 2.zip`.

Your clean long-term layout can then be as simple as:

```text
Minji Runner/
├─ ACTIVE/
│  └─ Minji-Runner-Gold/          <- the only folder you edit
├─ ARCHIVE/
│  └─ Minji Runner2.0.zip         <- legacy gameplay reference
└─ ART-SOURCE/
   └─ Minji Runner Assets.zip     <- original editable/source art
```

From this point forward, version **backups**, not competing working folders. For example, keep one active folder and make milestone zips such as `Minji-Runner-Gold-v0.7-backup.zip` when a milestone is stable.

---

## Gold v0.4 audio milestone

Gold v0.4 preserves the consolidated v0.3 gameplay and adds a dedicated `AudioManager` rather than scattering `Audio` objects through game logic.

Key design decisions:

- normal gameplay music is one looping channel;
- invincibility music is a second simultaneous looping channel;
- jump SFX uses a small independent voice pool;
- background music is ducked, not stopped, during invincibility;
- pause/resume operates on active audio layers together;
- game over stops/reset music cleanly;
- food refreshes do not restart the invincibility song unnecessarily;
- browser autoplay failures are caught so audio can never crash gameplay;
- `.ogg`, `.wav`, and `.mp3` MIME types are explicitly supported by the local server;
- CC BY and CC0 attribution is preserved in `CREDITS.md` and alongside the audio assets.

Gold v0.4 was the audio milestone and remains preserved inside the current canonical branch.


## Gold v0.5 update

The canonical branch now categorizes every cell in the 5×5 food sheet:

- fruit: six-second invulnerability
- healthy food: one-hit shield
- coffee: temporary speed boost
- junk food and beer: temporary slowdown

Coffee and junk food replace one another rather than stacking conflicting movement multipliers. Fruit, shields, and movement effects can coexist. The HUD supports multiple simultaneous food states, and the healthy-food shield absorbs a collision without ending the run.


## Gold v0.6 update

Gold v0.6 keeps the browser game canonical and adds an optional Expo SDK 57 shell instead of starting a second React Native gameplay implementation. The Expo app renders a generated, self-contained build of the same HTML/CSS/JS game through `react-native-webview`.

Mobile-specific changes:

- left-thumb split movement pad;
- right-thumb jump button;
- simultaneous move + jump multitouch;
- accidental tap-anywhere jumping disabled for touch input;
- portrait/landscape responsive control sizing;
- safe-area-aware placement;
- Expo Go launcher and setup instructions;
- `npm run mobile:sync` regenerates the Expo payload from the canonical browser source;
- mobile-friendly MP3/WAV playback copies added while original licensed audio files remain preserved.

The generated `expo-mobile/src/gameContent.js` is build output, not a second source of truth.


## Gold v0.7 update

Gold v0.7 keeps the v0.6 browser/Expo single-engine architecture and makes the Expo Go experience landscape-first. `app.json` declares landscape orientation, `expo-screen-orientation` requests a runtime landscape lock, and the generated WebView game displays a rotate-device fallback if a device remains in portrait. The Expo-specific CSS also removes the desktop 420px minimum game height so short landscape phones use the full screen without cropping the bottom controls.

# Minji Runner: Gold v0.7

This folder is the **canonical Minji Runner project**. Gold v0.7 keeps the full browser game and Expo Go mobile build from v0.6, then makes mobile play landscape-first so the player gets a wider reaction window and a more natural two-thumb runner layout.

## Play it on Windows

1. Extract this entire folder somewhere permanent.
2. Double-click **`PLAY_MINJI_RUNNER.bat`**.
3. Your default browser should open to `http://127.0.0.1:4173`.
4. Keep the command window open while playing. Close it or press `Ctrl+C` when finished.

The launcher only needs Node.js. It does **not** run `npm install` and does not need React or Vite.

You can also launch it from PowerShell with `npm start` or `node server.js`.

## Play it on a phone with Expo Go

Gold v0.7 includes an Expo SDK 57 landscape-first shell in:

```text
expo-mobile/
```

The Expo app uses `react-native-webview` to host a self-contained copy of the **same canonical browser game**. This is deliberate: enemy behavior, stages, food effects, audio, collision logic, and future game systems should live in one place instead of splitting into separate web/mobile games.

### Windows / easiest route

1. Install a current **Node.js 22 LTS** release. Expo SDK 57 requires Node 22.13 or newer.
2. Install **Expo Go** on your phone and sign in to your Expo account.
3. On the computer, sign into the same Expo account if Expo asks you to: `npx expo login`.
4. Put the phone and computer on the same Wi-Fi network.
5. Double-click **`PLAY_MINJI_RUNNER_MOBILE.bat`** in the project root.
6. On the first run, the launcher installs the Expo dependencies in `expo-mobile/node_modules`. This folder is intentionally not included in the project ZIP.
7. When Expo shows a QR code, scan it with Expo Go.

You can also launch manually:

```powershell
cd expo-mobile
npm install
npx expo start --lan
```

If LAN discovery is blocked by a guest Wi-Fi/network configuration, Expo also supports a tunnel mode:

```powershell
npx expo start --tunnel
```

### Keeping mobile synchronized

The mobile game payload is generated from the root browser files. After changing gameplay code, CSS, HTML, or assets, run this from the project root:

```powershell
npm run mobile:sync
```

That rebuilds `expo-mobile/src/gameContent.js`. Do **not** hand-edit that generated file.

### Gold v0.7 phone controls

- **Left thumb:** large split movement pad for left/right movement.
- **Right thumb:** large circular jump button.
- Both thumbs can be held at the same time, so Minji can keep running while jumping.
- Touching random parts of the game world no longer causes accidental jumps on phones.
- **Expo Go locks the game to landscape.** Hold the phone sideways for the intended playfield.
- If the OS delays or refuses the native lock, a rotate-phone prompt covers the portrait view until the phone is sideways.
- Pause and audio controls remain in the HUD.


## Gold v0.7: Landscape-first Expo Go play

The Expo Go build now treats horizontal play as the mobile default rather than allowing the game to settle into portrait. The wider viewport gives enemies, platforms, and food pickups more travel distance before reaching Minji, which improves reaction time and makes the runner easier to read.

- Expo app config requests landscape.
- `expo-screen-orientation` locks to any landscape direction at runtime.
- A native loading screen briefly appears while the landscape request is applied.
- If the OS does not rotate, the embedded game shows a portrait-only **Turn your phone sideways** prompt.
- Expo removes the desktop-only 420px minimum game height so short landscape phones are not vertically cropped.
- Landscape touch controls keep movement on the left and jump on the right.
- The normal browser game remains responsive and is not forcibly landscape-locked.


## Gold v0.5+: Food categories are real gameplay

The supplied food art is a 160×160 sheet containing a 5×5 grid of 32×32 icons:

```text
assets/powerups/food.png
```

The sheet is still used directly. The game does not need 25 separate image files.

Every random food pickup now knows its exact row, column, category, and gameplay effect.

### Fruit: 6 seconds of invulnerability

Fruit uses the existing invulnerability system.

| Food | Sheet cell |
| --- | --- |
| Banana | r1c1 |
| Orange | r1c2 |
| Apple | r1c3 |
| Watermelon | r1c4 |
| Pineapple | r1c5 |
| Cherries | r2c1 |

Effect:

- **6 seconds of invulnerability**
- enemy contact cannot end the run
- Minji gets the gold invulnerability aura
- the invincibility music plays on its own audio layer
- the normal background track continues underneath at a reduced volume
- collecting another fruit refreshes the six-second timer rather than stacking unlimited duration

### Healthy food: one-hit shield

| Food | Sheet cell |
| --- | --- |
| Egg | r2c4 |
| Cheese | r2c5 |
| Muffin | r3c1 |
| Bread | r3c2 |
| Carrot | r4c4 |
| Milk | r4c5 |
| Fish | r5c2 |
| Avocado | r5c3 |

Effect:

- grants **one shield hit**
- the shield does not have a timer
- it stays active until an enemy actually hits Minji
- Minji gets a visible blue shield bubble
- when the shield is hit, the overlapping threat is removed and the run continues
- stacked enemies touching Minji on the exact same collision frame are treated as one protected collision event, preventing an unfair immediate second death
- picking up another healthy food while shielded refreshes the shield to one hit; shields do not stack into multiple armor charges

### Coffee: speed boost

| Food | Sheet cell |
| --- | --- |
| Coffee | r3c3 |

Effect:

- **45% faster horizontal movement**
- lasts **6 seconds**
- acceleration also becomes snappier
- jump height remains unchanged
- Minji gets a cool-toned speed glow
- coffee immediately clears an active junk-food slowdown

Coffee is only one of the 25 icons, so with equal random item selection it is intentionally the rarest effect.

### Junk food and beer: slowdown

| Food | Sheet cell |
| --- | --- |
| Donut | r2c2 |
| Ice Cream Cone | r2c3 |
| Hot Dog | r3c4 |
| Beer | r3c5 |
| Burger | r4c1 |
| Ice Cream Cup | r4c2 |
| Pizza | r4c3 |
| French Fries | r5c1 |
| Lollipop | r5c4 |
| Chocolate | r5c5 |

Effect:

- Minji moves at **62% of normal horizontal speed**
- lasts **5.2 seconds**
- acceleration also feels heavier/sluggish
- jump height remains unchanged so the punishment never makes a normally reachable platform impossible
- Minji gets a visibly dulled/sluggish treatment
- junk food immediately cancels an active coffee boost

This makes junk food a pickup the player may actively avoid rather than another automatic reward.

## Effect interaction rules

Food effects are allowed to coexist when that creates interesting gameplay without ambiguity.

- Fruit invulnerability can coexist with a shield.
- Fruit invulnerability can coexist with coffee speed.
- Fruit invulnerability can coexist with junk slowdown.
- A shield can coexist with coffee or junk.
- **Coffee and junk slowdown cannot coexist.** The newer movement effect replaces the older one.
- Pause freezes every timed food effect because their timers are tied to gameplay elapsed time.
- Restart/game over clears all active food states.

The HUD can show multiple active food effects at once, each with its own food icon and status.

## Pickup readability

The food itself now gives a subtle visual clue before collection:

- fruit uses a warm gold glow
- healthy food uses a cyan shield-style glow
- coffee uses a bright cool-blue glow
- junk food / beer uses a reddish warning glow

The pickup banner also changes its message by effect:

- `INVINCIBLE!`
- `SHIELD UP!`
- `CAFFEINATED!`
- `UH OH... SLUGGISH!`

## How food spawns

Food keeps the independent spawn system introduced in v0.3.

- First food appears roughly **8.5–13.5 seconds** into a run.
- Later food appears roughly every **18–30 seconds**.
- Pickups can travel at ground level.
- Pickups can float at reachable jump heights.
- Suitable approaching platforms may carry food.
- Platforms already carrying an enemy are excluded from food placement.
- Food spawning does not replace enemies or alter the weighted stage-enemy system.
- One of all 25 sheet cells is selected at random.

## Gold v0.4 layered audio preserved

### Normal background music

`assets/audio/background-chiptune.mp3`

- starts with a run
- loops continuously
- pauses with the game
- stops at game over

### Fruit invincibility music

`assets/audio/invincible.mp3`

Only the fruit/invulnerability effect starts this music layer.

During fruit invulnerability:

- the normal song keeps playing
- background volume ducks from 36% to 18%
- the invincibility track plays at 68%
- jump SFX can still play over both
- when fruit invulnerability ends, only the invincibility layer stops
- the background music returns to normal volume without restarting

### Minji jump sound

`assets/audio/minji-jump.wav`

The sound fires only when a jump actually begins, including buffered and coyote-time jumps.

### Sound toggle

The HUD includes:

- **🔊** = sound on
- **🔇** = muted

The mute preference is saved locally.

## Audio asset licensing

The project keeps its attribution records in:

```text
CREDITS.md
assets/audio/AUDIO-ASSET-LICENSES.txt
```

Summary:

- **Jump and Run (8-bit)** by bart: CC BY 3.0
- **Invincible!** by NBJDLukasAbsolute: CC0
- **Cartoony Jump and Bounce** / YoFrankie! © 2008 Blender Foundation: CC BY 3.0

Do not remove the credits if the CC BY audio remains in a distributed version of the game.

## Food asset licensing

The food sprite sheet remains documented in:

```text
CREDITS.md
assets/powerups/FOOD-ASSET-LICENSE.txt
```

The OpenGameArt food sheet is CC0.

## v0.2 movement and geometry fixes preserved

- Minji faces the direction she runs.
- Floating-platform artwork and collision geometry remain aligned.
- Player-hitbox-based platform landings remain in place.
- The ground line maps to the actual background artwork at every browser aspect ratio.
- Minji, enemies, platforms, riders, and food all migrate with the visual ground during resize.
- Movement includes acceleration, coyote time, jump buffering, variable jump height, and fast fall.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move left | A / Left Arrow | Left half of movement pad |
| Move right | D / Right Arrow | Right half of movement pad |
| Jump | Space / W / Up Arrow | Right-thumb Jump button |
| Fast fall | S / Down Arrow | — |
| Pause / resume | Escape / P | Pause button |
| Sound | HUD speaker button | HUD speaker button |
| Start / retry | Space | Start / Retry button |

## Current gameplay

- Endless runner survival loop
- Score increases when an enemy is successfully passed
- Survival timer and locally saved best score / best time
- Six weighted stages with escalating enemy mixtures
- Four distinct enemy types:
  - **Joe Goblin / Walker:** straightforward ground runner
  - **Joe Gremlin / Jumper:** timed hopping threat
  - **Llama Joe / Hoverbat:** aerial sine-wave movement
  - **Miloctopus / Bull Rush:** approach, windup, charge, recovery behavior
- Moving brick, tuft, leaf, and cloud platforms
- Some clouds can carry eligible enemies
- Randomized food collectibles from a 25-icon sprite sheet
- Four food-effect categories
- One-hit shield collision handling
- Layered gameplay + fruit-invincibility music
- Independent jump SFX
- Persistent mute toggle
- Enemy and platform speed gradually increase during a run
- Start, pause, resume, restart, and game-over states
- Keyboard and touch controls
- Responsive browser layout
- Stage HUD and multi-effect food HUD

### Important banner rule

A new-enemy banner is **not** shown merely because a stage threshold has been reached. It is shown only the first time that newly unlocked enemy type **actually spawns during that run**.

## Stage progression

| Stage | Unlock | Weighted spawn pool |
| --- | ---: | --- |
| 1 · Warm Up | 0 spawns | Walker 8 |
| 2 · Gremlin Trouble | 12 | Walker 6, Jumper 3 |
| 3 · Llama Skies | 28 | Walker 5, Jumper 3, Hoverbat 2 |
| 4 · Milo Mayhem | 48 | Walker 4, Jumper 3, Hoverbat 3, Bull Rush 1 |
| 5 · Chaos Run | 72 | Walker 4, Jumper 3, Hoverbat 3, Bull Rush 2 |
| 6 · Full Send | 105 | Walker 3, Jumper 3, Hoverbat 4, Bull Rush 3 |

Stages 5 and 6 change weighting/difficulty but do not introduce fake new-enemy banners.

## Project structure

```text
Minji-Runner-Gold-v0.7/
├─ assets/
│  ├─ audio/
│  │  ├─ background-chiptune.mp3      <- runtime copy
│  │  ├─ background-chiptune.ogg      <- original preserved
│  │  ├─ invincible.mp3               <- runtime copy
│  │  ├─ invincible.wav               <- original preserved
│  │  ├─ minji-jump.wav               <- runtime copy
│  │  ├─ minji-jump.ogg               <- original preserved
│  │  └─ AUDIO-ASSET-LICENSES.txt
│  ├─ enemies/
│  ├─ platforms/
│  ├─ player/
│  └─ powerups/
├─ js/
│  ├─ config/
│  ├─ core/
│  │  └─ AudioManager.js
│  ├─ enemies/
│  ├─ entities/
│  ├─ platforms/
│  └─ powerups/
├─ expo-mobile/                       <- Expo Go host, no bundled node_modules
│  ├─ App.js
│  ├─ package.json
│  ├─ src/gameContent.js              <- generated from canonical web game
│  ├─ tools/build-game-content.mjs
│  └─ START_EXPO_GO.bat
├─ tools/
├─ index.html
├─ styles.css
├─ server.js
├─ PLAY_MINJI_RUNNER.bat
├─ PLAY_MINJI_RUNNER_MOBILE.bat
├─ README.md
├─ CREDITS.md
└─ AUDIT-AND-CLEANUP.md
```

## Testing

Run:

```text
npm run test:smoke
```

The Gold v0.7 browser smoke test verifies:

- the full 25-cell food mapping
- 6 fruit icons
- 8 healthy/shield icons
- 10 junk/slow icons
- 1 coffee/speed icon
- fruit invulnerability and layered audio
- healthy-food shield collision absorption
- coffee movement boost
- junk slowdown
- coffee/junk mutual cancellation
- food/platform attachment
- responsive ground geometry
- player facing
- jump audio
- cloud riders
- stage progression
- pause/resume
- mute persistence
- game over cleanup
- simultaneous two-thumb move + jump input
- touchscreen world taps do not trigger accidental jumps

The generated Expo payload has its own validation:

```text
npm run test:mobile
```

That test verifies the Expo HTML is self-contained, includes the phone control layout, embeds image/audio assets, contains no external `assets/...` dependencies, and that the bundled gameplay script parses successfully.

## Canonical-project rule

Use this folder as the active development copy. Make versioned milestone ZIPs, but do not create parallel mystery working branches. Gold v0.7 supersedes v0.6 as the active branch. The root browser source remains the gameplay source of truth; the Expo payload is regenerated from it.

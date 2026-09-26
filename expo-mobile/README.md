# Minji Runner: Expo Go landscape practice shell

This folder is the mobile host for **Gold v0.7**. It is intentionally not a second gameplay codebase.

The canonical game remains in the project root (`index.html`, `styles.css`, `js/`, and `assets/`). The script in `tools/build-game-content.mjs` bundles those files into one self-contained HTML payload at `src/gameContent.js`, and the Expo app displays that payload with `react-native-webview`.

## Gold v0.7 orientation behavior

Mobile play is now **landscape-first** because the wider playfield gives the player more time to see and react to enemies, platforms, and food pickups.

The Expo shell enforces that in several layers:

- `app.json` declares `orientation: "landscape"`.
- `expo-screen-orientation` requests `OrientationLock.LANDSCAPE` at runtime before showing the game.
- iOS full-screen mode is requested for better orientation-lock behavior on supported iOS/iPadOS versions.
- The generated Expo game contains a portrait-only fallback overlay telling the player to turn the phone sideways if the OS delays or refuses the native lock.
- The desktop/browser game remains responsive and is not forced into landscape.

## Requirements

- Node.js **22.13+** for Expo SDK 57
- Expo Go on the phone
- Computer and phone on the same local network for the normal `--lan` workflow
- Current Expo Go may require the same Expo account to be signed in on both the CLI and the phone app

## Run

On Windows, the easiest option is the root project launcher:

```text
PLAY_MINJI_RUNNER_MOBILE.bat
```

Or manually:

```powershell
cd expo-mobile
npm install
npx expo start --lan
```

Scan the QR code in Expo Go, then hold the phone sideways.

## Controls

- Left thumb: split left/right movement pad
- Right thumb: Jump
- Movement and jump can be held simultaneously
- Pause and audio remain in the top HUD
- Landscape is the intended and enforced Expo Go play orientation

## Sync after editing the web game

From the project root:

```powershell
npm run mobile:sync
```

Or from this folder:

```powershell
npm run sync:web
```

Do not hand-edit `src/gameContent.js`; it is generated.

## Architecture note

The WebView approach is intentional for the current stage of Minji Runner. It gives us a browser build and a phone/Expo Go build while preserving one gameplay engine. If the project eventually needs native-only features that a WebView cannot provide well, the mobile layer can be migrated later without throwing away the current game design.

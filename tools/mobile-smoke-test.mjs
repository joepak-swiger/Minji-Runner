import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAME_HTML } from '../expo-mobile/src/gameContent.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

assert.ok(GAME_HTML.length > 1_000_000, 'Expo payload should contain bundled game assets');
assert.match(GAME_HTML, /<html lang="en" class="expo-host">/);
assert.match(GAME_HTML, /class="touch-move-pad"/);
assert.match(GAME_HTML, /id="btn-left"/);
assert.match(GAME_HTML, /id="btn-right"/);
assert.match(GAME_HTML, /id="btn-jump"/);
assert.match(GAME_HTML, /left thumb moves · right thumb jumps/i);
assert.match(GAME_HTML, /id="rotate-device-prompt"/);
assert.match(GAME_HTML, /Turn your phone sideways/);
assert.match(GAME_HTML, /html\.expo-host #game-root/);
assert.match(GAME_HTML, /@media \(orientation: portrait\)/);
assert.match(GAME_HTML, /data:image\/png;base64,/);
assert.match(GAME_HTML, /data:image\/gif;base64,/);
assert.match(GAME_HTML, /data:audio\/mpeg;base64,/);
assert.match(GAME_HTML, /data:audio\/wav;base64,/);
assert.doesNotMatch(GAME_HTML, /(?:src|href)=["']assets\//, 'mobile HTML must not rely on external asset paths');
assert.doesNotMatch(GAME_HTML, /url\(["']?assets\//, 'mobile CSS must not rely on external asset paths');
assert.doesNotMatch(GAME_HTML, /<script\s+type="module"\s+src=/, 'mobile JS should be bundled inline');

const scriptMatches = [...GAME_HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scriptMatches.length, 1, 'Expo payload should contain one bundled gameplay script');
new Function(scriptMatches[0][1]);

for (const relative of [
  'assets/audio/background-chiptune.mp3',
  'assets/audio/invincible.mp3',
  'assets/audio/minji-jump.wav',
  'expo-mobile/App.js',
  'expo-mobile/app.json',
  'expo-mobile/package.json',
  'expo-mobile/START_EXPO_GO.bat',
]) {
  assert.equal(fs.existsSync(path.join(root, relative)), true, `${relative} should exist`);
}

const expoPackage = JSON.parse(fs.readFileSync(path.join(root, 'expo-mobile/package.json'), 'utf8'));
assert.equal(expoPackage.version, '0.7.0');
assert.equal(expoPackage.dependencies.expo, '~57.0.17');
assert.equal(expoPackage.dependencies['expo-screen-orientation'], '~57.0.2');
assert.equal(expoPackage.dependencies['react-native-webview'], '13.16.1');

const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'expo-mobile/app.json'), 'utf8'));
assert.equal(appConfig.expo.version, '0.7.0');
assert.equal(appConfig.expo.orientation, 'landscape');
assert.equal(appConfig.expo.ios.requireFullScreen, true);
assert.ok(
  appConfig.expo.plugins.some((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-screen-orientation'),
  'Expo config should include the screen-orientation plugin',
);

const appSource = fs.readFileSync(path.join(root, 'expo-mobile/App.js'), 'utf8');
assert.match(appSource, /from 'expo-screen-orientation'/);
assert.match(appSource, /OrientationLock\.LANDSCAPE/);
assert.match(appSource, /lockAsync/);
assert.match(appSource, /Turning Minji sideways/);
assert.match(appSource, /MinjiRunnerExpo\/0\.7/);

console.log('Minji Runner Gold v0.7 Expo/mobile smoke test passed.');

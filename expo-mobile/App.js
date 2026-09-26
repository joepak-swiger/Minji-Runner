import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { WebView } from 'react-native-webview';
import { GAME_HTML } from './src/gameContent.js';

/**
 * Expo Go host for the canonical browser game.
 *
 * Gold v0.7 is landscape-first on phones. We request the orientation both in
 * app.json and at runtime so Expo Go rotates into a wide playfield before the
 * WebView becomes interactive. The browser game remains the source of truth;
 * `npm run sync:web` rebuilds src/gameContent.js from the root HTML/CSS/JS.
 */
export default function App() {
  const [orientationReady, setOrientationReady] = useState(Platform.OS === 'web');

  useEffect(() => {
    let active = true;

    async function lockLandscape() {
      if (Platform.OS === 'web') {
        if (active) setOrientationReady(true);
        return;
      }

      try {
        const supported = await ScreenOrientation.supportsOrientationLockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE,
        );

        if (supported) {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        }
      } catch (error) {
        // The embedded game also contains a portrait rotate prompt. If a device
        // refuses the native lock, the player still receives a clear instruction
        // instead of being forced into a cramped portrait playfield.
        console.warn('Minji Runner could not lock landscape orientation:', error);
      } finally {
        if (active) setOrientationReady(true);
      }
    }

    lockLandscape();

    return () => {
      active = false;
    };
  }, []);

  if (!orientationReady) {
    return React.createElement(
      View,
      { style: styles.rotateLoading },
      React.createElement(StatusBar, { hidden: true }),
      React.createElement(ActivityIndicator, { size: 'large', color: '#7ed8e9' }),
      React.createElement(Text, { style: styles.rotateLoadingTitle }, 'Turning Minji sideways…'),
      React.createElement(Text, { style: styles.rotateLoadingText }, 'Landscape gives you more room to react.'),
    );
  }

  return React.createElement(
    View,
    { style: styles.root },
    React.createElement(StatusBar, {
      hidden: true,
      translucent: true,
      barStyle: 'light-content',
    }),
    React.createElement(WebView, {
      style: styles.webview,
      originWhitelist: ['*'],
      source: {
        html: GAME_HTML,
        baseUrl: 'https://minji.runner.local/',
      },
      javaScriptEnabled: true,
      domStorageEnabled: true,
      allowsInlineMediaPlayback: true,
      mediaPlaybackRequiresUserAction: false,
      bounces: false,
      scrollEnabled: false,
      showsHorizontalScrollIndicator: false,
      showsVerticalScrollIndicator: false,
      overScrollMode: 'never',
      setSupportMultipleWindows: false,
      allowsBackForwardNavigationGestures: false,
      textInteractionEnabled: false,
      androidLayerType: 'hardware',
      contentMode: 'mobile',
      applicationNameForUserAgent: 'MinjiRunnerExpo/0.7',
      onShouldStartLoadWithRequest: (request) => {
        if (request.url === 'about:blank') return true;
        if (request.url.startsWith('https://minji.runner.local/')) return true;
        if (request.url.startsWith('data:')) return true;
        return Platform.OS === 'web';
      },
    }),
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#13233b',
  },
  webview: {
    flex: 1,
    backgroundColor: '#13233b',
  },
  rotateLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 28,
    backgroundColor: '#13233b',
  },
  rotateLoadingTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  rotateLoadingText: {
    color: '#b9cad9',
    fontSize: 14,
    textAlign: 'center',
  },
});

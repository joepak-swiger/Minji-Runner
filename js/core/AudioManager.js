/**
 * Centralized layered audio for Minji Runner.
 *
 * The music and sound-effect channels intentionally remain independent so the
 * background chiptune can continue underneath temporary power-up music while
 * jump effects still fire on top of both.
 */
export default class AudioManager {
  constructor(config) {
    this.config = config;
    this.muted = false;
    this.paused = false;
    this.backgroundWanted = false;
    this.invincibilityActive = false;
    this.jumpVoiceIndex = 0;

    this.background = createAudio(config.backgroundMusic.src, {
      loop: true,
      preload: 'auto',
      volume: config.backgroundMusic.volume,
    });

    this.invincible = createAudio(config.invincibilityMusic.src, {
      loop: true,
      preload: 'auto',
      volume: config.invincibilityMusic.volume,
    });

    this.jumpVoices = Array.from(
      { length: Math.max(1, config.jumpSound.voices ?? 1) },
      () => createAudio(config.jumpSound.src, {
        loop: false,
        preload: 'auto',
        volume: config.jumpSound.volume,
      }),
    );
  }

  startRun() {
    this.backgroundWanted = true;
    this.paused = false;
    this.invincibilityActive = false;

    resetAudio(this.background);
    resetAudio(this.invincible);
    this._setBackgroundVolume(false);
    this._applyMutedState();
    safePlay(this.background);
  }

  pauseRun() {
    this.paused = true;
    this.background.pause();
    this.invincible.pause();
    for (const voice of this.jumpVoices) voice.pause();
  }

  resumeRun(invulnerable = false) {
    this.paused = false;
    this.invincibilityActive = Boolean(invulnerable);
    this._setBackgroundVolume(this.invincibilityActive);
    this._applyMutedState();

    if (this.backgroundWanted) safePlay(this.background);
    if (this.invincibilityActive) safePlay(this.invincible);
    else this._stopInvincibilityTrack();
  }

  gameOver() {
    this.paused = false;
    this.backgroundWanted = false;
    this.invincibilityActive = false;
    this.background.pause();
    this.invincible.pause();
    for (const voice of this.jumpVoices) voice.pause();
    resetAudio(this.background);
    resetAudio(this.invincible);
    this._setBackgroundVolume(false);
  }

  stopAll({ resetBackground = true } = {}) {
    this.paused = false;
    this.backgroundWanted = false;
    this.invincibilityActive = false;

    this.background.pause();
    this.invincible.pause();
    for (const voice of this.jumpVoices) {
      voice.pause();
      resetAudio(voice);
    }

    if (resetBackground) resetAudio(this.background);
    resetAudio(this.invincible);
    this._setBackgroundVolume(false);
  }

  activateInvincibility() {
    this.invincibilityActive = true;
    this._setBackgroundVolume(true);
    this._applyMutedState();

    // If another food refreshes the timer while the track is already playing,
    // leave its playhead alone. That avoids an audible restart every pickup.
    if (!this.paused && this.invincible.paused) safePlay(this.invincible);
  }

  deactivateInvincibility() {
    this.invincibilityActive = false;
    this._setBackgroundVolume(false);
    this._stopInvincibilityTrack();
  }

  playJump() {
    if (this.paused || !this.jumpVoices.length) return;

    const voice = this.jumpVoices[this.jumpVoiceIndex];
    this.jumpVoiceIndex = (this.jumpVoiceIndex + 1) % this.jumpVoices.length;

    voice.pause();
    resetAudio(voice);
    this._applyMutedState();
    safePlay(voice);
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    this._applyMutedState();
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  _setBackgroundVolume(invincibilityActive) {
    this.background.volume = invincibilityActive
      ? this.config.backgroundMusic.volumeDuringInvincibility
      : this.config.backgroundMusic.volume;
  }

  _stopInvincibilityTrack() {
    this.invincible.pause();
    resetAudio(this.invincible);
  }

  _applyMutedState() {
    const tracks = [this.background, this.invincible, ...this.jumpVoices];
    for (const track of tracks) track.muted = this.muted;
  }
}

function createAudio(src, { loop, preload, volume }) {
  if (typeof globalThis.Audio === 'function') {
    const audio = new globalThis.Audio(src);
    audio.loop = loop;
    audio.preload = preload;
    audio.volume = volume;
    return audio;
  }

  // Headless fallback used by automated smoke tests. Keeping the same tiny
  // interface means game logic remains testable without a browser audio stack.
  return {
    src,
    loop,
    preload,
    volume,
    muted: false,
    paused: true,
    currentTime: 0,
    play() {
      this.paused = false;
      return Promise.resolve();
    },
    pause() {
      this.paused = true;
    },
  };
}

function resetAudio(audio) {
  try {
    audio.currentTime = 0;
  } catch {
    // Some browser states temporarily disallow seeking before metadata loads.
  }
}

function safePlay(audio) {
  try {
    const result = audio.play();
    if (result && typeof result.catch === 'function') {
      result.catch(() => {
        // Browser autoplay policies can reject playback before a user gesture.
        // The next Start/Resume gesture will try again without breaking play.
      });
    }
  } catch {
    // Audio should never be able to crash the game loop.
  }
}

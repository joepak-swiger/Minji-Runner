export default class Input {
  constructor({ getState, onStart, onRestart, onPauseToggle, onResume }) {
    this.getState = getState;
    this.onStart = onStart;
    this.onRestart = onRestart;
    this.onPauseToggle = onPauseToggle;
    this.onResume = onResume;

    this.left = false;
    this.right = false;
    this.down = false;
    this.jumpHeld = false;
    this.jumpPressed = false;

    this._bound = false;
    this._cleanup = [];
    this._buttons = [];
  }

  attach({ viewport, leftButton, jumpButton, rightButton }) {
    if (this._bound) return;
    this._bound = true;
    this._buttons = [leftButton, jumpButton, rightButton].filter(Boolean);

    const keyDown = (event) => this._onKeyDown(event);
    const keyUp = (event) => this._onKeyUp(event);
    window.addEventListener('keydown', keyDown, { passive: false });
    window.addEventListener('keyup', keyUp, { passive: false });
    this._cleanup.push(() => window.removeEventListener('keydown', keyDown));
    this._cleanup.push(() => window.removeEventListener('keyup', keyUp));

    this._bindHoldButton(leftButton, () => { this.left = true; }, () => { this.left = false; });
    this._bindHoldButton(rightButton, () => { this.right = true; }, () => { this.right = false; });
    this._bindJumpButton(jumpButton);

    if (viewport) {
      const onPointerDown = (event) => {
        if (event.target?.closest?.('#touch-controls, button')) return;
        // On touchscreens, jumping is intentionally confined to the dedicated
        // right-thumb jump zone. This prevents accidental jumps while a player
        // adjusts grip or taps the game view. Mouse/pen clicks can still jump.
        if (event.pointerType === 'touch') return;
        const state = this.getState();
        if (state === 'ready') {
          this.onStart();
          return;
        }
        if (state === 'gameover') {
          this.onRestart();
          return;
        }
        if (state === 'running') this._pressJump();
      };
      const onPointerUp = () => this._releaseJump();
      viewport.addEventListener('pointerdown', onPointerDown);
      viewport.addEventListener('pointerup', onPointerUp);
      viewport.addEventListener('pointercancel', onPointerUp);
      this._cleanup.push(() => viewport.removeEventListener('pointerdown', onPointerDown));
      this._cleanup.push(() => viewport.removeEventListener('pointerup', onPointerUp));
      this._cleanup.push(() => viewport.removeEventListener('pointercancel', onPointerUp));
    }
  }

  detach() {
    for (const cleanup of this._cleanup.splice(0)) cleanup();
    this._bound = false;
    this.resetMovement();
  }

  consumeJumpPressed() {
    this.jumpPressed = false;
  }

  resetMovement() {
    this.left = false;
    this.right = false;
    this.down = false;
    this.jumpHeld = false;
    this.jumpPressed = false;
    for (const button of this._buttons) button.classList?.remove('is-held');
  }

  _onKeyDown(event) {
    const code = event.code;
    const movementKey = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'KeyA', 'KeyD', 'KeyS', 'KeyW', 'Space'].includes(code);
    if (movementKey) event.preventDefault();

    if (code === 'Escape' || code === 'KeyP') {
      event.preventDefault();
      this.onPauseToggle();
      return;
    }

    if (code === 'ArrowLeft' || code === 'KeyA') this.left = true;
    if (code === 'ArrowRight' || code === 'KeyD') this.right = true;
    if (code === 'ArrowDown' || code === 'KeyS') this.down = true;

    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
      const state = this.getState();
      if (state === 'ready') {
        if (!event.repeat) this.onStart();
        return;
      }
      if (state === 'gameover') {
        if (!event.repeat) this.onRestart();
        return;
      }
      if (state === 'paused') {
        if (!event.repeat) this.onResume();
        return;
      }
      if (state === 'running' && !event.repeat) this._pressJump();
    }
  }

  _onKeyUp(event) {
    const code = event.code;
    if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'KeyA', 'KeyD', 'KeyS', 'KeyW', 'Space'].includes(code)) {
      event.preventDefault();
    }
    if (code === 'ArrowLeft' || code === 'KeyA') this.left = false;
    if (code === 'ArrowRight' || code === 'KeyD') this.right = false;
    if (code === 'ArrowDown' || code === 'KeyS') this.down = false;
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') this._releaseJump();
  }

  _pressJump() {
    if (!this.jumpHeld) this.jumpPressed = true;
    this.jumpHeld = true;
  }

  _releaseJump() {
    this.jumpHeld = false;
  }

  _bindHoldButton(button, press, release) {
    if (!button) return;
    const down = (event) => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      button.classList?.add('is-held');
      press();
    };
    const up = (event) => {
      event.preventDefault();
      button.classList?.remove('is-held');
      release();
    };
    button.addEventListener('pointerdown', down);
    button.addEventListener('pointerup', up);
    button.addEventListener('pointercancel', up);
    button.addEventListener('pointerleave', up);
    this._cleanup.push(() => button.removeEventListener('pointerdown', down));
    this._cleanup.push(() => button.removeEventListener('pointerup', up));
    this._cleanup.push(() => button.removeEventListener('pointercancel', up));
    this._cleanup.push(() => button.removeEventListener('pointerleave', up));
  }

  _bindJumpButton(button) {
    if (!button) return;
    const down = (event) => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      const state = this.getState();
      if (state === 'ready') this.onStart();
      else if (state === 'gameover') this.onRestart();
      else if (state === 'paused') this.onResume();
      else if (state === 'running') this._pressJump();
      button.classList?.add('is-held');
    };
    const up = (event) => {
      event.preventDefault();
      button.classList?.remove('is-held');
      this._releaseJump();
    };
    button.addEventListener('pointerdown', down);
    button.addEventListener('pointerup', up);
    button.addEventListener('pointercancel', up);
    this._cleanup.push(() => button.removeEventListener('pointerdown', down));
    this._cleanup.push(() => button.removeEventListener('pointerup', up));
    this._cleanup.push(() => button.removeEventListener('pointercancel', up));
  }
}

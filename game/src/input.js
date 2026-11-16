// Keyboard and pointer input for the twin-stick controls. WASD / arrows move the
// Keeper, the mouse aims, holding the mouse button (or Space) fires. One-shot
// presses (confirm, pause, mute, upgrade choices) are queued as bit flags and taken
// once by the loop, so a press between two frames is never lost or counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_CHOICE_1 = 8;
export const ACTION_CHOICE_2 = 16;
export const ACTION_CHOICE_3 = 32;

const UP = new Set(['KeyW', 'ArrowUp']);
const DOWN = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);
const CHOICES = new Map([
  ['Digit1', ACTION_CHOICE_1],
  ['Digit2', ACTION_CHOICE_2],
  ['Digit3', ACTION_CHOICE_3],
  ['Numpad1', ACTION_CHOICE_1],
  ['Numpad2', ACTION_CHOICE_2],
  ['Numpad3', ACTION_CHOICE_3],
]);

export function createInput(canvas) {
  const held = { up: false, down: false, left: false, right: false };
  let actions = 0;
  let firing = false;
  let aimX = 640;
  let aimY = 200;

  function setKey(code, value) {
    if (UP.has(code)) held.up = value;
    else if (DOWN.has(code)) held.down = value;
    else if (LEFT.has(code)) held.left = value;
    else if (RIGHT.has(code)) held.right = value;
  }

  window.addEventListener('keydown', (event) => {
    setKey(event.code, true);
    if (event.code === 'Space') {
      firing = true;
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (CHOICES.has(event.code)) {
      if (!event.repeat) actions |= CHOICES.get(event.code);
    } else {
      return;
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    setKey(event.code, false);
    if (event.code === 'Space') firing = false;
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    held.up = false;
    held.down = false;
    held.left = false;
    held.right = false;
    firing = false;
  });

  function trackPointer(event) {
    const rect = canvas.getBoundingClientRect();
    aimX = event.clientX - rect.left;
    aimY = event.clientY - rect.top;
  }
  canvas.addEventListener('pointermove', trackPointer);
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    trackPointer(event);
    firing = true;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => {
    firing = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** Normalised move vector from the held keys: { x, y }, each -1, 0 or 1 scaled. */
    move() {
      const x = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      const y = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const length = Math.hypot(x, y);
      return { x: x / length, y: y / length };
    },
    /** Aim point in canvas CSS pixels (the renderer converts to field space). */
    aim() {
      return { x: aimX, y: aimY };
    },
    firing() {
      return firing;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}

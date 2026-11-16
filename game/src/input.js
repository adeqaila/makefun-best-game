// ABYSSAL — input.js
// One job: keyboard and mouse input, translated into game actions.
// WASD / arrows move one tile (one turn). Enter/Space confirms,
// M mutes, P or Escape pauses, R restarts on the results screen.

function attachInput(canvas, handlers) {
  const moves = {
    w: [0, -1], a: [-1, 0], s: [0, 1], d: [1, 0],
    arrowup: [0, -1], arrowleft: [-1, 0], arrowdown: [0, 1], arrowright: [1, 0],
  };
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (moves[key]) {
      e.preventDefault();
      handlers.onMove(moves[key][0], moves[key][1]);
      return;
    }
    if (key === 'enter' || key === ' ') {
      e.preventDefault();
      handlers.onConfirm();
      return;
    }
    if (key === 'm') { handlers.onMute(); return; }
    if (key === 'p' || key === 'escape') { handlers.onPause(); return; }
    if (key === 'r') { handlers.onRestart(); return; }
  });
  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * canvas.width;
    const y = ((e.clientY - r.top) / r.height) * canvas.height;
    handlers.onClick(x, y);
  });
}

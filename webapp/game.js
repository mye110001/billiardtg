const tg = window.Telegram.WebApp;
tg.expand();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const ws = new WebSocket(`${window.location.origin.replace(/^http/, 'ws')}${window.location.pathname}`);

let state = { x: 200, y: 200, vx: 0, vy: 0 };

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.type === 'state') {
    state = msg.state;
  }
};

// при клике — отправить ход
canvas.addEventListener('click', (ev) => {
  const rect = canvas.getBoundingClientRect();
  const cx = ev.clientX - rect.left;
  const cy = ev.clientY - rect.top;
  const vx = (cx - state.x) * 0.1;
  const vy = (cy - state.y) * 0.1;
  ws.send(JSON.stringify({ type: 'move', vx, vy }));
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.arc(state.x, state.y, 10, 0, Math.PI * 2);
  ctx.fillStyle = 'yellow';
  ctx.fill();
}

function loop() {
  draw();
  requestAnimationFrame(loop);
}
loop();

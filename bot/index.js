const { Telegraf } = require('telegraf');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("Укажи BOT_TOKEN среды!");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// хранение игр: gameId → { wsClients: [], state }
const games = {};

// обслуживаем фронтенд
app.use(express.static(path.join(__dirname, '../webapp')));

// команда /start
bot.start((ctx) => {
  ctx.reply("Привет! Напиши /new, чтобы создать игру");
});

// команда /new
bot.command('new', (ctx) => {
  const gameId = String(Date.now());
  games[gameId] = {
    wsClients: [],
    state: {
      x: 200, y: 200,
      vx: 0, vy: 0
    }
  };
  // генерируем ссылку: предполагаем, что бот + веб сидят под одним доменом
  const url = `${process.env.BASE_URL || ''}/${gameId}`;
  ctx.reply("Игра создана! Пригласи друга по ссылке:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Играть 🎱", web_app: { url } }]
      ]
    }
  });
});

// WebSocket соединения
wss.on('connection', (ws, req) => {
  const url = req.url; // вида "/1234567890"
  const gameId = url.slice(1);
  const game = games[gameId];
  if (!game) {
    ws.close();
    return;
  }
  game.wsClients.push(ws);

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'move') {
        // обновляем скорость
        game.state.vx = data.vx;
        game.state.vy = data.vy;
        // обновляем положение
        game.state.x += data.vx;
        game.state.y += data.vy;
      }
    } catch (e) {
      console.error("Ошибка парсинга:", e);
    }
    // рассылаем новое состояние
    const s = JSON.stringify({ type: 'state', state: game.state });
    game.wsClients.forEach(c => {
      if (c.readyState === WebSocket.OPEN) c.send(s);
    });
  });

  ws.on('close', () => {
    game.wsClients = game.wsClients.filter(c => c !== ws);
  });
});

// запуск бота + сервера
bot.launch();
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Сервер и бот запущены на порту ${port}`);
});

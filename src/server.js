require('dotenv').config();

const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const { pool } = require('./db');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is missing from .env');
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.set('io', io);
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'online', database: 'connected' });
  } catch (e) {
    res.status(503).json({ status: 'degraded', database: 'unavailable', error: e.message });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/riders', require('./routes/riders'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/sync', require('./routes/sync'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

io.on('connection', s => {
  s.emit('reflex:connected', { at: new Date().toISOString() });
});

const PORT = Number(process.env.PORT || 3000);
server.listen(PORT, () => console.log(`Reflex running at http://localhost:${PORT}`));
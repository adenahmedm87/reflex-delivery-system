const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  const result = await pool.query('SELECT * FROM users WHERE LOWER(email)=$1', [email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Incorrect email or password.' });
  const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, availability: user.availability } });
});
router.get('/me', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT id,name,email,phone,role,availability FROM users WHERE id=$1', [req.user.id]);
  res.json(result.rows[0] || null);
});
module.exports = router;
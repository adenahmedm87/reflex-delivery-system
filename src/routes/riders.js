const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();
router.get('/', requireAuth, requireRole('RETAILER','DISPATCHER'), async (req,res) => {
  const result = await pool.query("SELECT id,name,phone,availability FROM users WHERE role='RIDER' ORDER BY name");
  res.json(result.rows);
});
router.patch('/me/availability', requireAuth, requireRole('RIDER'), async (req,res) => {
  const value = String(req.body.availability || '').toUpperCase();
  if (!['AVAILABLE','BUSY','OFFLINE'].includes(value)) return res.status(400).json({ error: 'Invalid availability.' });
  const result = await pool.query('UPDATE users SET availability=$2 WHERE id=$1 RETURNING id,name,availability', [req.user.id, value]);
  res.json(result.rows[0]);
});
module.exports = router;
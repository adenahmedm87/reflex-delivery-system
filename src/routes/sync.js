const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();
// The browser rider queue replays the same normal APIs after reconnect.
// This endpoint exists as a simple readiness/status endpoint for the sprint.
router.get('/status', requireAuth, requireRole('RIDER','DISPATCHER'), (req,res)=>res.json({online:true,message:'Sync service ready.'}));
module.exports = router;
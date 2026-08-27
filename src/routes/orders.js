const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { canTransition, cleanPhone, publicOrder } = require('../services/orderRules');
const { getRouteEstimate } = require('../services/routingService');
const { calculateHealth } = require('../services/healthService');

const router = express.Router();

const SELECT = `SELECT d.*, r.name rider_name, r.phone rider_phone, r.availability rider_availability
FROM deliveries d LEFT JOIN users r ON r.id=d.rider_id`;

const orderNo = () =>
  `ORD-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

const id = p => `${p}-${crypto.randomUUID()}`;

async function getOrder(num, client = pool) {
  const r = await client.query(`${SELECT} WHERE d.order_number=$1`, [num]);
  return r.rows[0] || null;
}

async function addEvent(
  deliveryId,
  type,
  actorId = null,
  notes = null,
  payload = {},
  client = pool,
  eventId = null,
  baseVersion = null,
  lat = null,
  lng = null,
  clientTimestamp = null,
  syncStatus = 'SYNCED'
) {
  await client.query(
    `INSERT INTO delivery_events(id,event_id,delivery_id,type,actor_id,client_timestamp,latitude,longitude,notes,payload,base_version,sync_status)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(event_id) DO NOTHING`,
    [
      id('DBE'),
      eventId || id('EVT'),
      deliveryId,
      type,
      actorId,
      clientTimestamp,
      lat,
      lng,
      notes,
      JSON.stringify(payload || {}),
      baseVersion,
      syncStatus
    ]
  );
}

async function timeline(deliveryId) {
  const r = await pool.query(
    'SELECT event_id,type,actor_id,server_timestamp,notes,payload FROM delivery_events WHERE delivery_id=$1 ORDER BY server_timestamp',
    [deliveryId]
  );
  return r.rows;
}

function emit(req, orderNumber, type) {
  req.app.get('io')?.emit('order:updated', { orderNumber, type, at: new Date().toISOString() });
}

// ---------- Customer-facing (no login) ----------

router.get('/track/:orderNumber', async (req, res) => {
  const order = await getOrder(req.params.orderNumber);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  if (cleanPhone(req.query.phone) !== cleanPhone(order.customer_phone)) {
    return res.status(403).json({ error: 'Order number and phone do not match.' });
  }

  const out = publicOrder(order);
  delete out.customerPhone;
  res.json({ order: out, timeline: await timeline(order.id) });
});

router.post('/track/:orderNumber/request-otp', async (req, res) => {
  const order = await getOrder(req.params.orderNumber);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  if (cleanPhone(req.body.phone) !== cleanPhone(order.customer_phone)) {
    return res.status(403).json({ error: 'Order number and phone do not match.' });
  }

  if (!['PICKED_UP', 'IN_TRANSIT'].includes(order.status)) {
    return res.status(400).json({ error: 'OTP is available after pickup.' });
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  await pool.query('UPDATE deliveries SET otp_hash=$2,updated_at=NOW() WHERE id=$1', [
    order.id,
    await bcrypt.hash(otp, 10)
  ]);

  await addEvent(order.id, 'CUSTOMER_OTP_REQUESTED', null, 'Customer requested delivery OTP.');
  res.json({ message: 'OTP generated. Production version would send SMS.', demoOtp: otp });
});

router.post('/track/:orderNumber/reorder', async (req, res) => {
  const order = await getOrder(req.params.orderNumber);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  if (cleanPhone(req.body.phone) !== cleanPhone(order.customer_phone)) {
    return res.status(403).json({ error: 'Phone does not match.' });
  }

  if (!['PRODUCT_DAMAGED', 'PRODUCT_SPOILT'].includes(order.active_exception)) {
    return res.status(400).json({ error: 'Reorder is only available after damaged/spoilt exception.' });
  }

  const newId = id('DEL');
  const newNo = orderNo();

  await pool.query(
    `INSERT INTO deliveries(id,order_number,customer_name,customer_phone,address,item_description,priority,destination_lat,destination_lng,reorder_of_order_id,created_by,health_reason)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      newId,
      newNo,
      order.customer_name,
      order.customer_phone,
      order.address,
      order.item_description,
      order.priority,
      order.destination_lat,
      order.destination_lng,
      order.id,
      order.created_by,
      `Reorder of ${order.order_number}`
    ]
  );

  await pool.query("UPDATE deliveries SET resolution_status='REORDERED',updated_at=NOW() WHERE id=$1", [order.id]);
  await addEvent(order.id, 'CUSTOMER_REORDERED', null, `Replacement order ${newNo}`);
  emit(req, order.order_number, 'REORDERED');
  res.status(201).json({ newOrderNumber: newNo });
});

router.post('/track/:orderNumber/refund', async (req, res) => {
  const order = await getOrder(req.params.orderNumber);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  if (cleanPhone(req.body.phone) !== cleanPhone(order.customer_phone)) {
    return res.status(403).json({ error: 'Phone does not match.' });
  }

  if (!['PRODUCT_DAMAGED', 'PRODUCT_SPOILT'].includes(order.active_exception)) {
    return res.status(400).json({ error: 'Refund is only available after damaged/spoilt exception.' });
  }

  await pool.query("UPDATE deliveries SET resolution_status='REFUND_REQUESTED',updated_at=NOW() WHERE id=$1", [order.id]);
  await addEvent(order.id, 'CUSTOMER_REFUND_REQUESTED');
  emit(req, order.order_number, 'REFUND_REQUESTED');
  res.json({ message: 'Refund request recorded.' });
});

// ---------- Staff-facing (login required) ----------

router.get('/', requireAuth, async (req, res) => {
  const params = [];
  let where = '';

  if (req.user.role === 'RIDER') {
    where = 'WHERE d.rider_id=$1';
    params.push(req.user.id);
  }

  const r = await pool.query(`${SELECT} ${where} ORDER BY d.created_at DESC`, params);
  res.json(r.rows.map(publicOrder));
});

router.post('/', requireAuth, requireRole('RETAILER'), async (req, res) => {
  const { customerName, customerPhone, address, itemDescription, priority = 'NORMAL', destinationLat, destinationLng } = req.body;

  if (!customerName || !customerPhone || !address || !itemDescription) {
    return res.status(400).json({ error: 'Customer name, phone, address and item are required.' });
  }

  const deliveryId = id('DEL');
  const number = orderNo();

  await pool.query(
    `INSERT INTO deliveries(id,order_number,customer_name,customer_phone,address,item_description,priority,destination_lat,destination_lng,created_by,health_reason)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      deliveryId,
      number,
      customerName,
      customerPhone,
      address,
      itemDescription,
      String(priority).toUpperCase(),
      Number(destinationLat) || null,
      Number(destinationLng) || null,
      req.user.id,
      'Waiting for rider assignment'
    ]
  );

  await addEvent(deliveryId, 'ORDER_CREATED', req.user.id, 'Retailer created delivery.');
  emit(req, number, 'ORDER_CREATED');
  res.status(201).json(publicOrder(await getOrder(number)));
});

// ---------- Dispatcher: assignment ----------

router.post('/:orderNumber/assign', requireAuth, requireRole('DISPATCHER'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const or = await client.query('SELECT * FROM deliveries WHERE order_number=$1 FOR UPDATE', [req.params.orderNumber]);
    const o = or.rows[0];
    if (!o) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found.' });
    }
    if (o.status !== 'CREATED') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Only CREATED orders can be assigned.' });
    }

    const rr = await client.query("SELECT * FROM users WHERE id=$1 AND role='RIDER' FOR UPDATE", [req.body.riderId]);
    const rider = rr.rows[0];
    if (!rider) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Rider not found.' });
    }
    if (rider.availability !== 'AVAILABLE') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Rider is ${rider.availability}.` });
    }

    await client.query(
      "UPDATE deliveries SET rider_id=$2,status='ASSIGNED',current_version=current_version+1,health_reason='Assigned to rider',updated_at=NOW() WHERE id=$1",
      [o.id, rider.id]
    );
    await client.query("UPDATE users SET availability='BUSY' WHERE id=$1", [rider.id]);
    await addEvent(o.id, 'RIDER_ASSIGNED', req.user.id, `Assigned to ${rider.name}`, {}, client);

    await client.query('COMMIT');
    emit(req, o.order_number, 'RIDER_ASSIGNED');
    res.json(publicOrder(await getOrder(o.order_number)));
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ---------- Rider: status updates ----------

router.patch('/:orderNumber/status', requireAuth, requireRole('RIDER'), async (req, res) => {
  const target = String(req.body.status || '').toUpperCase();
  if (!['PICKED_UP', 'IN_TRANSIT'].includes(target)) {
    return res.status(400).json({ error: 'Rider status must be PICKED_UP or IN_TRANSIT.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const r = await client.query('SELECT * FROM deliveries WHERE order_number=$1 FOR UPDATE', [req.params.orderNumber]);
    const o = r.rows[0];
    if (!o) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found.' });
    }
    if (o.rider_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not your order.' });
    }

    // Offline-sync conflict check: if the client's last-known version
    // doesn't match the server's current version, something changed
    // while this rider was offline — flag it instead of silently applying.
    if (Number.isFinite(Number(req.body.baseVersion)) && Number(req.body.baseVersion) !== o.current_version) {
      await client.query(
        'INSERT INTO sync_conflicts(id,event_id,delivery_id,reason,payload) VALUES($1,$2,$3,$4,$5)',
        [
          id('CON'),
          req.body.eventId || null,
          o.id,
          `Client version ${req.body.baseVersion}, server ${o.current_version}`,
          JSON.stringify(req.body)
        ]
      );
      await client.query('COMMIT');
      return res.status(409).json({ error: 'Order changed while offline; conflict flagged.' });
    }

    if (!canTransition(o.status, target)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Invalid transition ${o.status} -> ${target}` });
    }

    await client.query('UPDATE deliveries SET status=$2,current_version=current_version+1,updated_at=NOW() WHERE id=$1', [o.id, target]);
    await addEvent(
      o.id,
      `STATUS_${target}`,
      req.user.id,
      req.body.notes || null,
      {},
      client,
      req.body.eventId || null,
      o.current_version,
      null,
      null,
      req.body.clientTimestamp || null
    );

    await client.query('COMMIT');
    emit(req, o.order_number, `STATUS_${target}`);
    res.json(publicOrder(await getOrder(o.order_number)));
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ---------- Rider: GPS location ----------

router.post('/:orderNumber/location', requireAuth, requireRole('RIDER'), async (req, res) => {
  const lat = Number(req.body.latitude);
  const lng = Number(req.body.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'Valid latitude/longitude required.' });
  }

  const o = await getOrder(req.params.orderNumber);
  if (!o) return res.status(404).json({ error: 'Order not found.' });
  if (o.rider_id !== req.user.id) return res.status(403).json({ error: 'Not your order.' });
  if (!['PICKED_UP', 'IN_TRANSIT'].includes(o.status)) {
    return res.status(409).json({ error: 'GPS begins after pickup.' });
  }

  const ts = new Date(req.body.clientTimestamp || Date.now());

  // Ignore a GPS ping that's older than the last one we already recorded
  // (can happen if queued offline pings arrive out of order).
  if (o.last_location_at && ts <= new Date(o.last_location_at)) {
    await addEvent(
      o.id,
      'LOCATION_IGNORED_STALE',
      req.user.id,
      'Older GPS ignored.',
      {},
      pool,
      req.body.eventId || null,
      o.current_version,
      lat,
      lng,
      ts,
      'IGNORED'
    );
    return res.json({ ignored: true, order: publicOrder(o) });
  }

  const route = await getRouteEstimate(lat, lng, o.destination_lat, o.destination_lng);
  let promised = o.promised_arrival_at;
  if (!promised && route) promised = new Date(Date.now() + route.etaMinutes * 60000);

  const status = o.status === 'PICKED_UP' ? 'IN_TRANSIT' : o.status;

  await pool.query(
    'UPDATE deliveries SET last_lat=$2,last_lng=$3,last_location_at=$4,current_eta_minutes=$5,promised_arrival_at=COALESCE($6,promised_arrival_at),status=$7,current_version=current_version+$8,updated_at=NOW() WHERE id=$1',
    [o.id, lat, lng, ts, route?.etaMinutes || null, promised, status, status !== o.status ? 1 : 0]
  );

  const fresh = await getOrder(o.order_number);
  const h = calculateHealth(fresh);
  await pool.query('UPDATE deliveries SET health_status=$2,health_reason=$3 WHERE id=$1', [o.id, h.status, h.reason]);

  await addEvent(
    o.id,
    'LOCATION_UPDATED',
    req.user.id,
    route ? `ETA ${route.etaMinutes} min` : 'GPS saved',
    route || {},
    pool,
    req.body.eventId || null,
    o.current_version,
    lat,
    lng,
    ts
  );

  emit(req, o.order_number, 'LOCATION_UPDATED');
  res.json({ order: publicOrder(await getOrder(o.order_number)), route, health: h });
});

// ---------- Rider: exceptions ----------

router.post('/:orderNumber/exception', requireAuth, requireRole('RIDER'), async (req, res) => {
  const type = String(req.body.type || '').toUpperCase();
  const allowed = ['CUSTOMER_UNAVAILABLE', 'WRONG_ADDRESS', 'VEHICLE_PROBLEM', 'PRODUCT_DAMAGED', 'PRODUCT_SPOILT', 'DELIVERY_DELAY'];

  if (!allowed.includes(type)) return res.status(400).json({ error: 'Unsupported exception.' });

  const o = await getOrder(req.params.orderNumber);
  if (!o) return res.status(404).json({ error: 'Order not found.' });
  if (o.rider_id !== req.user.id) return res.status(403).json({ error: 'Not your order.' });

  const resolution = ['PRODUCT_DAMAGED', 'PRODUCT_SPOILT'].includes(type) ? 'PENDING_CUSTOMER_DECISION' : 'ACTIVE';

  await pool.query(
    "UPDATE deliveries SET active_exception=$2,resolution_status=$3,health_status='ACTION_NEEDED',health_reason=$4,updated_at=NOW() WHERE id=$1",
    [o.id, type, resolution, `Exception: ${type}`]
  );

  await addEvent(o.id, `EXCEPTION_${type}`, req.user.id, req.body.notes || null);
  emit(req, o.order_number, `EXCEPTION_${type}`);
  res.json(publicOrder(await getOrder(o.order_number)));
});

// ---------- Rider: delivery confirmation (OTP) ----------

router.post('/:orderNumber/confirm', requireAuth, requireRole('RIDER'), async (req, res) => {
  const o = await getOrder(req.params.orderNumber);
  if (!o) return res.status(404).json({ error: 'Order not found.' });
  if (o.rider_id !== req.user.id) return res.status(403).json({ error: 'Not your order.' });
  if (o.active_exception) return res.status(409).json({ error: 'Resolve active exception first.' });
  if (!o.otp_hash) return res.status(400).json({ error: 'Customer has not requested OTP.' });

  if (!(await bcrypt.compare(String(req.body.otp || ''), o.otp_hash))) {
    return res.status(400).json({ error: 'Incorrect OTP.' });
  }

  await pool.query(
    "UPDATE deliveries SET status='DELIVERED',otp_hash=NULL,current_version=current_version+1,health_status='ON_TRACK',health_reason='Delivery completed',updated_at=NOW() WHERE id=$1",
    [o.id]
  );
  await pool.query("UPDATE users SET availability='AVAILABLE' WHERE id=$1", [req.user.id]);
  await addEvent(o.id, 'DELIVERY_CONFIRMED', req.user.id, 'OTP verified; proof saved.');
  emit(req, o.order_number, 'DELIVERED');
  res.json(publicOrder(await getOrder(o.order_number)));
});

// ---------- Retailer/Dispatcher: refund completion ----------

router.post('/:orderNumber/refund/complete', requireAuth, requireRole('RETAILER', 'DISPATCHER'), async (req, res) => {
  const o = await getOrder(req.params.orderNumber);
  if (!o) return res.status(404).json({ error: 'Order not found.' });
  if (o.resolution_status !== 'REFUND_REQUESTED') return res.status(409).json({ error: 'No pending refund.' });

  await pool.query(
    "UPDATE deliveries SET resolution_status='REFUNDED',health_status='ON_TRACK',health_reason='Refund completed',updated_at=NOW() WHERE id=$1",
    [o.id]
  );
  await addEvent(o.id, 'REFUND_COMPLETED', req.user.id, 'Refund marked completed.');
  emit(req, o.order_number, 'REFUND_COMPLETED');
  res.json({ message: 'Refund completed.' });
});

// ---------- Dispatcher: sync conflicts ----------

router.get('/conflicts/open', requireAuth, requireRole('DISPATCHER'), async (req, res) => {
  const r = await pool.query(
    "SELECT c.*,d.order_number FROM sync_conflicts c LEFT JOIN deliveries d ON d.id=c.delivery_id WHERE c.status='OPEN' ORDER BY c.created_at DESC"
  );
  res.json(r.rows);
});

router.patch('/conflicts/:id/resolve', requireAuth, requireRole('DISPATCHER'), async (req, res) => {
  const r = await pool.query("UPDATE sync_conflicts SET status='RESOLVED' WHERE id=$1 RETURNING *", [req.params.id]);
  res.json(r.rows[0] || null);
});

module.exports = router;
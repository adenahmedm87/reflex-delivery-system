CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('RETAILER','DISPATCHER','RIDER')),
  availability TEXT NOT NULL DEFAULT 'OFFLINE' CHECK (availability IN ('AVAILABLE','BUSY','OFFLINE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  address TEXT NOT NULL,
  item_description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL','URGENT','FRAGILE')),
  status TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED','ASSIGNED','PICKED_UP','IN_TRANSIT','DELIVERED','CANCELLED')),
  rider_id TEXT REFERENCES users(id),
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  last_lat DOUBLE PRECISION,
  last_lng DOUBLE PRECISION,
  last_location_at TIMESTAMPTZ,
  current_eta_minutes INTEGER,
  promised_arrival_at TIMESTAMPTZ,
  health_status TEXT NOT NULL DEFAULT 'ON_TRACK' CHECK (health_status IN ('ON_TRACK','AT_RISK','ACTION_NEEDED')),
  health_reason TEXT NOT NULL DEFAULT 'Waiting for assignment',
  active_exception TEXT,
  resolution_status TEXT,
  reorder_of_order_id TEXT REFERENCES deliveries(id),
  otp_hash TEXT,
  current_version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_events (
  id TEXT PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  delivery_id TEXT NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  actor_id TEXT REFERENCES users(id),
  client_timestamp TIMESTAMPTZ,
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  base_version INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED'
);

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id TEXT PRIMARY KEY,
  event_id TEXT,
  delivery_id TEXT REFERENCES deliveries(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','RESOLVED','IGNORED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
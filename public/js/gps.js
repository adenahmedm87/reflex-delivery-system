(function () {
  const token = localStorage.getItem('reflex_token');
  const user = JSON.parse(localStorage.getItem('reflex_user') || 'null');
  const el = document.getElementById('gpsStatus');

  if (!el || user?.role !== 'RIDER') return;

  let watch = null;
  let last = 0;
  const interval = 45000;

  function active() {
    return JSON.parse(localStorage.getItem('reflex_active_order') || 'null');
  }

  async function send(pos) {
    const a = active();
    if (!a) return;

    const now = Date.now();
    if (now - last < interval) return;
    last = now;

    const body = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      clientTimestamp: new Date(pos.timestamp || now).toISOString(),
      eventId: `GPS-${crypto.randomUUID()}`,
      baseVersion: a.version
    };

    try {
      const r = await fetch(`/api/orders/${a.orderNumber}/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const d = await r.json();

      if (!r.ok) {
        throw new Error(d.error);
      }

      const o = d.order;

      if (o) {
        localStorage.setItem(
          'reflex_active_order',
          JSON.stringify({
            orderNumber: o.orderNumber,
            version: o.version,
            status: o.status
          })
        );
      }

      el.textContent =
        `GPS sent. ETA: ${o?.etaMinutes || '?'} min. ` +
        `Health: ${o?.healthStatus || '?'}`;
    } catch (e) {
      el.textContent = `GPS update failed: ${e.message}`;
    }
  }

  function start() {
    if (watch !== null) {
      navigator.geolocation.clearWatch(watch);
    }

    const a = active();

    if (!a || !['PICKED_UP', 'IN_TRANSIT'].includes(a.status)) {
      el.textContent = 'Choose Use GPS for this job after pickup.';
      return;
    }

    if (!navigator.geolocation) {
      el.textContent = 'Browser GPS not supported.';
      return;
    }

    el.textContent = 'Requesting location permission...';

    watch = navigator.geolocation.watchPosition(
      send,
      e => el.textContent = `GPS: ${e.message}`,
      {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 12000
      }
    );
  }

  window.addEventListener('reflex:active', start);
  start();
})();
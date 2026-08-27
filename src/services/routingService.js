const BASE = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';

function rad(v) {
  return v * Math.PI / 180;
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) *
      Math.cos(rad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getRouteEstimate(a, b, c, d) {
  const nums = [a, b, c, d].map(Number);

  if (nums.some(v => !Number.isFinite(v))) {
    return null;
  }

  try {
    const r = await fetch(
      `${BASE}/route/v1/driving/${nums[1]},${nums[0]};${nums[3]},${nums[2]}?overview=false`,
      { signal: AbortSignal.timeout(6000) }
    );

    if (!r.ok) {
      throw new Error('route service unavailable');
    }

    const data = await r.json();
    const route = data.routes?.[0];

    if (!route) {
      throw new Error('no route');
    }

    return {
      etaMinutes: Math.max(1, Math.ceil(route.duration / 60)),
      distanceKm: Number((route.distance / 1000).toFixed(2)),
      source: 'OSRM'
    };
  } catch (e) {
    const km = haversine(...nums) * 1.25;

    return {
      etaMinutes: Math.max(3, Math.ceil(km / 25 * 60)),
      distanceKm: Number(km.toFixed(2)),
      source: 'FALLBACK',
      warning: e.message
    };
  }
}

module.exports = { getRouteEstimate };
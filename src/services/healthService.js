function calculateHealth(d, now = new Date()) {
  if (d.active_exception) {
    return {
      status: 'ACTION_NEEDED',
      reason: `Active exception: ${d.active_exception}`
    };
  }

  if (d.status === 'DELIVERED') {
    return {
      status: 'ON_TRACK',
      reason: 'Delivery completed'
    };
  }

  if (
    d.last_location_at &&
    ['PICKED_UP', 'IN_TRANSIT'].includes(d.status)
  ) {
    const stale =
      (now - new Date(d.last_location_at)) / 60000;

    if (stale > 30) {
      return {
        status: 'ACTION_NEEDED',
        reason: `No rider GPS for ${Math.floor(stale)} min`
      };
    }

    if (stale >= 15) {
      return {
        status: 'AT_RISK',
        reason: `Rider GPS is ${Math.floor(stale)} min old`
      };
    }
  }

  if (
    d.promised_arrival_at &&
    Number.isFinite(Number(d.current_eta_minutes))
  ) {
    const predicted = new Date(
      now.getTime() +
      Number(d.current_eta_minutes) * 60000
    );

    const delay = Math.max(
      0,
      (predicted - new Date(d.promised_arrival_at)) / 60000
    );

    if (delay > 30) {
      return {
        status: 'ACTION_NEEDED',
        reason: `Predicted delay ${Math.round(delay)} min`
      };
    }

    if (delay >= 15) {
      return {
        status: 'AT_RISK',
        reason: `Predicted delay ${Math.round(delay)} min`
      };
    }

    return {
      status: 'ON_TRACK',
      reason: 'Predicted delay under 15 min'
    };
  }

  return {
    status: 'ON_TRACK',
    reason: 'No active risk detected'
  };
}

module.exports = { calculateHealth };
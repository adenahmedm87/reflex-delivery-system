const ALLOWED = {
  CREATED: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: []
};
function canTransition(from, to) { return (ALLOWED[from] || []).includes(to); }
function cleanPhone(v) { return String(v || '').replace(/\D/g, ''); }
function publicOrder(row) {
  return {
    id: row.id, orderNumber: row.order_number, customerName: row.customer_name,
    customerPhone: row.customer_phone, address: row.address, itemDescription: row.item_description,
    priority: row.priority, status: row.status, riderId: row.rider_id,
    riderName: row.rider_name || null, riderPhone: row.rider_phone || null,
    riderAvailability: row.rider_availability || null,
    destinationLat: row.destination_lat, destinationLng: row.destination_lng,
    lastLat: row.last_lat, lastLng: row.last_lng, lastLocationAt: row.last_location_at,
    etaMinutes: row.current_eta_minutes, promisedArrivalAt: row.promised_arrival_at,
    healthStatus: row.health_status, healthReason: row.health_reason,
    activeException: row.active_exception, resolutionStatus: row.resolution_status,
    version: row.current_version, createdAt: row.created_at, updatedAt: row.updated_at
  };
}
module.exports = { canTransition, cleanPhone, publicOrder };
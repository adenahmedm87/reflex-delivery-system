const { calculateHealth } = require('../src/services/healthService');

const now = new Date('2026-01-01T10:00:00Z');
const promised = '2026-01-01T10:20:00Z';

const cases = [
  [34, 'ON_TRACK'],
  [35, 'AT_RISK'],
  [50, 'AT_RISK'],
  [51, 'ACTION_NEEDED']
];

let fail = 0;

for (const [eta, expected] of cases) {
  const got = calculateHealth({
    status: 'IN_TRANSIT',
    active_exception: null,
    last_location_at: now.toISOString(),
    promised_arrival_at: promised,
    current_eta_minutes: eta
  }, now).status;

  console.log(
    got === expected ? 'PASS' : 'FAIL',
    eta - 20,
    'minute delay ->',
    got
  );

  if (got !== expected) fail++;
}

const ex = calculateHealth({
  status: 'IN_TRANSIT',
  active_exception: 'PRODUCT_SPOILT'
}, now).status;

console.log(
  ex === 'ACTION_NEEDED' ? 'PASS' : 'FAIL',
  'exception ->',
  ex
);

if (ex !== 'ACTION_NEEDED') fail++;

if (fail) process.exit(1);
// script.js
// ---- Utilities: logging ----
const $log = document.getElementById('log');
function log(message, tag = '') {
  const el = document.createElement('div');
  el.className = 'line';
  if (tag === 'ok') {
    el.innerHTML = `<span class="tag ok">OK</span> ${escapeHtml(message)}`;
  } else if (tag === 'err') {
    el.innerHTML = `<span class="tag err">ERR</span> ${escapeHtml(message)}`;
  } else {
    el.textContent = message;
  }
  $log.appendChild(el);
  $log.scrollTop = $log.scrollHeight;
}
function clearLog(){ $log.innerHTML = '' }
function escapeHtml(s){ return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

// ---- Simulated async operations ----
// simulate network latency and occasional errors
function fakeNetwork(value, ms = 600, failRate = 0.08) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < failRate) {
        reject(new Error('Network error'));
      } else {
        resolve(value);
      }
    }, ms + Math.round((Math.random() - 0.5) * ms * 0.5));
  });
}

// get train schedule (simulate fetching from server)
function getTrainSchedule(station) {
  log(`Request schedule for ${station}...`);
  const data = {
    station,
    trains: [
      { id: 'T101', depart: '10:00', availSeats: 5 },
      { id: 'T205', depart: '10:30', availSeats: 0 },
      { id: 'T333', depart: '11:15', availSeats: 12 }
    ]
  };
  // return a promise
  return fakeNetwork(data, 700);
}

// book seat on a train - returns booking id when success
function bookSeat(trainId, seats = 1) {
  log(`Attempt booking ${seats} seat(s) on ${trainId}...`);
  // 20% chance to fail due to seat gone or service error
  return fakeNetwork({ bookingId: `${trainId}-${Date.now()}`, status: 'confirmed' }, 900, 0.2);
}

// provider API simulation (for Promise.race)
// each provider resolves with their response time encoded
function provider(name, minMs, maxMs) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => {
    setTimeout(() => resolve({ provider: name, time: delay }), delay);
  });
}

// ---- Examples ----

// 1) Sequential booking flow using async/await
async function runSequentialBooking() {
  clearLog();
  log('--- Sequential booking demo ---');
  try {
    const schedule = await getTrainSchedule('Central');
    log(`Received schedule for ${schedule.station}. Trains: ${schedule.trains.map(t=>t.id).join(', ')}`);

    // pick first train with available seats
    const train = schedule.trains.find(t => t.availSeats > 0);
    if (!train) throw new Error('No seats available');

    // first attempt to book
    const result = await bookSeat(train.id, 1);
    log(`Booking confirmed: ${JSON.stringify(result)}`, 'ok');
  } catch (err) {
    log(`Sequential flow failed: ${err.message}`, 'err');
  }
}

// 2) Parallel fetches with Promise.all
async function runParallelFetch() {
  clearLog();
  log('--- Parallel fetching demo (Promise.all) ---');
  try {
    // fetch schedules for three stations in parallel
    const p1 = getTrainSchedule('Central');
    const p2 = getTrainSchedule('North');
    const p3 = getTrainSchedule('Harbor');

    // Promise.all will reject immediately if any promise rejects
    const results = await Promise.all([p1, p2, p3]);
    results.forEach(r => log(`Got schedule ${r.station} with ${r.trains.length} trains`));
    log('All schedules fetched', 'ok');
  } catch (err) {
    log(`Parallel fetch failed: ${err.message}`, 'err');
  }
}

// 3) Fastest provider using Promise.race
async function runRace() {
  clearLog();
  log('--- Race: fastest provider (Promise.race) ---');
  const pA = provider('ProviderA', 200, 800);
  const pB = provider('ProviderB', 100, 1200);
  const pC = provider('ProviderC', 50, 900);

  try {
    const winner = await Promise.race([pA, pB, pC]);
    log(`Fastest: ${winner.provider} (${winner.time}ms)`, 'ok');
  } catch (err) {
    // rarely will race reject because providers resolve
    log(`Race error: ${err.message}`, 'err');
  }
}

// 4) Retry pattern with async/await and exponential backoff
async function bookWithRetry(trainId, seats = 1, maxAttempts = 3) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      log(`Attempt ${attempt} to book ${seats} seat(s) on ${trainId}`);
      const res = await bookSeat(trainId, seats);
      log(`Booked successfully on attempt ${attempt}: ${JSON.stringify(res)}`, 'ok');
      return res;
    } catch (err) {
      log(`Attempt ${attempt} failed: ${err.message}`, 'err');
      if (attempt >= maxAttempts) {
        throw new Error(`Failed after ${maxAttempts} attempts`);
      }
      const backoff = 300 * Math.pow(2, attempt - 1);
      log(`Waiting ${backoff}ms before retry...`);
      await new Promise(r => setTimeout(r, backoff));
    }
  }
}

// wrapper to demonstrate retry usage
async function runRetryDemo() {
  clearLog();
  log('--- Booking with retry demo ---');
  try {
    // pick an arbitrary train id for demo
    const booking = await bookWithRetry('T101', 1, 4);
    log(`Final booking: ${JSON.stringify(booking)}`, 'ok');
  } catch (err) {
    log(`Retry demo failed: ${err.message}`, 'err');
  }
}

// 5) Example mixing promise chain (.then) with async/await
function exampleMixingThenAndAwait() {
  clearLog();
  log('--- Mixing .then() with async/await ---');

  // use the old style for schedule then await for booking inside an async IIFE
  getTrainSchedule('MixStation')
    .then(schedule => {
      log(`(then) schedule received with trains: ${schedule.trains.map(t=>t.id).join(', ')}`);
      // now use async function inside .then
      (async () => {
        try {
          const res = await bookSeat(schedule.trains[0].id, 1);
          log(`(async inside then) booking ${res.bookingId}`, 'ok');
        } catch (e) {
          log(`(async inside then) booking failed: ${e.message}`, 'err');
        }
      })();
    })
    .catch(err => log(`(then) failed: ${err.message}`, 'err'));
}

// ---- Wire buttons ----
document.getElementById('btn-seq').addEventListener('click', () => runSequentialBooking());
document.getElementById('btn-parallel').addEventListener('click', () => runParallelFetch());
document.getElementById('btn-race').addEventListener('click', () => runRace());
document.getElementById('btn-retry').addEventListener('click', () => runRetryDemo());
document.getElementById('btn-clear').addEventListener('click', () => clearLog());

// run a small example at load to show output
exampleMixingThenAndAwait();

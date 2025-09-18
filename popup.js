/* global SEAT_MAP, parseSeatInput, buildSeatList, fmtTime, fmtHM, getDayOpenRange, isParamOk, validateSeats */
const GO_BTN = document.getElementById('go');
const STATUS = document.getElementById('status');
const PROGRESS_BAR = document.getElementById('progressBar');
const PROGRESS_TEXT = document.getElementById('progressText');
const PROGRESS_WRAPPER = document.getElementById('progressWrapper');

let SID = '';
let RUNNING = false;
let REQ_LIST = []; // Seat IDs to reserve
let REQ_INDEX = 0;
let TOTAL_REQUESTS = 0; // Track total number of requests sent
let LAST_VALID_STATE = 'Ready'; // Save last valid state

// Update clock every second & fetch SID cookie
setInterval(async () => {
  const d = new Date();
  document.getElementById('clock').textContent = d.toLocaleTimeString('zh-CN');
  document.getElementById('week').textContent = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  const rsp = await chrome.runtime.sendMessage({ type: 'GET_SID' });
  SID = (rsp.sid || '').substr(0, 5).toUpperCase();
  document.getElementById('sid').textContent = SID || 'ERROR';
  validate(); // Re-validate when cookie status changes
}, 1000);

// Load user preferences (saved seat numbers per area)
(async () => {
  const st = await chrome.storage.local.get(['prefs']);
  if (st.prefs) {
    const area = document.querySelector('input[name="area"]:checked').value;
    document.getElementById('seats').value = st.prefs[area] || '';
    updatePlaceholder(area);
  }
})();

// Save preferences when input changes
function savePrefs() {
  const area = document.querySelector('input[name="area"]:checked').value;
  const seats = document.getElementById('seats').value;
  chrome.storage.local.get(['prefs']).then(st => {
    const prefs = st.prefs || {};
    prefs[area] = seats;
    chrome.storage.local.set({ prefs });
  });
}

document.querySelectorAll('input[name="area"]').forEach(radio => {
  radio.addEventListener('change', async (e) => {
    const area = e.target.value;
    updatePlaceholder(area);

    // Load saved seats for this area
    const st = await chrome.storage.local.get(['prefs']);
    document.getElementById('seats').value = st.prefs?.[area] || '';

    validate();
  });
});

document.getElementById('seats').addEventListener('input', () => {
  savePrefs();
  validate();
});

function updatePlaceholder(area) {
  document.getElementById('seats').placeholder = `e.g. ${SEAT_MAP[area].example}`;
}

// Time input validation
document.querySelectorAll('.time-input').forEach(input => {
  input.addEventListener('input', function () {
    if (this.value === '') return;

    let value = parseInt(this.value);
    if (isNaN(value)) {
      this.value = 0;
      return;
    }

    // Hour inputs
    if (this.id === 'sh' || this.id === 'eh') {
      if (value < 0) this.value = 0;
      if (value > 23) this.value = 23;
    } else {
      // Minute inputs
      if (value < 0) this.value = 0;
      if (value > 59) this.value = 59;
    }

    validate();
  });

  input.addEventListener('blur', function () {
    if (this.value === '') {
      this.value = 0;
      return;
    }

    let value = parseInt(this.value);
    if (isNaN(value)) {
      this.value = 0;
      return;
    }

    // Hour inputs
    if (this.id === 'sh' || this.id === 'eh') {
      if (value < 0) this.value = 0;
      if (value > 23) this.value = 23;
    } else {
      // Minute inputs
      if (value < 0) this.value = 0;
      if (value > 59) this.value = 59;
    }

    validate();
  });
});

// Auto-adjust time range based on mode (today/next) and day of week
function adjustTimeRange() {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const today = new Date();
  const usageDay = mode === 'next' ? new Date(Date.now() + 864e5) : today;
  const range = getDayOpenRange(usageDay);
  const [oh, om] = range.open;
  const [ch, cm] = range.close;

  if (mode === 'today') {
    const now = today.getHours() * 60 + today.getMinutes();
    const ceil30 = Math.ceil(now / 30) * 30;

    const isFriday = today.getDay() === 5;
    const minStartTime = 8 * 60; // 08:00

    const startTodayMin = Math.max(ceil30, minStartTime);
    const stHour = Math.floor(startTodayMin / 60);
    const stMin = startTodayMin % 60;

    document.getElementById('sh').value = stHour;
    document.getElementById('sm').value = stMin;

    document.getElementById('eh').value = ch;
    document.getElementById('em').value = cm;
  } else {
    const isFriday = usageDay.getDay() === 5;
    if (!isFriday) {
      // Non-Friday: default [08:00, 22:00]
      document.getElementById('sh').value = 8;
      document.getElementById('sm').value = 0;
      document.getElementById('eh').value = 22;
      document.getElementById('em').value = 0;
    } else {
      // Friday: [08:00, 14:00]
      document.getElementById('sh').value = 8;
      document.getElementById('sm').value = 0;
      document.getElementById('eh').value = 14;
      document.getElementById('em').value = 0;
    }
  }

  validate();
}

document.querySelectorAll('input[name="mode"]').forEach(r => r.addEventListener('change', adjustTimeRange));
adjustTimeRange();

// Validate inputs and enable/disable Go button
function validate() {
  // Do not update status while running
  if (RUNNING) {
    return LAST_VALID_STATE === 'Ready';
  }

  const seats = parseSeatInput(document.getElementById('seats').value);
  const area = document.querySelector('input[name="area"]:checked').value;
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const today = new Date();
  const usageDay = mode === 'next' ? new Date(Date.now() + 864e5) : today;

  // Format time inputs to HHMM
  const sh = parseInt(document.getElementById('sh').value) || 0;
  const sm = parseInt(document.getElementById('sm').value) || 0;
  const eh = parseInt(document.getElementById('eh').value) || 0;
  const em = parseInt(document.getElementById('em').value) || 0;

  const startHM = `${sh.toString().padStart(2, '0')}${sm.toString().padStart(2, '0')}`;
  const endHM = `${eh.toString().padStart(2, '0')}${em.toString().padStart(2, '0')}`;

  // Check cookie
  if (!SID) {
    STATUS.textContent = 'Cookie not found';
    STATUS.className = 'status-box err';
    GO_BTN.disabled = true;
    LAST_VALID_STATE = 'Cookie not found';
    return false;
  }

  // Check parameters
  const timeOk = isParamOk(mode, usageDay, startHM, endHM);
  const seatsOk = validateSeats(area, seats);

  if (!timeOk || !seatsOk) {
    STATUS.textContent = 'Parameter error';
    STATUS.className = 'status-box err';
    GO_BTN.disabled = true;
    LAST_VALID_STATE = 'Parameter error';
    return false;
  } else {
    // Only set to Ready if status is empty or in error state
    if (STATUS.textContent === 'Parameter error' || STATUS.textContent === 'Cookie not found' || STATUS.textContent === 'Ready') {
      STATUS.textContent = 'Ready';
      STATUS.className = 'status-box';
    }
    GO_BTN.disabled = false;
    LAST_VALID_STATE = 'Ready';
    return true;
  }
}

document.querySelectorAll('input').forEach(el => {
  if (el.type !== 'radio' || el.name === 'mode' || el.name === 'area') {
    el.addEventListener('input', () => {
      // Only update status if not running
      if (!RUNNING) {
        validate();
      }
    });
  }
});

// Main reservation loop
GO_BTN.addEventListener('click', async () => {
  if (RUNNING) return;
  if (!validate()) return;
  RUNNING = true;
  lockUI(true);
  PROGRESS_WRAPPER.style.display = 'block';
  PROGRESS_BAR.style.width = '0%';
  PROGRESS_TEXT.textContent = '0%';

  addLog('Starting reservation process...');

  const area = document.querySelector('input[name="area"]:checked').value;
  const prefs = parseSeatInput(document.getElementById('seats').value);
  REQ_LIST = buildSeatList(area, prefs);
  REQ_INDEX = 0;
  TOTAL_REQUESTS = 0; // Reset total request counter

  const mode = document.querySelector('input[name="mode"]:checked').value;
  const today = new Date();
  const usageDay = mode === 'next' ? new Date(Date.now() + 864e5) : today;

  // Format time inputs
  const sh = parseInt(document.getElementById('sh').value) || 0;
  const sm = parseInt(document.getElementById('sm').value) || 0;
  const eh = parseInt(document.getElementById('eh').value) || 0;
  const em = parseInt(document.getElementById('em').value) || 0;

  const startHM = `${sh.toString().padStart(2, '0')}${sm.toString().padStart(2, '0')}`;
  const endHM = `${eh.toString().padStart(2, '0')}${em.toString().padStart(2, '0')}`;
  const dateStr = `${usageDay.getFullYear()}-${(usageDay.getMonth() + 1).toString().padStart(2, '0')}-${usageDay.getDate().toString().padStart(2, '0')}`;

  // Precise wait until 18:00 for next-day mode
  if (mode === 'next') {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0, 0).getTime();
    const nowTs = now.getTime();
    if (nowTs < target) {
      const msToTarget = target - nowTs;
      addLog('Waiting until 18:00 to start requests...');
      if (msToTarget > 2000) {
        await sleep(msToTarget - 1000); // Wake ~1s before target
      }
      while (Date.now() < target) {
        await sleep(1); // Fine-grained wait
      }
      addLog(`Start sending requests at ${new Date().toLocaleTimeString('zh-CN')}`);
    }
  }

  // Reservation loop
  while (REQ_INDEX < REQ_LIST.length) {
    const seatId = REQ_LIST[REQ_INDEX];
    const seatName = seatIdToName(seatId);
    addLog(`Try ${seatName} ...`);
    const ok = await sendReserve(seatId, dateStr, startHM, endHM);
    TOTAL_REQUESTS++; // Increment total request counter

    if (ok === true) {
      addLog(`${seatName} SUCCESS`, 'ok');
      break;
    } else if (ok === 'refresh') {
      addLog('Session lost – refresh page', 'err');
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'REFRESH' });
      });
      break;
    } else if (ok === 'retry_from_head') {
      // Server indicates not yet 18:00 – restart from head
      addLog('Server not yet at 18:00 – retry from head', 'err');
      REQ_INDEX = 0;
      updateProgress();
      // Continue immediately to next iteration (will pick REQ_LIST[0])
      // Do not increment REQ_INDEX here
    } else if (ok === 'conflict') {
      // User already has overlapping reservation – stop
      addLog('User already has an overlapping reservation – stop further attempts', 'err');
      break;
    } else {
      addLog(`${seatName} fail: ${ok}`, 'err');
      REQ_INDEX++;
      updateProgress();
    }

    // Space requests ~25ms apart
    await sleep(25);
  }

  if (REQ_INDEX >= REQ_LIST.length) addLog('All seats failed', 'err');
  RUNNING = false;
  lockUI(false);
  GO_BTN.textContent = 'Start reserve';
});

// Helper Functions
function lockUI(lock) {
  [...document.querySelectorAll('input,button')].forEach(el => {
    if (el.id !== 'go') {
      el.disabled = lock;
    }
  });
  GO_BTN.textContent = lock ? 'Reserving...' : 'Start reserve';
  if (lock) addLog('Keep popup open!');
}

function updateProgress() {
  // Use TOTAL_REQUESTS / REQ_LIST.length to calculate progress
  const pct = Math.min(100, Math.floor((TOTAL_REQUESTS / REQ_LIST.length) * 100));
  PROGRESS_BAR.style.width = `${pct}%`;
  PROGRESS_TEXT.textContent = `${pct}%`;
}

function addLog(msg, cls = '') {
  const line = `[${new Date().toLocaleTimeString('zh-CN')}] ${msg}`;
  const div = document.createElement('div');
  div.textContent = line;
  if (cls) div.classList.add(cls);
  STATUS.appendChild(div);
  STATUS.scrollTop = STATUS.scrollHeight;
}

function seatIdToName(id) {
  for (const a of Object.keys(SEAT_MAP)) {
    const r = SEAT_MAP[a];
    if (id >= r.from[0] && id <= r.to[0]) {
      const offset = id - r.from[0];
      const base = r.from[1];
      const prefix = base[0];
      const num = parseInt(base.substr(1)) + offset;
      return `${prefix}${num}`;
    }
  }
  return `ID${id}`;
}

async function sendReserve(devId, day, startHM, endHM) {
  const url = `http://kjyy.ccnu.edu.cn/ClientWeb/pro/ajax/reserve.aspx`;
  const params = new URLSearchParams({
    act: 'set_resv',
    dev_id: devId,
    start: `${day} ${startHM.substr(0, 2)}:${startHM.substr(2, 2)}`,
    end: `${day} ${endHM.substr(0, 2)}:${endHM.substr(2, 2)}`,
    start_time: startHM,
    end_time: endHM
  });
  try {
    const res = await fetch(`${url}?${params}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
    const json = await res.json();
    if (json.ret === 1) return true;
    if (json.ret === -1) return 'refresh';

    // Special handling:
    // If server returns msg containing "[18:00]" -> indicates server time not yet 18:00
    // -> restart from head
    if (typeof json.msg === 'string' && json.msg.indexOf('[18:00]') !== -1) {
      return 'retry_from_head';
    }

    // If server returns "已有预约" (user already has overlapping reservation) -> stop
    if (typeof json.msg === 'string' && json.msg.indexOf('已有预约') !== -1) {
      return 'conflict';
    }

    return json.msg || 'Unknown error';
  } catch (e) {
    return 'Network error';
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
// Scheduler Bench — UI layer.
// All scheduling logic lives in algorithms.js; this file only handles
// rendering and interaction.

const PALETTE = ['--p1', '--p2', '--p3', '--p4', '--p5', '--p6', '--p7', '--p8'];

function colorForPid(pid) {
  const varName = PALETTE[(pid - 1) % PALETTE.length];
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

const ALGO_META = {
  fcfs:     { title: 'FCFS — First-Come-First-Served', run: (procs) => window.Scheduler.fcfs(procs) },
  sjf:      { title: 'SJF — Shortest Job First (non-preemptive)', run: (procs) => window.Scheduler.sjf(procs) },
  priority: { title: 'Priority Scheduling (non-preemptive, with aging)',
              run: (procs, params) => window.Scheduler.priorityScheduling(procs, params.agingInterval) },
  rr:       { title: 'Round Robin', run: (procs, params) => window.Scheduler.roundRobin(procs, params.quantum) },
  mlfq:     { title: 'Multilevel Feedback Queue', run: (procs, params) => window.Scheduler.mlfq(procs, params.quanta) },
};

let state = {
  algo: 'fcfs',
  processes: [
    { pid: 1, arrivalTime: 0, burstTime: 8, priority: 3 },
    { pid: 2, arrivalTime: 1, burstTime: 4, priority: 1 },
    { pid: 3, arrivalTime: 2, burstTime: 9, priority: 4 },
    { pid: 4, arrivalTime: 3, burstTime: 5, priority: 2 },
    { pid: 5, arrivalTime: 4, burstTime: 2, priority: 5 },
    { pid: 6, arrivalTime: 6, burstTime: 6, priority: 1 },
  ],
  params: { quantum: 4, agingInterval: 5, quanta: [4, 8] },
  playInterval: null,
};

let nextPid = 7;

// ---------------------------------------------------------------------
// Process table rendering
// ---------------------------------------------------------------------

function renderProcessTable() {
  const container = document.getElementById('process-table');
  container.querySelectorAll('.process-row:not(.process-row--head)').forEach(el => el.remove());

  for (const p of state.processes) {
    const row = document.createElement('div');
    row.className = 'process-row';
    row.innerHTML = `
      <span class="pid-chip" style="background:${colorForPid(p.pid)}">P${p.pid}</span>
      <input type="number" min="0" value="${p.arrivalTime}" data-field="arrivalTime" data-pid="${p.pid}" aria-label="Arrival time for process ${p.pid}">
      <input type="number" min="1" value="${p.burstTime}" data-field="burstTime" data-pid="${p.pid}" aria-label="Burst time for process ${p.pid}">
      <input type="number" min="0" value="${p.priority}" data-field="priority" data-pid="${p.pid}" aria-label="Priority for process ${p.pid}">
      <button class="row-remove" data-remove="${p.pid}" aria-label="Remove process ${p.pid}">✕</button>
    `;
    container.appendChild(row);
  }

  container.querySelectorAll('input').forEach(input => {
    input.addEventListener('change', (e) => {
      const pid = Number(e.target.dataset.pid);
      const field = e.target.dataset.field;
      const value = Math.max(field === 'burstTime' ? 1 : 0, Number(e.target.value) || 0);
      const proc = state.processes.find(p => p.pid === pid);
      if (proc) proc[field] = value;
    });
  });

  container.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const pid = Number(e.target.dataset.remove);
      state.processes = state.processes.filter(p => p.pid !== pid);
      renderProcessTable();
    });
  });
}

document.getElementById('add-process').addEventListener('click', () => {
  const lastArrival = state.processes.length
    ? Math.max(...state.processes.map(p => p.arrivalTime))
    : 0;
  state.processes.push({ pid: nextPid++, arrivalTime: lastArrival + 1, burstTime: 5, priority: 2 });
  renderProcessTable();
});

// ---------------------------------------------------------------------
// Algorithm-specific parameter inputs
// ---------------------------------------------------------------------

function renderParams() {
  const container = document.getElementById('algo-params');
  container.innerHTML = '';

  if (state.algo === 'rr') {
    container.innerHTML = `
      <div class="param-row">
        <label for="param-quantum">Time quantum</label>
        <input type="number" min="1" id="param-quantum" value="${state.params.quantum}">
      </div>`;
    document.getElementById('param-quantum').addEventListener('change', (e) => {
      state.params.quantum = Math.max(1, Number(e.target.value) || 1);
    });
  } else if (state.algo === 'priority') {
    container.innerHTML = `
      <div class="param-row">
        <label for="param-aging">Aging interval (ticks)</label>
        <input type="number" min="1" id="param-aging" value="${state.params.agingInterval}">
      </div>`;
    document.getElementById('param-aging').addEventListener('change', (e) => {
      state.params.agingInterval = Math.max(1, Number(e.target.value) || 1);
    });
  } else if (state.algo === 'mlfq') {
    container.innerHTML = `
      <div class="param-row">
        <label for="param-q0">Queue 0 quantum</label>
        <input type="number" min="1" id="param-q0" value="${state.params.quanta[0]}">
      </div>
      <div class="param-row">
        <label for="param-q1">Queue 1 quantum</label>
        <input type="number" min="1" id="param-q1" value="${state.params.quanta[1]}">
      </div>
      <p style="font-size:11px;color:var(--text-faint);margin:0;">Queue 2 runs FCFS to completion.</p>`;
    document.getElementById('param-q0').addEventListener('change', (e) => {
      state.params.quanta[0] = Math.max(1, Number(e.target.value) || 1);
    });
    document.getElementById('param-q1').addEventListener('change', (e) => {
      state.params.quanta[1] = Math.max(1, Number(e.target.value) || 1);
    });
  }
}

// ---------------------------------------------------------------------
// Tab switching
// ---------------------------------------------------------------------

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    state.algo = tab.dataset.algo;
    renderParams();
    runScheduler();
  });
});

// ---------------------------------------------------------------------
// Running the scheduler + rendering results
// ---------------------------------------------------------------------

function runScheduler() {
  stopPlayback();
  if (state.processes.length === 0) return;

  const meta = ALGO_META[state.algo];
  const result = meta.run(state.processes, state.params);

  document.getElementById('algo-title').textContent = meta.title;
  renderGantt(result.gantt);
  renderMetrics(result);
  renderComparison();
}

function renderGantt(gantt) {
  const ganttEl = document.getElementById('gantt');
  const rulerEl = document.getElementById('gantt-ruler');
  ganttEl.innerHTML = '';
  rulerEl.innerHTML = '';

  const totalTime = gantt.length ? gantt[gantt.length - 1].end : 1;

  for (const seg of gantt) {
    const widthPct = ((seg.end - seg.start) / totalTime) * 100;
    const block = document.createElement('div');
    block.className = 'gantt-block' + (seg.label === 'idle' ? ' idle' : '');
    block.style.width = widthPct + '%';
    block.textContent = seg.label === 'idle' ? '' : `P${seg.label}`;
    if (seg.label !== 'idle') {
      block.style.background = colorForPid(seg.label);
    }
    block.title = `${seg.label === 'idle' ? 'Idle' : 'P' + seg.label}: t=${seg.start} → t=${seg.end}`;
    ganttEl.appendChild(block);

    const tick = document.createElement('span');
    tick.style.width = widthPct + '%';
    tick.textContent = seg.start;
    rulerEl.appendChild(tick);
  }

  const finalTick = document.createElement('span');
  finalTick.style.width = '0';
  finalTick.style.borderLeft = 'none';
  finalTick.textContent = totalTime;
  rulerEl.appendChild(finalTick);

  state.currentGantt = gantt;
  state.totalTime = totalTime;

  const playhead = document.getElementById('playhead');
  playhead.classList.remove('active');
  playhead.style.left = '0%';
  document.getElementById('core-current').textContent = 'idle';
  document.getElementById('clock-value').textContent = '0';
}

function renderMetrics(result) {
  const tbody = document.getElementById('metrics-body');
  tbody.innerHTML = '';

  for (const p of result.processes) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="pid-cell"><span class="pid-dot" style="background:${colorForPid(p.pid)}"></span>P${p.pid}</td>
      <td>${p.arrivalTime}</td>
      <td>${p.burstTime}</td>
      <td>${p.completionTime}</td>
      <td>${p.waitingTime}</td>
      <td>${p.turnaroundTime}</td>
      <td>${p.responseTime}</td>
    `;
    tbody.appendChild(tr);
  }

  document.getElementById('averages').innerHTML = `
    <div class="avg-item"><span class="avg-label">Avg waiting</span><span class="avg-value">${result.avgWaiting.toFixed(2)}</span></div>
    <div class="avg-item"><span class="avg-label">Avg turnaround</span><span class="avg-value">${result.avgTurnaround.toFixed(2)}</span></div>
    <div class="avg-item"><span class="avg-label">Avg response</span><span class="avg-value">${result.avgResponse.toFixed(2)}</span></div>
  `;
}

function renderComparison() {
  if (state.processes.length === 0) return;
  const container = document.getElementById('compare-chart');
  container.innerHTML = '';

  const allResults = [
    { key: 'fcfs', label: 'FCFS', ...window.Scheduler.fcfs(state.processes) },
    { key: 'sjf', label: 'SJF', ...window.Scheduler.sjf(state.processes) },
    { key: 'priority', label: 'Priority', ...window.Scheduler.priorityScheduling(state.processes, state.params.agingInterval) },
    { key: 'rr', label: `Round Robin`, ...window.Scheduler.roundRobin(state.processes, state.params.quantum) },
    { key: 'mlfq', label: 'MLFQ', ...window.Scheduler.mlfq(state.processes, state.params.quanta) },
  ];

  const maxWaiting = Math.max(...allResults.map(r => r.avgWaiting), 1);

  for (const r of allResults) {
    const row = document.createElement('div');
    row.className = 'compare-row' + (r.key === state.algo ? ' is-current' : '');
    row.innerHTML = `
      <span class="compare-label">${r.label}</span>
      <div class="compare-bar-track"><div class="compare-bar-fill" style="width:${(r.avgWaiting / maxWaiting) * 100}%"></div></div>
      <span class="compare-value">${r.avgWaiting.toFixed(1)}</span>
    `;
    container.appendChild(row);
  }
}

// ---------------------------------------------------------------------
// Playback: scrub the playhead across the Gantt chart in real time
// ---------------------------------------------------------------------

function stopPlayback() {
  if (state.playInterval) {
    clearInterval(state.playInterval);
    state.playInterval = null;
  }
  document.getElementById('play-btn').textContent = '▶';
}

function startPlayback() {
  if (!state.currentGantt || state.currentGantt.length === 0) return;
  const playhead = document.getElementById('playhead');
  playhead.classList.add('active');

  let t = 0;
  const totalTime = state.totalTime;
  const stepMs = Math.max(30, Math.min(200, 1800 / totalTime));

  document.getElementById('play-btn').textContent = '❚❚';

  state.playInterval = setInterval(() => {
    if (t > totalTime) {
      stopPlayback();
      return;
    }
    const pct = (t / totalTime) * 100;
    playhead.style.left = pct + '%';
    document.getElementById('clock-value').textContent = t;

    const activeSeg = state.currentGantt.find(seg => t >= seg.start && t < seg.end);
    document.getElementById('core-current').textContent =
      activeSeg ? (activeSeg.label === 'idle' ? 'idle' : 'P' + activeSeg.label) : 'idle';

    t++;
  }, stepMs);
}

document.getElementById('play-btn').addEventListener('click', () => {
  if (state.playInterval) {
    stopPlayback();
  } else {
    startPlayback();
  }
});

document.getElementById('reset-btn').addEventListener('click', () => {
  stopPlayback();
  const playhead = document.getElementById('playhead');
  playhead.style.left = '0%';
  playhead.classList.remove('active');
  document.getElementById('clock-value').textContent = '0';
  document.getElementById('core-current').textContent = 'idle';
});

document.getElementById('run-btn').addEventListener('click', runScheduler);

// ---------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------

window.Scheduler = { fcfs, sjf, priorityScheduling, roundRobin, mlfq };

renderProcessTable();
renderParams();
runScheduler();

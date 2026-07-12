// Core scheduling algorithm implementations.
// Mirrors the logic of the C++ console version so results match exactly.

function makeProcess(pid, arrivalTime, burstTime, priority = 0) {
  return {
    pid, arrivalTime, burstTime, priority,
    remainingTime: burstTime,
    completionTime: 0, waitingTime: 0, turnaroundTime: 0,
    responseTime: -1, started: false,
  };
}

function computeAverages(processes) {
  const n = processes.length;
  const totalWaiting = processes.reduce((s, p) => s + p.waitingTime, 0);
  const totalTurnaround = processes.reduce((s, p) => s + p.turnaroundTime, 0);
  const totalResponse = processes.reduce((s, p) => s + p.responseTime, 0);
  return {
    avgWaiting: totalWaiting / n,
    avgTurnaround: totalTurnaround / n,
    avgResponse: totalResponse / n,
  };
}

function fcfs(inputProcesses) {
  const processes = inputProcesses.map(p => ({ ...p }))
    .sort((a, b) => a.arrivalTime - b.arrivalTime);
  const gantt = [];
  let clock = 0;

  for (const p of processes) {
    if (clock < p.arrivalTime) {
      gantt.push({ label: 'idle', start: clock, end: p.arrivalTime });
      clock = p.arrivalTime;
    }
    p.responseTime = clock - p.arrivalTime;
    const start = clock;
    clock += p.burstTime;
    p.completionTime = clock;
    p.turnaroundTime = p.completionTime - p.arrivalTime;
    p.waitingTime = p.turnaroundTime - p.burstTime;
    gantt.push({ label: p.pid, start, end: clock });
  }

  return { name: 'FCFS', processes, gantt, ...computeAverages(processes) };
}

function sjf(inputProcesses) {
  let remaining = inputProcesses.map(p => ({ ...p }));
  const gantt = [];
  const finished = [];
  let clock = 0;
  const n = remaining.length;

  while (finished.length < n) {
    let bestIdx = -1;
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].arrivalTime <= clock) {
        if (bestIdx === -1 ||
            remaining[i].burstTime < remaining[bestIdx].burstTime ||
            (remaining[i].burstTime === remaining[bestIdx].burstTime &&
             remaining[i].arrivalTime < remaining[bestIdx].arrivalTime)) {
          bestIdx = i;
        }
      }
    }

    if (bestIdx === -1) {
      const nextArrival = Math.min(...remaining.map(p => p.arrivalTime));
      gantt.push({ label: 'idle', start: clock, end: nextArrival });
      clock = nextArrival;
      continue;
    }

    const p = remaining[bestIdx];
    remaining.splice(bestIdx, 1);

    p.responseTime = clock - p.arrivalTime;
    const start = clock;
    clock += p.burstTime;
    p.completionTime = clock;
    p.turnaroundTime = p.completionTime - p.arrivalTime;
    p.waitingTime = p.turnaroundTime - p.burstTime;
    gantt.push({ label: p.pid, start, end: clock });
    finished.push(p);
  }

  finished.sort((a, b) => a.pid - b.pid);
  return { name: 'SJF', processes: finished, gantt, ...computeAverages(finished) };
}

function priorityScheduling(inputProcesses, agingIntervalTicks = 5) {
  let remaining = inputProcesses.map(p => ({ ...p }));
  let effectivePriority = remaining.map(p => p.priority);
  const gantt = [];
  const finished = [];
  let clock = 0;
  const n = remaining.length;

  while (finished.length < n) {
    let bestIdx = -1;
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].arrivalTime <= clock) {
        if (bestIdx === -1 ||
            effectivePriority[i] < effectivePriority[bestIdx] ||
            (effectivePriority[i] === effectivePriority[bestIdx] &&
             remaining[i].arrivalTime < remaining[bestIdx].arrivalTime)) {
          bestIdx = i;
        }
      }
    }

    if (bestIdx === -1) {
      const nextArrival = Math.min(...remaining.map(p => p.arrivalTime));
      gantt.push({ label: 'idle', start: clock, end: nextArrival });
      clock = nextArrival;
      continue;
    }

    const p = remaining[bestIdx];
    remaining.splice(bestIdx, 1);
    effectivePriority.splice(bestIdx, 1);

    p.responseTime = clock - p.arrivalTime;
    const start = clock;
    clock += p.burstTime;
    p.completionTime = clock;
    p.turnaroundTime = p.completionTime - p.arrivalTime;
    p.waitingTime = p.turnaroundTime - p.burstTime;
    gantt.push({ label: p.pid, start, end: clock });
    finished.push(p);

    for (let i = 0; i < remaining.length; i++) {
      const waited = clock - remaining[i].arrivalTime;
      if (waited > 0 && waited % agingIntervalTicks === 0 && effectivePriority[i] > 0) {
        effectivePriority[i]--;
      }
    }
  }

  finished.sort((a, b) => a.pid - b.pid);
  return { name: 'Priority (aging)', processes: finished, gantt, ...computeAverages(finished) };
}

function roundRobin(inputProcesses, quantum) {
  const procs = inputProcesses.map(p => ({
      ...p,
      remainingTime: p.burstTime,
      completionTime: 0, waitingTime: 0, turnaroundTime: 0,
      responseTime: -1, started: false,
    }))
    .sort((a, b) => a.arrivalTime - b.arrivalTime);
  const n = procs.length;
  const readyQueue = [];
  const gantt = [];
  let clock = 0;
  let completedCount = 0;
  let nextToArrive = 0;

  const admitArrivals = (upToTime) => {
    while (nextToArrive < n && procs[nextToArrive].arrivalTime <= upToTime) {
      readyQueue.push(nextToArrive);
      nextToArrive++;
    }
  };

  admitArrivals(0);
  if (readyQueue.length === 0 && nextToArrive < n) {
    clock = procs[nextToArrive].arrivalTime;
    admitArrivals(clock);
  }

  while (completedCount < n) {
    if (readyQueue.length === 0) {
      const nextArrival = procs[nextToArrive].arrivalTime;
      gantt.push({ label: 'idle', start: clock, end: nextArrival });
      clock = nextArrival;
      admitArrivals(clock);
      continue;
    }

    const idx = readyQueue.shift();
    const p = procs[idx];

    if (!p.started) {
      p.responseTime = clock - p.arrivalTime;
      p.started = true;
    }

    const run = Math.min(quantum, p.remainingTime);
    const start = clock;
    clock += run;
    p.remainingTime -= run;
    gantt.push({ label: p.pid, start, end: clock });

    admitArrivals(clock);

    if (p.remainingTime > 0) {
      readyQueue.push(idx);
    } else {
      p.completionTime = clock;
      p.turnaroundTime = p.completionTime - p.arrivalTime;
      p.waitingTime = p.turnaroundTime - p.burstTime;
      completedCount++;
    }
  }

  procs.sort((a, b) => a.pid - b.pid);
  return { name: `Round Robin (q=${quantum})`, processes: procs, gantt, ...computeAverages(procs) };
}

function mlfq(inputProcesses, quanta = [4, 8]) {
  const procs = inputProcesses.map(p => ({
      ...p,
      remainingTime: p.burstTime,
      completionTime: 0, waitingTime: 0, turnaroundTime: 0,
      responseTime: -1, started: false,
    }))
    .sort((a, b) => a.arrivalTime - b.arrivalTime);
  const n = procs.length;
  const numQueues = quanta.length + 1;
  const queues = Array.from({ length: numQueues }, () => []);
  const gantt = [];
  let clock = 0;
  let completedCount = 0;
  let nextToArrive = 0;

  const admitArrivals = (upToTime) => {
    while (nextToArrive < n && procs[nextToArrive].arrivalTime <= upToTime) {
      queues[0].push(nextToArrive);
      nextToArrive++;
    }
  };

  admitArrivals(0);
  if (nextToArrive < n && queues.every(q => q.length === 0)) {
    clock = procs[nextToArrive].arrivalTime;
    admitArrivals(clock);
  }

  while (completedCount < n) {
    let qIdx = -1;
    for (let i = 0; i < numQueues; i++) {
      if (queues[i].length > 0) { qIdx = i; break; }
    }

    if (qIdx === -1) {
      const nextArrival = procs[nextToArrive].arrivalTime;
      gantt.push({ label: 'idle', start: clock, end: nextArrival });
      clock = nextArrival;
      admitArrivals(clock);
      continue;
    }

    const idx = queues[qIdx].shift();
    const p = procs[idx];

    if (!p.started) {
      p.responseTime = clock - p.arrivalTime;
      p.started = true;
    }

    const sliceQuantum = qIdx < quanta.length ? quanta[qIdx] : p.remainingTime;
    const run = Math.min(sliceQuantum, p.remainingTime);
    const start = clock;
    clock += run;
    p.remainingTime -= run;
    gantt.push({ label: p.pid, queueLevel: qIdx, start, end: clock });

    admitArrivals(clock);

    if (p.remainingTime > 0) {
      const demotedLevel = Math.min(qIdx + 1, numQueues - 1);
      queues[demotedLevel].push(idx);
    } else {
      p.completionTime = clock;
      p.turnaroundTime = p.completionTime - p.arrivalTime;
      p.waitingTime = p.turnaroundTime - p.burstTime;
      completedCount++;
    }
  }

  procs.sort((a, b) => a.pid - b.pid);
  return { name: 'MLFQ', processes: procs, gantt, ...computeAverages(procs) };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { makeProcess, fcfs, sjf, priorityScheduling, roundRobin, mlfq };
}

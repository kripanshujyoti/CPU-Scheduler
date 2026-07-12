#pragma once

#include <algorithm>
#include <deque>
#include <vector>

#include "Process.h"
#include "Report.h"

namespace round_robin {

// Round Robin: each process gets a fixed time quantum on the CPU; if it
// doesn't finish, it goes to the back of the ready queue. Fair and
// responsive (good for interactive systems), but average waiting time can
// be worse than SJF, and throughput drops if the quantum is too small
// (too much context-switch overhead).
inline ScheduleResult run(std::vector<Process> processes, int quantum) {
    std::vector<Process> procs = processes;
    std::sort(procs.begin(), procs.end(),
              [](const Process& a, const Process& b) { return a.arrivalTime < b.arrivalTime; });

    std::deque<int> readyQueue; // indices into procs
    std::vector<GanttEntry> gantt;
    int clock = 0;
    size_t n = procs.size();
    size_t completedCount = 0;
    size_t nextToArrive = 0;

    auto admitArrivals = [&](int upToTime) {
        while (nextToArrive < n && procs[nextToArrive].arrivalTime <= upToTime) {
            readyQueue.push_back(static_cast<int>(nextToArrive));
            nextToArrive++;
        }
    };

    admitArrivals(0);
    if (readyQueue.empty() && nextToArrive < n) {
        clock = procs[nextToArrive].arrivalTime;
        admitArrivals(clock);
    }

    while (completedCount < n) {
        if (readyQueue.empty()) {
            // Nothing ready -- jump forward to the next arrival
            int nextArrival = procs[nextToArrive].arrivalTime;
            gantt.push_back({"idle", clock, nextArrival});
            clock = nextArrival;
            admitArrivals(clock);
            continue;
        }

        int idx = readyQueue.front();
        readyQueue.pop_front();
        Process& p = procs[idx];

        if (!p.started) {
            p.responseTime = clock - p.arrivalTime;
            p.started = true;
        }

        int run = std::min(quantum, p.remainingTime);
        int start = clock;
        clock += run;
        p.remainingTime -= run;
        gantt.push_back({p.label(), start, clock});

        // Newly arrived processes during this slice join the queue before
        // the just-run process (if it still has work left) re-joins --
        // this is the standard Round Robin arrival-ordering convention.
        admitArrivals(clock);

        if (p.remainingTime > 0) {
            readyQueue.push_back(idx);
        } else {
            p.completionTime = clock;
            p.turnaroundTime = p.completionTime - p.arrivalTime;
            p.waitingTime = p.turnaroundTime - p.burstTime;
            completedCount++;
        }
    }

    std::sort(procs.begin(), procs.end(), [](const Process& a, const Process& b) { return a.pid < b.pid; });

    return {"Round Robin (quantum=" + std::to_string(quantum) + ")", procs, gantt};
}

} // namespace round_robin

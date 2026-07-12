#pragma once

#include <algorithm>
#include <deque>
#include <vector>

#include "Process.h"
#include "Report.h"

namespace mlfq {

// Multilevel Feedback Queue: multiple ready queues with increasing time
// quanta (and decreasing priority). New/interactive processes start in the
// top queue and get quick, short slices; CPU-bound processes that don't
// finish in time get demoted to lower, longer-quantum queues. The lowest
// queue runs FCFS. This approximates real OS schedulers (e.g. older Linux,
// Windows) without needing to know burst times in advance.
inline ScheduleResult run(std::vector<Process> processes, std::vector<int> quanta = {4, 8}) {
    std::vector<Process> procs = processes;
    std::sort(procs.begin(), procs.end(),
              [](const Process& a, const Process& b) { return a.arrivalTime < b.arrivalTime; });

    size_t n = procs.size();
    int numQueues = static_cast<int>(quanta.size()) + 1; // last queue = FCFS, unlimited quantum
    std::vector<std::deque<int>> queues(numQueues);       // indices into procs
    std::vector<int> queueLevel(n, 0);                    // which queue each process is currently in

    std::vector<GanttEntry> gantt;
    int clock = 0;
    size_t completedCount = 0;
    size_t nextToArrive = 0;

    auto admitArrivals = [&](int upToTime) {
        while (nextToArrive < n && procs[nextToArrive].arrivalTime <= upToTime) {
            queues[0].push_back(static_cast<int>(nextToArrive));
            nextToArrive++;
        }
    };

    admitArrivals(0);
    if (nextToArrive < n) {
        bool anyReady = false;
        for (auto& q : queues) if (!q.empty()) anyReady = true;
        if (!anyReady) {
            clock = procs[nextToArrive].arrivalTime;
            admitArrivals(clock);
        }
    }

    while (completedCount < n) {
        // Find the highest-priority non-empty queue
        int qIdx = -1;
        for (int i = 0; i < numQueues; ++i) {
            if (!queues[i].empty()) { qIdx = i; break; }
        }

        if (qIdx == -1) {
            int nextArrival = procs[nextToArrive].arrivalTime;
            gantt.push_back({"idle", clock, nextArrival});
            clock = nextArrival;
            admitArrivals(clock);
            continue;
        }

        int idx = queues[qIdx].front();
        queues[qIdx].pop_front();
        Process& p = procs[idx];

        if (!p.started) {
            p.responseTime = clock - p.arrivalTime;
            p.started = true;
        }

        // Last queue is FCFS: run to completion (or until preempted by a
        // higher-priority arrival is intentionally NOT modeled here, to
        // keep the simulation simple and match a standard non-preemptive
        // bottom queue).
        int sliceQuantum = (qIdx < static_cast<int>(quanta.size())) ? quanta[qIdx] : p.remainingTime;
        int run = std::min(sliceQuantum, p.remainingTime);
        int start = clock;
        clock += run;
        p.remainingTime -= run;
        gantt.push_back({p.label() + " (Q" + std::to_string(qIdx) + ")", start, clock});

        admitArrivals(clock);

        if (p.remainingTime > 0) {
            // Demote to the next lower queue (stays in the last queue if already there)
            int demotedLevel = std::min(qIdx + 1, numQueues - 1);
            queueLevel[idx] = demotedLevel;
            queues[demotedLevel].push_back(idx);
        } else {
            p.completionTime = clock;
            p.turnaroundTime = p.completionTime - p.arrivalTime;
            p.waitingTime = p.turnaroundTime - p.burstTime;
            completedCount++;
        }
    }

    std::sort(procs.begin(), procs.end(), [](const Process& a, const Process& b) { return a.pid < b.pid; });

    return {"Multilevel Feedback Queue (MLFQ)", procs, gantt};
}

} // namespace mlfq

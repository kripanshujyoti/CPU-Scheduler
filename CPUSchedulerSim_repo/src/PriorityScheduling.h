#pragma once

#include <algorithm>
#include <climits>
#include <vector>

#include "Process.h"
#include "Report.h"

namespace priority_sched {

// Priority Scheduling (non-preemptive): among arrived processes, always
// pick the one with the lowest priority number (lower = more urgent).
// Includes simple aging: a process's effective priority improves the
// longer it waits, so this implementation avoids indefinite starvation.
inline ScheduleResult run(std::vector<Process> processes, int agingIntervalTicks = 5) {
    std::vector<Process> remaining = processes;
    std::vector<int> effectivePriority;
    for (auto& p : remaining) effectivePriority.push_back(p.priority);

    std::vector<GanttEntry> gantt;
    std::vector<Process> finished;
    int clock = 0;
    size_t n = remaining.size();

    while (finished.size() < n) {
        int bestIdx = -1;
        for (size_t i = 0; i < remaining.size(); ++i) {
            if (remaining[i].arrivalTime <= clock) {
                if (bestIdx == -1 || effectivePriority[i] < effectivePriority[bestIdx] ||
                    (effectivePriority[i] == effectivePriority[bestIdx] &&
                     remaining[i].arrivalTime < remaining[bestIdx].arrivalTime)) {
                    bestIdx = static_cast<int>(i);
                }
            }
        }

        if (bestIdx == -1) {
            int nextArrival = INT_MAX;
            for (auto& p : remaining) nextArrival = std::min(nextArrival, p.arrivalTime);
            gantt.push_back({"idle", clock, nextArrival});
            clock = nextArrival;
            continue;
        }

        Process p = remaining[bestIdx];
        remaining.erase(remaining.begin() + bestIdx);
        effectivePriority.erase(effectivePriority.begin() + bestIdx);

        p.responseTime = clock - p.arrivalTime;
        int start = clock;
        clock += p.burstTime;
        p.completionTime = clock;
        p.turnaroundTime = p.completionTime - p.arrivalTime;
        p.waitingTime = p.turnaroundTime - p.burstTime;
        gantt.push_back({p.label(), start, clock});
        finished.push_back(p);

        // Aging: every agingIntervalTicks of simulated time that pass, bump
        // the effective priority of everyone still waiting so nobody with a
        // low (unlucky) priority number waits forever behind urgent arrivals.
        for (size_t i = 0; i < remaining.size(); ++i) {
            int waited = clock - remaining[i].arrivalTime;
            if (waited > 0 && waited % agingIntervalTicks == 0 && effectivePriority[i] > 0) {
                effectivePriority[i]--;
            }
        }
    }

    std::sort(finished.begin(), finished.end(), [](const Process& a, const Process& b) { return a.pid < b.pid; });

    return {"Priority Scheduling (non-preemptive, with aging)", finished, gantt};
}

} // namespace priority_sched

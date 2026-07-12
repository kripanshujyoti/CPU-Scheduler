#pragma once

#include <algorithm>
#include <climits>
#include <vector>

#include "Process.h"
#include "Report.h"

namespace sjf {

// Shortest Job First (non-preemptive): among all processes that have
// arrived, always pick the one with the smallest burst time next.
// Minimizes average waiting time among non-preemptive algorithms, but
// can starve long processes if short ones keep arriving.
inline ScheduleResult run(std::vector<Process> processes) {
    std::vector<Process> remaining = processes;
    std::vector<GanttEntry> gantt;
    std::vector<Process> finished;
    int clock = 0;
    size_t n = remaining.size();

    while (finished.size() < n) {
        // Candidates that have arrived and are not yet scheduled
        int bestIdx = -1;
        for (size_t i = 0; i < remaining.size(); ++i) {
            if (remaining[i].arrivalTime <= clock) {
                if (bestIdx == -1 || remaining[i].burstTime < remaining[bestIdx].burstTime ||
                    (remaining[i].burstTime == remaining[bestIdx].burstTime &&
                     remaining[i].arrivalTime < remaining[bestIdx].arrivalTime)) {
                    bestIdx = static_cast<int>(i);
                }
            }
        }

        if (bestIdx == -1) {
            // No process has arrived yet -- CPU is idle until the next arrival
            int nextArrival = INT_MAX;
            for (auto& p : remaining) nextArrival = std::min(nextArrival, p.arrivalTime);
            gantt.push_back({"idle", clock, nextArrival});
            clock = nextArrival;
            continue;
        }

        Process p = remaining[bestIdx];
        remaining.erase(remaining.begin() + bestIdx);

        p.responseTime = clock - p.arrivalTime;
        int start = clock;
        clock += p.burstTime;
        p.completionTime = clock;
        p.turnaroundTime = p.completionTime - p.arrivalTime;
        p.waitingTime = p.turnaroundTime - p.burstTime;
        gantt.push_back({p.label(), start, clock});
        finished.push_back(p);
    }

    // Report processes in original pid order for readability
    std::sort(finished.begin(), finished.end(), [](const Process& a, const Process& b) { return a.pid < b.pid; });

    return {"SJF (Shortest Job First, non-preemptive)", finished, gantt};
}

} // namespace sjf

#pragma once

#include <algorithm>
#include <vector>

#include "Process.h"
#include "Report.h"

namespace fcfs {

// First-Come-First-Served: simplest possible algorithm, processes run in
// strict arrival order, non-preemptive. Simple but suffers from the
// "convoy effect" -- a long process at the front delays everyone behind it.
inline ScheduleResult run(std::vector<Process> processes) {
    std::sort(processes.begin(), processes.end(),
              [](const Process& a, const Process& b) { return a.arrivalTime < b.arrivalTime; });

    std::vector<GanttEntry> gantt;
    int clock = 0;

    for (auto& p : processes) {
        if (clock < p.arrivalTime) {
            gantt.push_back({"idle", clock, p.arrivalTime});
            clock = p.arrivalTime;
        }
        p.responseTime = clock - p.arrivalTime;
        int start = clock;
        clock += p.burstTime;
        p.completionTime = clock;
        p.turnaroundTime = p.completionTime - p.arrivalTime;
        p.waitingTime = p.turnaroundTime - p.burstTime;
        gantt.push_back({p.label(), start, clock});
    }

    return {"FCFS (First-Come-First-Served)", processes, gantt};
}

} // namespace fcfs

#pragma once

#include <iomanip>
#include <iostream>
#include <string>
#include <vector>

#include "Process.h"

// A single contiguous slice where one process occupies the CPU.
struct GanttEntry {
    std::string label; // process label, or "idle"
    int start;
    int end;
};

// Result of running one scheduling algorithm over a process set.
struct ScheduleResult {
    std::string algorithmName;
    std::vector<Process> processes;   // processes with computed metrics filled in
    std::vector<GanttEntry> gantt;
};

namespace report {

inline void printGanttChart(const std::vector<GanttEntry>& gantt) {
    // Top border of labels
    std::cout << "| ";
    for (auto& e : gantt) {
        std::cout << std::setw(6) << std::left << e.label << " | ";
    }
    std::cout << "\n";

    // Timeline of start times, plus the final end time
    std::cout << "0";
    for (auto& e : gantt) {
        int width = 10; // roughly matches the column width above
        std::cout << std::right << std::setw(width) << e.end;
    }
    std::cout << "\n";
}

inline void printMetricsTable(const ScheduleResult& result) {
    std::cout << "\n--- " << result.algorithmName << " ---\n";
    std::cout << std::left << std::setw(6) << "PID"
               << std::setw(10) << "Arrival"
               << std::setw(8) << "Burst"
               << std::setw(10) << "Complete"
               << std::setw(10) << "Waiting"
               << std::setw(12) << "Turnaround"
               << std::setw(10) << "Response" << "\n";

    double totalWaiting = 0, totalTurnaround = 0, totalResponse = 0;
    for (const auto& p : result.processes) {
        std::cout << std::left << std::setw(6) << p.label()
                   << std::setw(10) << p.arrivalTime
                   << std::setw(8) << p.burstTime
                   << std::setw(10) << p.completionTime
                   << std::setw(10) << p.waitingTime
                   << std::setw(12) << p.turnaroundTime
                   << std::setw(10) << p.responseTime << "\n";
        totalWaiting += p.waitingTime;
        totalTurnaround += p.turnaroundTime;
        totalResponse += p.responseTime;
    }

    size_t n = result.processes.size();
    std::cout << std::fixed << std::setprecision(2);
    std::cout << "Average Waiting Time:    " << (totalWaiting / n) << "\n";
    std::cout << "Average Turnaround Time: " << (totalTurnaround / n) << "\n";
    std::cout << "Average Response Time:   " << (totalResponse / n) << "\n";

    std::cout << "\nGantt Chart:\n";
    printGanttChart(result.gantt);
}

} // namespace report

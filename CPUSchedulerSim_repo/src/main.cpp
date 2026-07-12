// CPU Scheduling Algorithm Simulator
//
// Implements and compares five classic CPU scheduling algorithms:
//   1. FCFS (First-Come-First-Served)
//   2. SJF (Shortest Job First, non-preemptive)
//   3. Priority Scheduling (non-preemptive, with aging to prevent starvation)
//   4. Round Robin (preemptive, fixed time quantum)
//   5. MLFQ (Multilevel Feedback Queue)
//
// For each algorithm, prints a per-process metrics table (waiting time,
// turnaround time, response time) plus a text Gantt chart, and a final
// summary comparing average waiting/turnaround time across all algorithms.
//
// Build: g++ -std=c++17 -O2 -Wall -o cpu_scheduler src/main.cpp
// Run:   ./cpu_scheduler

#include <iomanip>
#include <iostream>
#include <vector>

#include "FCFS.h"
#include "MLFQ.h"
#include "Process.h"
#include "PriorityScheduling.h"
#include "Report.h"
#include "RoundRobin.h"
#include "SJF.h"

namespace {

// A fixed sample workload. Feel free to edit these values (or wire up
// stdin/file input) to experiment with different arrival patterns.
std::vector<Process> sampleProcesses() {
    return {
        // pid, arrivalTime, burstTime, priority (lower = more urgent)
        Process(1, 0, 8, 3),
        Process(2, 1, 4, 1),
        Process(3, 2, 9, 4),
        Process(4, 3, 5, 2),
        Process(5, 4, 2, 5),
        Process(6, 6, 6, 1),
    };
}

void printSummaryTable(const std::vector<ScheduleResult>& results) {
    std::cout << "\n\n===== Algorithm Comparison Summary =====\n";
    std::cout << std::left << std::setw(40) << "Algorithm"
               << std::setw(15) << "Avg Waiting"
               << std::setw(15) << "Avg Turnaround"
               << std::setw(15) << "Avg Response" << "\n";

    for (const auto& r : results) {
        double totalWaiting = 0, totalTurnaround = 0, totalResponse = 0;
        for (const auto& p : r.processes) {
            totalWaiting += p.waitingTime;
            totalTurnaround += p.turnaroundTime;
            totalResponse += p.responseTime;
        }
        size_t n = r.processes.size();
        std::cout << std::left << std::setw(40) << r.algorithmName
                   << std::fixed << std::setprecision(2)
                   << std::setw(15) << (totalWaiting / n)
                   << std::setw(15) << (totalTurnaround / n)
                   << std::setw(15) << (totalResponse / n) << "\n";
    }
    std::cout << "==========================================\n";
}

} // namespace

int main() {
    std::vector<Process> processes = sampleProcesses();

    std::cout << "CPU Scheduling Algorithm Simulator\n";
    std::cout << "Workload: " << processes.size() << " processes\n";
    std::cout << std::left << std::setw(6) << "PID" << std::setw(10) << "Arrival"
               << std::setw(8) << "Burst" << std::setw(10) << "Priority" << "\n";
    for (const auto& p : processes) {
        std::cout << std::left << std::setw(6) << p.label() << std::setw(10) << p.arrivalTime
                   << std::setw(8) << p.burstTime << std::setw(10) << p.priority << "\n";
    }

    std::vector<ScheduleResult> results;

    results.push_back(fcfs::run(processes));
    results.push_back(sjf::run(processes));
    results.push_back(priority_sched::run(processes, /*agingIntervalTicks=*/5));
    results.push_back(round_robin::run(processes, /*quantum=*/4));
    results.push_back(mlfq::run(processes, /*quanta=*/{4, 8}));

    for (const auto& r : results) {
        report::printMetricsTable(r);
        std::cout << "\n";
    }

    printSummaryTable(results);

    return 0;
}

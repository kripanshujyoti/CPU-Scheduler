#pragma once

#include <string>

// Represents a single process to be scheduled by the CPU.
struct Process {
    int pid;
    int arrivalTime;
    int burstTime;      // total CPU time needed
    int priority;        // lower number = higher priority (used by Priority Scheduling)

    // Fields filled in / mutated by the scheduling algorithms:
    int remainingTime;   // used by preemptive algorithms (Round Robin, SRTF)
    int completionTime;
    int waitingTime;
    int turnaroundTime;
    int responseTime;    // time from arrival to first time it gets the CPU
    bool started;

    Process(int pid_, int arrivalTime_, int burstTime_, int priority_ = 0)
        : pid(pid_),
          arrivalTime(arrivalTime_),
          burstTime(burstTime_),
          priority(priority_),
          remainingTime(burstTime_),
          completionTime(0),
          waitingTime(0),
          turnaroundTime(0),
          responseTime(-1),
          started(false) {}

    std::string label() const { return "P" + std::to_string(pid); }
};

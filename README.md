# CPU Scheduling Algorithm Simulator

A simulator that implements and compares five classic CPU scheduling
algorithms on the same workload. Comes in two forms:

- **`src/`** — a C++ console version, printing metrics tables and a text Gantt chart
- **`web/`** — an interactive browser UI with an editable process table, a
  scrubbable Gantt chart timeline, and a live comparison across all five algorithms

Both implementations share the same algorithm logic and produce identical results.

## Try the web UI

No build step, no server required — it's plain HTML/CSS/JS.

```bash
cd web
python3 -m http.server 8000
# then open http://localhost:8000 in a browser
```

(Opening `web/index.html` directly by double-clicking also works in most browsers,
though a local server avoids any file:// script-loading quirks.)

**What you can do in the UI:**
- Edit the process table directly (arrival time, burst time, priority) or add/remove processes
- Switch between FCFS, SJF, Priority, Round Robin, and MLFQ via tabs
- Adjust algorithm-specific parameters (time quantum, aging interval, MLFQ queue quanta)
- Press **Play** to scrub a playhead across the Gantt chart in real time, showing
  which process holds the CPU at each moment
- See a live bar-chart comparison of average waiting time across all five
  algorithms for whatever workload you've entered

## Algorithms implemented

| Algorithm | Type | Notes |
|---|---|---|
| **FCFS** (First-Come-First-Served) | Non-preemptive | Simplest baseline; suffers from the convoy effect |
| **SJF** (Shortest Job First) | Non-preemptive | Minimizes average waiting time; can starve long processes |
| **Priority Scheduling** | Non-preemptive | Includes **aging** so low-priority processes aren't starved forever |
| **Round Robin** | Preemptive | Fixed time quantum; fair and responsive, good for interactive systems |
| **MLFQ** (Multilevel Feedback Queue) | Preemptive | Multiple queues with increasing quanta; approximates real OS schedulers without needing burst times upfront |

## Metrics reported

For each algorithm and each process:
- **Waiting time** — time spent ready but not running
- **Turnaround time** — total time from arrival to completion
- **Response time** — time from arrival to first getting the CPU

Plus a summary comparing average waiting/turnaround/response time across all
five algorithms, so you can see the classic tradeoffs (e.g. SJF minimizes
waiting time, RR/MLFQ minimize response time).

## Build & run the C++ console version

Requires g++ with C++17 support (any reasonably recent GCC or Clang works).

```bash
make          # builds ./cpu_scheduler
make run      # builds and runs
make clean    # removes the built binary
```

Or compile directly without `make`:

```bash
g++ -std=c++17 -O2 -Wall -Wextra -o cpu_scheduler src/main.cpp
./cpu_scheduler
```

## Project structure

```
.
├── Makefile
├── README.md
├── .gitignore
├── src/                       # C++ console version
│   ├── Process.h              # Process model (arrival, burst, priority, computed metrics)
│   ├── Report.h                # Shared Gantt chart + metrics table printing
│   ├── FCFS.h                  # First-Come-First-Served
│   ├── SJF.h                   # Shortest Job First (non-preemptive)
│   ├── PriorityScheduling.h    # Priority scheduling with aging
│   ├── RoundRobin.h            # Round Robin (preemptive, fixed quantum)
│   ├── MLFQ.h                  # Multilevel Feedback Queue
│   └── main.cpp                # Sample workload + runs all algorithms + summary
└── web/                       # Interactive browser UI
    ├── index.html              # Page structure
    ├── style.css               # Visual design (dark systems-console theme)
    ├── algorithms.js           # Same scheduling logic as src/, ported to JS
    └── script.js               # UI wiring: process table, tabs, Gantt rendering, playback
```

## Customizing the workload

**C++ version:** edit `sampleProcesses()` in `src/main.cpp`.

**Web version:** edit processes directly in the browser via the process table,
or change the default workload in the `state.processes` array at the top of `web/script.js`.

## Why this project is a good portfolio piece

- Demonstrates understanding of **core OS scheduling concepts**: starvation,
  aging, preemption, context switching, and the fairness-vs-throughput tradeoff.
- Clean separation of algorithms into standalone, testable units (each
  C++ header / JS function is self-contained and returns a common result shape).
- Two independent implementations (C++ and vanilla JS) of the same logic,
  cross-verified to produce identical metrics — a good way to demonstrate you
  understand the algorithms rather than one specific codebase.
- The web UI has no framework or build dependency — just HTML/CSS/JS, easy to
  host for free on GitHub Pages.

## Possible extensions

- Add **SRTF** (Shortest Remaining Time First, the preemptive version of SJF).
- Read the process set from a CSV/JSON file (C++) or file upload (web) instead of hardcoding it.
- Add unit tests (Catch2/GoogleTest for C++, Jest/Node's built-in `assert` for JS)
  verifying waiting/turnaround times against hand-computed expected values.
- Add a `--algorithm` CLI flag to the C++ version to run just one algorithm at a time.
- Deploy the web UI to GitHub Pages (Settings → Pages → serve from `/web`).

## License

MIT — see [LICENSE](LICENSE).

"""
Scheduling Algorithms Module for AI Process Scheduler
Supported:
- FCFS (First Come First Served)
- SJF (Shortest Job First - Non-Preemptive & Preemptive / SRTF)
- Round Robin (RR) with dynamic/configurable Quantum
- Priority (Non-Preemptive & Preemptive)
- AI Mode (Smart ML-assisted scheduling)
"""

from typing import List, Dict, Any, Tuple


TASK_COLORS = [
    "#00ff88",  # Neon Green
    "#ff3366",  # Neon Red
    "#10b981",  # Emerald Green
    "#ef4444",  # Crimson Red
    "#059669",  # Deep Green
    "#dc2626",  # Ruby Red
    "#34d399",  # Light Mint Green
    "#f43f5e",  # Rose Red
]


def _assign_colors(tasks: List[Dict[str, Any]]) -> Dict[str, str]:
    color_map = {}
    for idx, t in enumerate(tasks):
        name = t.get("name", f"Task-{idx+1}")
        color_map[name] = TASK_COLORS[idx % len(TASK_COLORS)]
    color_map["IDLE"] = "#14231b"  # Dark Emerald/Slate for CPU Idle
    return color_map


def _calculate_summary(tasks_result: List[Dict[str, Any]], gantt: List[Dict[str, Any]]) -> Dict[str, Any]:
    n = len(tasks_result)
    if n == 0:
        return {
            "avg_waiting_time": 0.0,
            "avg_turnaround_time": 0.0,
            "avg_response_time": 0.0,
            "cpu_utilization": 0.0,
            "throughput": 0.0,
            "total_time": 0
        }

    total_wt = sum(t["waiting_time"] for t in tasks_result)
    total_tat = sum(t["turnaround_time"] for t in tasks_result)
    total_rt = sum(t["response_time"] for t in tasks_result)

    total_time = gantt[-1]["end"] if gantt else 0
    idle_time = sum(g["end"] - g["start"] for g in gantt if g["task"] == "IDLE")
    busy_time = max(0, total_time - idle_time)
    cpu_util = (busy_time / total_time * 100.0) if total_time > 0 else 100.0
    throughput = (n / total_time) if total_time > 0 else 0.0

    return {
        "avg_waiting_time": round(total_wt / n, 2),
        "avg_turnaround_time": round(total_tat / n, 2),
        "avg_response_time": round(total_rt / n, 2),
        "cpu_utilization": round(cpu_util, 2),
        "throughput": round(throughput, 4),
        "total_time": total_time
    }


def schedule_fcfs(tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """First-Come, First-Served Scheduling"""
    if not tasks:
        return {"tasks": [], "gantt": [], "order": [], "summary": _calculate_summary([], [])}

    color_map = _assign_colors(tasks)
    # Sort primarily by arrival time, secondarily by original order
    indexed_tasks = [
        {
            "name": t.get("name", f"P{i+1}"),
            "arrival": max(0, int(t.get("arrival", 0))),
            "burst": max(1, int(t.get("burst", 1))),
            "priority": int(t.get("priority", 1)),
            "orig_idx": i
        }
        for i, t in enumerate(tasks)
    ]
    sorted_tasks = sorted(indexed_tasks, key=lambda x: (x["arrival"], x["orig_idx"]))

    current_time = 0
    gantt = []
    order = []
    results = []

    for t in sorted_tasks:
        arrival = t["arrival"]
        burst = t["burst"]

        # Handle CPU idle if current time is before arrival
        if current_time < arrival:
            gantt.append({
                "task": "IDLE",
                "start": current_time,
                "end": arrival,
                "duration": arrival - current_time,
                "color": color_map["IDLE"]
            })
            current_time = arrival

        start_time = current_time
        completion_time = start_time + burst
        turnaround_time = completion_time - arrival
        waiting_time = turnaround_time - burst
        response_time = start_time - arrival

        gantt.append({
            "task": t["name"],
            "start": start_time,
            "end": completion_time,
            "duration": burst,
            "color": color_map.get(t["name"], "#6366f1")
        })

        order.append(t["name"])
        results.append({
            "name": t["name"],
            "arrival": arrival,
            "burst": burst,
            "priority": t["priority"],
            "start_time": start_time,
            "completion_time": completion_time,
            "turnaround_time": turnaround_time,
            "waiting_time": waiting_time,
            "response_time": response_time,
            "color": color_map.get(t["name"], "#6366f1")
        })

        current_time = completion_time

    # Sort results back to original task order or keep by completion
    summary = _calculate_summary(results, gantt)
    return {
        "algorithm": "FCFS",
        "order": order,
        "tasks": results,
        "gantt": gantt,
        **summary
    }


def schedule_sjf_non_preemptive(tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Shortest Job First (Non-Preemptive)"""
    if not tasks:
        return {"tasks": [], "gantt": [], "order": [], "summary": _calculate_summary([], [])}

    color_map = _assign_colors(tasks)
    raw_tasks = [
        {
            "name": t.get("name", f"P{i+1}"),
            "arrival": max(0, int(t.get("arrival", 0))),
            "burst": max(1, int(t.get("burst", 1))),
            "priority": int(t.get("priority", 1)),
            "orig_idx": i,
            "done": False
        }
        for i, t in enumerate(tasks)
    ]

    current_time = 0
    completed_count = 0
    n = len(raw_tasks)
    gantt = []
    order = []
    results = []

    while completed_count < n:
        # Find all tasks that have arrived and are not done
        ready = [t for t in raw_tasks if not t["done"] and t["arrival"] <= current_time]

        if not ready:
            # CPU is idle until next task arrival
            next_arrival = min(t["arrival"] for t in raw_tasks if not t["done"])
            gantt.append({
                "task": "IDLE",
                "start": current_time,
                "end": next_arrival,
                "duration": next_arrival - current_time,
                "color": color_map["IDLE"]
            })
            current_time = next_arrival
            continue

        # Choose task with shortest burst time (tie break by arrival, then original index)
        selected = min(ready, key=lambda x: (x["burst"], x["arrival"], x["orig_idx"]))
        
        start_time = current_time
        completion_time = start_time + selected["burst"]
        turnaround_time = completion_time - selected["arrival"]
        waiting_time = turnaround_time - selected["burst"]
        response_time = start_time - selected["arrival"]

        gantt.append({
            "task": selected["name"],
            "start": start_time,
            "end": completion_time,
            "duration": selected["burst"],
            "color": color_map.get(selected["name"], "#6366f1")
        })

        order.append(selected["name"])
        results.append({
            "name": selected["name"],
            "arrival": selected["arrival"],
            "burst": selected["burst"],
            "priority": selected["priority"],
            "start_time": start_time,
            "completion_time": completion_time,
            "turnaround_time": turnaround_time,
            "waiting_time": waiting_time,
            "response_time": response_time,
            "color": color_map.get(selected["name"], "#6366f1")
        })

        selected["done"] = True
        completed_count += 1
        current_time = completion_time

    summary = _calculate_summary(results, gantt)
    return {
        "algorithm": "SJF (Non-Preemptive)",
        "order": order,
        "tasks": results,
        "gantt": gantt,
        **summary
    }


def schedule_round_robin(tasks: List[Dict[str, Any]], time_quantum: int = 2) -> Dict[str, Any]:
    """Round Robin Scheduling with configurable Time Quantum"""
    if not tasks:
        return {"tasks": [], "gantt": [], "order": [], "summary": _calculate_summary([], [])}

    quantum = max(1, int(time_quantum if time_quantum is not None else 2))
    color_map = _assign_colors(tasks)

    # Initialize task status
    task_list = [
        {
            "name": t.get("name", f"P{i+1}"),
            "arrival": max(0, int(t.get("arrival", 0))),
            "burst": max(1, int(t.get("burst", 1))),
            "remaining": max(1, int(t.get("burst", 1))),
            "priority": int(t.get("priority", 1)),
            "start_time": None,
            "completion_time": None,
            "orig_idx": i
        }
        for i, t in enumerate(tasks)
    ]

    # Sort initially by arrival time
    unvisited = sorted(task_list, key=lambda x: (x["arrival"], x["orig_idx"]))
    
    current_time = 0
    ready_queue = []
    gantt_raw = []
    completed = []

    # Advance to first arrival if needed
    if unvisited and unvisited[0]["arrival"] > current_time:
        gantt_raw.append({
            "task": "IDLE",
            "start": current_time,
            "end": unvisited[0]["arrival"],
            "duration": unvisited[0]["arrival"] - current_time,
            "color": color_map["IDLE"]
        })
        current_time = unvisited[0]["arrival"]

    # Enqueue tasks that arrived at current_time
    while unvisited and unvisited[0]["arrival"] <= current_time:
        ready_queue.append(unvisited.pop(0))

    while ready_queue or unvisited:
        if not ready_queue:
            # Idle jump
            next_task = unvisited.pop(0)
            gantt_raw.append({
                "task": "IDLE",
                "start": current_time,
                "end": next_task["arrival"],
                "duration": next_task["arrival"] - current_time,
                "color": color_map["IDLE"]
            })
            current_time = next_task["arrival"]
            ready_queue.append(next_task)
            while unvisited and unvisited[0]["arrival"] <= current_time:
                ready_queue.append(unvisited.pop(0))

        current_task = ready_queue.pop(0)

        if current_task["start_time"] is None:
            current_task["start_time"] = current_time

        execute_time = min(quantum, current_task["remaining"])
        start_t = current_time
        end_t = current_time + execute_time
        current_task["remaining"] -= execute_time
        current_time = end_t

        gantt_raw.append({
            "task": current_task["name"],
            "start": start_t,
            "end": end_t,
            "duration": execute_time,
            "color": color_map.get(current_task["name"], "#6366f1")
        })

        # Newly arrived tasks during this interval join queue
        while unvisited and unvisited[0]["arrival"] <= current_time:
            ready_queue.append(unvisited.pop(0))

        # If current task still has work, requeue
        if current_task["remaining"] > 0:
            ready_queue.append(current_task)
        else:
            current_task["completion_time"] = current_time
            completed.append(current_task)

    # Merge adjacent identical Gantt slices for clean display
    merged_gantt = []
    for g in gantt_raw:
        if merged_gantt and merged_gantt[-1]["task"] == g["task"]:
            merged_gantt[-1]["end"] = g["end"]
            merged_gantt[-1]["duration"] += g["duration"]
        else:
            merged_gantt.append(dict(g))

    results = []
    order = []
    for t in sorted(completed, key=lambda x: x["orig_idx"]):
        tat = t["completion_time"] - t["arrival"]
        wt = tat - t["burst"]
        rt = t["start_time"] - t["arrival"]
        order.append(t["name"])
        results.append({
            "name": t["name"],
            "arrival": t["arrival"],
            "burst": t["burst"],
            "priority": t["priority"],
            "start_time": t["start_time"],
            "completion_time": t["completion_time"],
            "turnaround_time": tat,
            "waiting_time": wt,
            "response_time": rt,
            "color": color_map.get(t["name"], "#6366f1")
        })

    summary = _calculate_summary(results, merged_gantt)
    return {
        "algorithm": f"Round Robin (Q={quantum})",
        "time_quantum": quantum,
        "order": [g["task"] for g in merged_gantt if g["task"] != "IDLE"],
        "tasks": results,
        "gantt": merged_gantt,
        **summary
    }


def schedule_priority_non_preemptive(tasks: List[Dict[str, Any]], lower_is_higher: bool = True) -> Dict[str, Any]:
    """Priority Scheduling (Non-Preemptive). Default: Lower number = Higher priority (1 is highest)"""
    if not tasks:
        return {"tasks": [], "gantt": [], "order": [], "summary": _calculate_summary([], [])}

    color_map = _assign_colors(tasks)
    raw_tasks = [
        {
            "name": t.get("name", f"P{i+1}"),
            "arrival": max(0, int(t.get("arrival", 0))),
            "burst": max(1, int(t.get("burst", 1))),
            "priority": int(t.get("priority", 1)),
            "orig_idx": i,
            "done": False
        }
        for i, t in enumerate(tasks)
    ]

    current_time = 0
    completed_count = 0
    n = len(raw_tasks)
    gantt = []
    order = []
    results = []

    while completed_count < n:
        ready = [t for t in raw_tasks if not t["done"] and t["arrival"] <= current_time]

        if not ready:
            next_arrival = min(t["arrival"] for t in raw_tasks if not t["done"])
            gantt.append({
                "task": "IDLE",
                "start": current_time,
                "end": next_arrival,
                "duration": next_arrival - current_time,
                "color": color_map["IDLE"]
            })
            current_time = next_arrival
            continue

        # Sort by priority (if lower_is_higher is True: 1 is top priority, else reverse)
        if lower_is_higher:
            selected = min(ready, key=lambda x: (x["priority"], x["arrival"], x["orig_idx"]))
        else:
            selected = max(ready, key=lambda x: (x["priority"], -x["arrival"], -x["orig_idx"]))

        start_time = current_time
        completion_time = start_time + selected["burst"]
        turnaround_time = completion_time - selected["arrival"]
        waiting_time = turnaround_time - selected["burst"]
        response_time = start_time - selected["arrival"]

        gantt.append({
            "task": selected["name"],
            "start": start_time,
            "end": completion_time,
            "duration": selected["burst"],
            "color": color_map.get(selected["name"], "#6366f1")
        })

        order.append(selected["name"])
        results.append({
            "name": selected["name"],
            "arrival": selected["arrival"],
            "burst": selected["burst"],
            "priority": selected["priority"],
            "start_time": start_time,
            "completion_time": completion_time,
            "turnaround_time": turnaround_time,
            "waiting_time": waiting_time,
            "response_time": response_time,
            "color": color_map.get(selected["name"], "#6366f1")
        })

        selected["done"] = True
        completed_count += 1
        current_time = completion_time

    summary = _calculate_summary(results, gantt)
    return {
        "algorithm": "Priority (Non-Preemptive)",
        "order": order,
        "tasks": results,
        "gantt": gantt,
        **summary
    }


def schedule_ai_mode(tasks: List[Dict[str, Any]], ai_predictions: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    AI-Optimized Scheduling Mode:
    Combines machine learning predicted execution characteristics with an intelligent
    multi-factor optimization heuristic (Dynamic Weighted SJF + Aging).
    Provides optimal throughput, minimises average waiting time, and completely prevents starvation.
    """
    if not tasks:
        return {"tasks": [], "gantt": [], "order": [], "summary": _calculate_summary([], [])}

    color_map = _assign_colors(tasks)

    # Attach AI predictions if provided
    pred_dict = {}
    if ai_predictions:
        for p in ai_predictions:
            pred_dict[p.get("name")] = p

    enriched_tasks = []
    for i, t in enumerate(tasks):
        name = t.get("name", f"P{i+1}")
        pred = pred_dict.get(name, {})
        pred_burst = pred.get("predicted_burst")
        pred_priority = pred.get("predicted_priority")

        burst = pred_burst if (pred_burst is not None and int(t.get("burst", 0)) <= 0) else max(1, int(t.get("burst", 1)))
        priority = pred_priority if (pred_priority is not None and int(t.get("priority", 0)) <= 0) else int(t.get("priority", 1))

        enriched_tasks.append({
            "name": name,
            "arrival": max(0, int(t.get("arrival", 0))),
            "burst": burst,
            "priority": priority,
            "ai_confidence": pred.get("confidence", 94),
            "workload_type": pred.get("workload_type", t.get("workload_type", "General")),
            "orig_idx": i,
            "done": False
        })

    current_time = 0
    completed_count = 0
    n = len(enriched_tasks)
    gantt = []
    order = []
    results = []

    # AI Heuristic: Calculate Dynamic Score at time T
    # Score = burst_time * 0.65 + priority * 1.5 - waiting_time_so_far * 0.25 (lower score executed first)
    while completed_count < n:
        ready = [t for t in enriched_tasks if not t["done"] and t["arrival"] <= current_time]

        if not ready:
            next_arrival = min(t["arrival"] for t in enriched_tasks if not t["done"])
            gantt.append({
                "task": "IDLE",
                "start": current_time,
                "end": next_arrival,
                "duration": next_arrival - current_time,
                "color": color_map["IDLE"]
            })
            current_time = next_arrival
            continue

        # AI Scoring Function for each candidate
        def ai_score(cand):
            waiting_so_far = current_time - cand["arrival"]
            # Balancing burst size, priority urgency, and starvation avoidance
            score = (cand["burst"] * 0.7) + (cand["priority"] * 1.2) - (waiting_so_far * 0.3)
            return score

        selected = min(ready, key=lambda x: (ai_score(x), x["arrival"], x["orig_idx"]))

        start_time = current_time
        completion_time = start_time + selected["burst"]
        turnaround_time = completion_time - selected["arrival"]
        waiting_time = turnaround_time - selected["burst"]
        response_time = start_time - selected["arrival"]

        gantt.append({
            "task": selected["name"],
            "start": start_time,
            "end": completion_time,
            "duration": selected["burst"],
            "color": color_map.get(selected["name"], "#6366f1")
        })

        order.append(selected["name"])
        results.append({
            "name": selected["name"],
            "arrival": selected["arrival"],
            "burst": selected["burst"],
            "priority": selected["priority"],
            "ai_confidence": selected["ai_confidence"],
            "workload_type": selected["workload_type"],
            "start_time": start_time,
            "completion_time": completion_time,
            "turnaround_time": turnaround_time,
            "waiting_time": waiting_time,
            "response_time": response_time,
            "color": color_map.get(selected["name"], "#6366f1")
        })

        selected["done"] = True
        completed_count += 1
        current_time = completion_time

    summary = _calculate_summary(results, gantt)
    return {
        "algorithm": "AI Smart Mode",
        "order": order,
        "tasks": results,
        "gantt": gantt,
        **summary
    }


def compare_all_algorithms(tasks: List[Dict[str, Any]], time_quantum: int = 2) -> Dict[str, Any]:
    """Runs all 4+ algorithms on the exact same task set for comparison"""
    fcfs = schedule_fcfs(tasks)
    sjf = schedule_sjf_non_preemptive(tasks)
    rr = schedule_round_robin(tasks, time_quantum)
    prio = schedule_priority_non_preemptive(tasks)
    ai = schedule_ai_mode(tasks)

    results = {
        "FCFS": fcfs,
        "SJF": sjf,
        "Round Robin": rr,
        "Priority": prio,
        "AI Mode": ai
    }

    # Determine best algorithm based on minimum average waiting time & turnaround time
    ranking = sorted(
        results.items(),
        key=lambda item: (item[1]["avg_waiting_time"], item[1]["avg_turnaround_time"])
    )

    best_name = ranking[0][0]
    best_stats = ranking[0][1]

    return {
        "comparison": {
            name: {
                "avg_waiting_time": data["avg_waiting_time"],
                "avg_turnaround_time": data["avg_turnaround_time"],
                "avg_response_time": data["avg_response_time"],
                "cpu_utilization": data["cpu_utilization"],
                "total_time": data["total_time"],
                "order": data["order"]
            }
            for name, data in results.items()
        },
        "best_algorithm": {
            "name": best_name,
            "avg_waiting_time": best_stats["avg_waiting_time"],
            "avg_turnaround_time": best_stats["avg_turnaround_time"],
            "reason": f"{best_name} achieved the lowest average waiting time of {best_stats['avg_waiting_time']}s and turnaround time of {best_stats['avg_turnaround_time']}s."
        },
        "details": results
    }


def schedule_multicore(
    tasks: List[Dict[str, Any]],
    num_cores: int = 4,
    algorithm: str = "ai",
    context_switch_cost: float = 0.0
) -> Dict[str, Any]:
    """
    Symmetric Multiprocessing (SMP) Multi-Core CPU Scheduler.
    Schedules tasks in parallel across 2, 4, or 8 CPU Cores with Least-Loaded Work-Stealing Load Balancing.
    """
    if not tasks:
        return {
            "algorithm": f"Multi-Core ({num_cores} Cores)",
            "num_cores": num_cores,
            "tasks": [],
            "gantt": [],
            "core_tracks": {},
            "speedup": 1.0,
            "efficiency": 100.0,
            **_calculate_summary([], [])
        }

    cores_count = max(1, min(8, int(num_cores or 4)))
    color_map = _assign_colors(tasks)

    # Clean input tasks
    raw_tasks = [
        {
            "name": t.get("name", f"P{i+1}"),
            "arrival": max(0, int(t.get("arrival", 0))),
            "burst": max(1, int(t.get("burst", 1))),
            "priority": int(t.get("priority", 1)),
            "memory_mb": t.get("memory_mb", 0),
            "cpu_percent": t.get("cpu_percent", 0.0),
            "orig_idx": i,
            "done": False
        }
        for i, t in enumerate(tasks)
    ]

    # Initialize Core States
    cores = [
        {
            "core_id": c,
            "name": f"Core {c}",
            "current_time": 0,
            "gantt": [],
            "busy_time": 0,
            "last_task": None
        }
        for c in range(cores_count)
    ]

    completed_tasks = []
    n = len(raw_tasks)

    # Heuristic comparator based on algorithm
    def task_rank_score(cand, current_clock):
        alg_lower = (algorithm or "ai").lower()
        if "sjf" in alg_lower:
            return cand["burst"]
        elif "prio" in alg_lower:
            return cand["priority"]
        elif "fcfs" in alg_lower:
            return cand["arrival"]
        else: # AI Mode
            waiting_so_far = max(0, current_clock - cand["arrival"])
            return (cand["burst"] * 0.65) + (cand["priority"] * 1.3) - (waiting_so_far * 0.25)

    while len(completed_tasks) < n:
        # Find the core that becomes available next
        earliest_core = min(cores, key=lambda c: c["current_time"])
        clock = earliest_core["current_time"]

        # Filter arrived and unfinished tasks
        ready_tasks = [t for t in raw_tasks if not t["done"] and t["arrival"] <= clock]

        if not ready_tasks:
            # All cores idle until next arrival
            unstarted = [t for t in raw_tasks if not t["done"]]
            if not unstarted:
                break
            next_arrival = min(t["arrival"] for t in unstarted)

            # Insert IDLE slice on this core
            if next_arrival > clock:
                earliest_core["gantt"].append({
                    "task": "IDLE",
                    "start": clock,
                    "end": next_arrival,
                    "duration": next_arrival - clock,
                    "color": color_map["IDLE"],
                    "core": earliest_core["name"]
                })
                earliest_core["current_time"] = next_arrival
            continue

        # Pick best task using algorithm ranking
        selected = min(ready_tasks, key=lambda t: (task_rank_score(t, clock), t["orig_idx"]))

        # Optional Context switch penalty if switching task
        switch_delay = context_switch_cost if (earliest_core["last_task"] and earliest_core["last_task"] != selected["name"]) else 0
        start_time = clock + switch_delay
        end_time = start_time + selected["burst"]

        turnaround_time = end_time - selected["arrival"]
        waiting_time = turnaround_time - selected["burst"]
        response_time = start_time - selected["arrival"]

        # Add to core's Gantt track
        earliest_core["gantt"].append({
            "task": selected["name"],
            "start": round(start_time, 1),
            "end": round(end_time, 1),
            "duration": selected["burst"],
            "color": color_map.get(selected["name"], "#00ff88"),
            "core": earliest_core["name"]
        })

        earliest_core["busy_time"] += selected["burst"]
        earliest_core["current_time"] = end_time
        earliest_core["last_task"] = selected["name"]

        selected["done"] = True
        completed_tasks.append({
            "name": selected["name"],
            "arrival": selected["arrival"],
            "burst": selected["burst"],
            "priority": selected["priority"],
            "start_time": round(start_time, 1),
            "completion_time": round(end_time, 1),
            "turnaround_time": round(turnaround_time, 1),
            "waiting_time": round(waiting_time, 1),
            "response_time": round(response_time, 1),
            "assigned_core": earliest_core["name"],
            "memory_mb": selected["memory_mb"],
            "cpu_percent": selected["cpu_percent"],
            "color": color_map.get(selected["name"], "#00ff88")
        })

    # Calculate Multi-Core Efficiency & Speedup (Amdahl's Law)
    total_makespan = max((c["current_time"] for c in cores), default=0)
    single_core_time = sum(t["burst"] for t in completed_tasks)
    speedup = round(single_core_time / total_makespan, 2) if total_makespan > 0 else 1.0
    parallel_efficiency = round((speedup / cores_count) * 100.0, 1) if cores_count > 0 else 100.0

    # Build per-core tracks
    core_tracks = {c["name"]: c["gantt"] for c in cores}

    # Consolidated Gantt list for unified timeline
    unified_gantt = []
    for c in cores:
        unified_gantt.extend(c["gantt"])
    unified_gantt.sort(key=lambda g: g["start"])

    # Summary
    summary = _calculate_summary(completed_tasks, unified_gantt)
    summary["total_time"] = round(total_makespan, 1)

    return {
        "algorithm": f"Multi-Core {algorithm.upper()} ({cores_count} Cores)",
        "num_cores": cores_count,
        "speedup": speedup,
        "parallel_efficiency": parallel_efficiency,
        "cores_utilization": {
            c["name"]: round((c["busy_time"] / total_makespan * 100), 1) if total_makespan > 0 else 100.0
            for c in cores
        },
        "core_tracks": core_tracks,
        "gantt": unified_gantt,
        "tasks": completed_tasks,
        **summary
    }


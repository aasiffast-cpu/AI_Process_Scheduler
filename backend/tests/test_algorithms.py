import pytest
import os
import sys

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scheduler.algorithms import (
    schedule_fcfs,
    schedule_sjf_non_preemptive,
    schedule_round_robin,
    schedule_priority_non_preemptive,
    schedule_ai_mode,
    schedule_multicore,
    compare_all_algorithms
)
from scheduler.ai_model import infer_workload_type, get_ai_predictor


@pytest.fixture
def sample_tasks():
    return [
        {"name": "P1", "arrival": 0, "burst": 5, "priority": 2},
        {"name": "P2", "arrival": 1, "burst": 3, "priority": 1},
        {"name": "P3", "arrival": 2, "burst": 8, "priority": 3},
        {"name": "P4", "arrival": 3, "burst": 6, "priority": 4},
    ]


def test_fcfs(sample_tasks):
    result = schedule_fcfs(sample_tasks)
    assert result["algorithm"] == "FCFS"
    assert result["order"] == ["P1", "P2", "P3", "P4"]
    assert len(result["tasks"]) == 4
    assert result["total_time"] == 22
    assert result["avg_waiting_time"] > 0
    assert result["avg_turnaround_time"] > 0
    assert result["cpu_utilization"] == 100.0


def test_fcfs_with_idle():
    tasks = [
        {"name": "P1", "arrival": 2, "burst": 3, "priority": 1},
        {"name": "P2", "arrival": 8, "burst": 2, "priority": 1}
    ]
    result = schedule_fcfs(tasks)
    # Check that idle intervals were properly created
    idle_slots = [g for g in result["gantt"] if g["task"] == "IDLE"]
    assert len(idle_slots) == 2
    assert idle_slots[0]["start"] == 0 and idle_slots[0]["end"] == 2
    assert idle_slots[1]["start"] == 5 and idle_slots[1]["end"] == 8
    assert result["total_time"] == 10


def test_sjf(sample_tasks):
    result = schedule_sjf_non_preemptive(sample_tasks)
    assert result["algorithm"] == "SJF (Non-Preemptive)"
    # P1 arrives at 0 and runs until t=5. At t=5, P2 (burst 3), P3 (burst 8), P4 (burst 6) are all ready.
    # Shortest among ready is P2 (3), then P4 (6), then P3 (8).
    assert result["order"] == ["P1", "P2", "P4", "P3"]
    assert result["total_time"] == 22


def test_round_robin(sample_tasks):
    result = schedule_round_robin(sample_tasks, time_quantum=2)
    assert "Round Robin" in result["algorithm"]
    assert result["time_quantum"] == 2
    assert result["total_time"] == 22
    # Verify every task has valid start and completion times
    for t in result["tasks"]:
        assert t["start_time"] is not None
        assert t["completion_time"] > t["start_time"]
        assert t["turnaround_time"] == t["completion_time"] - t["arrival"]
        assert t["waiting_time"] == t["turnaround_time"] - t["burst"]


def test_priority(sample_tasks):
    result = schedule_priority_non_preemptive(sample_tasks, lower_is_higher=True)
    assert "Priority" in result["algorithm"]
    # P1 arrives at 0 and runs until t=5.
    # At t=5, ready tasks are P2 (prio 1), P3 (prio 3), P4 (prio 4).
    # Highest priority is P2 (1), then P3 (3), then P4 (4).
    assert result["order"] == ["P1", "P2", "P3", "P4"]


def test_ai_mode(sample_tasks):
    result = schedule_ai_mode(sample_tasks)
    assert result["algorithm"] == "AI Smart Mode"
    assert len(result["order"]) == 4
    assert result["total_time"] == 22


def test_compare_all(sample_tasks):
    comp = compare_all_algorithms(sample_tasks, time_quantum=2)
    assert "comparison" in comp
    assert "FCFS" in comp["comparison"]
    assert "SJF" in comp["comparison"]
    assert "Round Robin" in comp["comparison"]
    assert "Priority" in comp["comparison"]
    assert "AI Mode" in comp["comparison"]
    assert "best_algorithm" in comp
    assert "name" in comp["best_algorithm"]


def test_ai_workload_inference():
    assert infer_workload_type("4K Video Rendering") == "Rendering"
    assert infer_workload_type("User SQL Query") == "DatabaseQuery"
    assert infer_workload_type("Web Scraper Spider") == "WebScraping"
    assert infer_workload_type("Zip File Backup") == "FileCompression"
    assert infer_workload_type("TensorFlow Model Training") == "MachineLearning"


def test_ai_predictor():
    predictor = get_ai_predictor()
    pred = predictor.predict_task({"name": "Video Rendering Task", "priority": 2})
    assert "predicted_burst" in pred
    assert pred["predicted_burst"] >= 1
    assert "predicted_priority" in pred
    assert pred["workload_type"] == "Rendering"


def test_multicore_scheduling(sample_tasks):
    result = schedule_multicore(sample_tasks, num_cores=2, algorithm="sjf")
    assert "Multi-Core" in result["algorithm"]
    assert result["num_cores"] == 2
    assert "core_tracks" in result
    assert "Core 0" in result["core_tracks"]
    assert "Core 1" in result["core_tracks"]
    assert result["speedup"] >= 1.0
    assert result["parallel_efficiency"] > 0


def test_anomaly_detection():
    predictor = get_ai_predictor()
    test_tasks = [
        {"name": "Leaking Tab", "memory_mb": 450, "cpu_percent": 2.0, "burst": 5},
        {"name": "Normal Tab", "memory_mb": 80, "cpu_percent": 0.5, "burst": 4}
    ]
    anomalies = predictor.detect_anomalies(test_tasks)
    assert len(anomalies) == 2
    assert anomalies[0]["is_anomaly"] is True
    assert "Memory Leak" in anomalies[0]["anomaly_type"]
    assert anomalies[1]["is_anomaly"] is False


"""
REST API Routes for AI Process Scheduler
Handles scheduling, AI prediction, comparison, history, and real system process monitoring.
"""

import json
import psutil
from flask import Blueprint, request, jsonify

from scheduler.algorithms import (
    schedule_fcfs,
    schedule_sjf_non_preemptive,
    schedule_round_robin,
    schedule_priority_non_preemptive,
    schedule_ai_mode,
    schedule_multicore,
    compare_all_algorithms,
)
from scheduler.ai_model import get_ai_predictor
from models.db_models import ScheduleHistory

schedule_bp = Blueprint("schedule_bp", __name__)


def get_db_session():
    # Session is attached to current app
    from flask import current_app
    return current_app.db_session


@schedule_bp.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint showing server status and AI model readiness"""
    try:
        predictor = get_ai_predictor()
        ai_ready = predictor.pipeline is not None
    except Exception:
        ai_ready = False

    return jsonify({
        "status": "healthy",
        "service": "AI Process Scheduler Backend",
        "version": "1.0.0",
        "ai_model_loaded": ai_ready,
        "author": "Muhammad Asif"
    }), 200


@schedule_bp.route("/predict", methods=["POST"])
def predict_tasks():
    """
    AI Prediction Endpoint
    Predicts burst time and recommended priority from task characteristics/name.
    """
    data = request.get_json() or {}
    tasks = data.get("tasks", [])
    if not tasks:
        # Check if single task sent
        task = data.get("task")
        if task:
            tasks = [task]

    if not tasks:
        return jsonify({"error": "No tasks provided for AI prediction"}), 400

    try:
        predictor = get_ai_predictor()
        predictions = predictor.predict_multiple(tasks)
        return jsonify({
            "status": "success",
            "count": len(predictions),
            "predictions": predictions
        }), 200
    except Exception as e:
        return jsonify({"error": f"AI Prediction failed: {str(e)}"}), 500


@schedule_bp.route("/schedule", methods=["POST"])
def run_schedule():
    """
    Main Scheduling Endpoint
    Executes specified algorithm (FCFS, SJF, RR, Priority, AI) on given tasks.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON body"}), 400

    algorithm = (data.get("algorithm") or "fcfs").strip().lower()
    time_quantum = data.get("time_quantum", 2)
    num_cores = int(data.get("num_cores", 1))
    tasks = data.get("tasks", [])

    if not isinstance(tasks, list) or len(tasks) == 0:
        return jsonify({"error": "Task list must contain at least 1 task"}), 400

    # Sanitize and validate tasks
    cleaned_tasks = []
    predictor = get_ai_predictor()

    for idx, t in enumerate(tasks):
        name = str(t.get("name") or f"Task-{idx+1}").strip()
        arrival = t.get("arrival", 0)
        burst = t.get("burst", 0)
        priority = t.get("priority", 1)

        try:
            arrival = max(0, int(arrival))
        except (ValueError, TypeError):
            arrival = 0

        try:
            burst = int(burst)
        except (ValueError, TypeError):
            burst = 0

        try:
            priority = max(1, int(priority))
        except (ValueError, TypeError):
            priority = 1

        # If burst <= 0 or in AI mode, let AI predict burst time
        predicted_info = None
        if burst <= 0 or algorithm == "ai":
            pred = predictor.predict_task({"name": name, "priority": priority})
            predicted_info = pred
            if burst <= 0:
                burst = pred["predicted_burst"]

        cleaned_tasks.append({
            "name": name,
            "arrival": arrival,
            "burst": max(1, burst),
            "priority": priority,
            "workload_type": t.get("workload_type") or (predicted_info["workload_type"] if predicted_info else None),
            "ai_predicted": predicted_info is not None
        })

    # Run chosen algorithm (Single-Core vs Multi-Core SMP)
    try:
        if num_cores > 1:
            result = schedule_multicore(cleaned_tasks, num_cores=num_cores, algorithm=algorithm)
        elif algorithm == "fcfs":
            result = schedule_fcfs(cleaned_tasks)
        elif algorithm in ["sjf", "srtf"]:
            result = schedule_sjf_non_preemptive(cleaned_tasks)
        elif algorithm in ["rr", "round_robin", "roundrobin"]:
            result = schedule_round_robin(cleaned_tasks, time_quantum)
        elif algorithm in ["priority", "prio"]:
            result = schedule_priority_non_preemptive(cleaned_tasks)
        elif algorithm in ["ai", "ai_mode", "smart"]:
            preds = predictor.predict_multiple(cleaned_tasks)
            result = schedule_ai_mode(cleaned_tasks, preds)
        else:
            return jsonify({"error": f"Unknown algorithm '{algorithm}'. Choose from: fcfs, sjf, rr, priority, ai"}), 400

        # Attach AI Anomaly & Memory Leak Detection
        try:
            anomalies = predictor.detect_anomalies(cleaned_tasks)
            result["anomalies"] = anomalies
            result["anomaly_summary"] = {
                "detected": len([a for a in anomalies if a["is_anomaly"]]),
                "critical": len([a for a in anomalies if a["severity"] == "critical"])
            }
        except Exception as anom_err:
            print(f"Warning: Anomaly check error: {anom_err}")

        # Save to SQLite History
        try:
            db_session = get_db_session()
            history_entry = ScheduleHistory(
                algorithm=result.get("algorithm", algorithm),
                time_quantum=time_quantum if "round" in result.get("algorithm", "").lower() else None,
                task_count=len(cleaned_tasks),
                avg_waiting_time=result.get("avg_waiting_time", 0.0),
                avg_turnaround_time=result.get("avg_turnaround_time", 0.0),
                cpu_utilization=result.get("cpu_utilization", 0.0),
                tasks_input=json.dumps(cleaned_tasks),
                schedule_output=json.dumps(result)
            )
            db_session.add(history_entry)
            db_session.commit()
            result["history_id"] = history_entry.id
        except Exception as db_err:
            # DB logging failure should not abort schedule response
            print(f"Warning: Failed to save history to DB: {db_err}")

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": f"Scheduling error: {str(e)}"}), 500


@schedule_bp.route("/anomalies", methods=["POST"])
def check_anomalies():
    """AI Anomaly & Memory Leak Detection Endpoint"""
    data = request.get_json() or {}
    tasks = data.get("tasks", [])
    try:
        predictor = get_ai_predictor()
        anomalies = predictor.detect_anomalies(tasks)
        return jsonify({
            "status": "success",
            "anomalies": anomalies,
            "detected_count": len([a for a in anomalies if a["is_anomaly"]])
        }), 200
    except Exception as e:
        return jsonify({"error": f"Anomaly detection failed: {str(e)}"}), 500


@schedule_bp.route("/compare", methods=["POST"])
def compare_algorithms_route():
    """Compares all scheduling algorithms on the provided task list"""
    data = request.get_json() or {}
    tasks = data.get("tasks", [])
    time_quantum = data.get("time_quantum", 2)

    if not isinstance(tasks, list) or len(tasks) == 0:
        return jsonify({"error": "Task list must contain at least 1 task"}), 400

    try:
        # Pre-validate burst
        predictor = get_ai_predictor()
        validated = []
        for i, t in enumerate(tasks):
            name = str(t.get("name") or f"P{i+1}").strip()
            burst = int(t.get("burst", 0))
            if burst <= 0:
                burst = predictor.predict_task({"name": name})["predicted_burst"]
            validated.append({
                "name": name,
                "arrival": max(0, int(t.get("arrival", 0))),
                "burst": max(1, burst),
                "priority": max(1, int(t.get("priority", 1)))
            })

        comparison = compare_all_algorithms(validated, time_quantum)
        return jsonify(comparison), 200
    except Exception as e:
        return jsonify({"error": f"Comparison failed: {str(e)}"}), 500


@schedule_bp.route("/history", methods=["GET"])
def get_history():
    """Fetches recent scheduling execution history"""
    try:
        limit = request.args.get("limit", 50, type=int)
        db_session = get_db_session()
        entries = (
            db_session.query(ScheduleHistory)
            .order_by(ScheduleHistory.id.desc())
            .limit(limit)
            .all()
        )
        return jsonify({
            "status": "success",
            "count": len(entries),
            "history": [e.to_dict() for e in entries]
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve history: {str(e)}"}), 500


@schedule_bp.route("/history/<int:history_id>", methods=["DELETE"])
def delete_history_entry(history_id):
    """Deletes a single history record by ID"""
    try:
        db_session = get_db_session()
        entry = db_session.query(ScheduleHistory).filter_by(id=history_id).first()
        if not entry:
            return jsonify({"error": f"History entry #{history_id} not found"}), 404

        db_session.delete(entry)
        db_session.commit()
        return jsonify({"status": "success", "message": f"Deleted history entry #{history_id}"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to delete history: {str(e)}"}), 500


@schedule_bp.route("/history/clear", methods=["DELETE"])
def clear_all_history():
    """Clears all history records"""
    try:
        db_session = get_db_session()
        db_session.query(ScheduleHistory).delete()
        db_session.commit()
        return jsonify({"status": "success", "message": "All history cleared"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to clear history: {str(e)}"}), 500


@schedule_bp.route("/system-processes", methods=["GET"])
def get_live_system_processes():
    """
    Fetches real running system processes via psutil.
    Allows user to import actual live OS tasks into the scheduler!
    """
    try:
        limit = request.args.get("limit", 15, type=int)
        process_list = []

        for proc in psutil.process_iter(["pid", "name", "cpu_percent", "memory_info", "status"]):
            try:
                info = proc.info
                # Filter out idle or system helper noise if desired
                p_name = info["name"] or f"Process-{info['pid']}"
                mem_mb = round(info["memory_info"].rss / (1024 * 1024), 1) if info.get("memory_info") else 0
                cpu = info.get("cpu_percent") or 0.0

                process_list.append({
                    "pid": info["pid"],
                    "name": p_name,
                    "cpu_percent": cpu,
                    "memory_mb": mem_mb,
                    "status": info.get("status", "running")
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        # Sort by memory or cpu
        process_list.sort(key=lambda x: (x["memory_mb"], x["cpu_percent"]), reverse=True)
        top_procs = process_list[:limit]

        # Convert to scheduler tasks format
        suggested_tasks = []
        for i, p in enumerate(top_procs):
            # Map memory / cpu to realistic burst units (1-15)
            burst = max(1, min(20, int(round((p["memory_mb"] / 150.0) + (p["cpu_percent"] / 10.0)))))
            priority = 1 if p["cpu_percent"] > 5 else (2 if p["memory_mb"] > 200 else 3)
            suggested_tasks.append({
                "name": p["name"],
                "arrival": i,
                "burst": burst,
                "priority": priority,
                "pid": p["pid"],
                "memory_mb": p["memory_mb"]
            })

        return jsonify({
            "status": "success",
            "count": len(top_procs),
            "processes": top_procs,
            "suggested_tasks": suggested_tasks
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to inspect system processes: {str(e)}"}), 500


def get_live_chrome_system_processes():
    """Extracts all live chrome.exe processes with detailed OS metrics from Windows"""
    processes = []
    total_rss_bytes = 0
    total_cpu = 0.0

    for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info', 'create_time', 'cmdline', 'num_threads']):
        try:
            info = p.info
            name = (info.get('name') or '').lower()
            if 'chrome' not in name:
                continue

            cmd_list = info.get('cmdline') or []
            cmd = ' '.join(cmd_list)

            ptype = 'Browser Core'
            category = 'core'
            if '--type=renderer' in cmd:
                ptype = 'Tab Renderer'
                category = 'tab'
            elif '--type=gpu-process' in cmd:
                ptype = 'GPU Acceleration'
                category = 'gpu'
            elif '--type=utility' in cmd:
                if 'network.mojom' in cmd or 'network' in cmd:
                    ptype = 'Network Service'
                    category = 'network'
                elif 'audio' in cmd:
                    ptype = 'Audio Service'
                    category = 'audio'
                elif 'storage' in cmd:
                    ptype = 'Storage Service'
                    category = 'storage'
                else:
                    ptype = 'Utility Service'
                    category = 'utility'
            elif '--type=crashpad-handler' in cmd:
                ptype = 'Crash Reporter'
                category = 'helper'
            elif '--type=extension' in cmd:
                ptype = 'Extension Worker'
                category = 'extension'

            mem_bytes = info['memory_info'].rss if info.get('memory_info') else 0
            total_rss_bytes += mem_bytes
            mem_mb = round(mem_bytes / (1024 * 1024), 1)

            cpu = info.get('cpu_percent') or 0.0
            total_cpu += cpu

            threads = info.get('num_threads') or 1
            create_time = info.get('create_time') or 0

            processes.append({
                'pid': info['pid'],
                'type': ptype,
                'category': category,
                'memory_mb': mem_mb,
                'cpu_percent': round(cpu, 1),
                'threads': threads,
                'create_time': create_time
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    processes.sort(key=lambda x: x['memory_mb'], reverse=True)
    total_mem_mb = round(total_rss_bytes / (1024 * 1024), 1)
    total_mem_gb = round(total_mem_mb / 1024.0, 2)

    return {
        'total_processes': len(processes),
        'total_memory_mb': total_mem_mb,
        'total_memory_gb': total_mem_gb,
        'total_cpu_percent': round(total_cpu, 1),
        'processes': processes
    }


@schedule_bp.route("/chrome/metrics", methods=["GET"])
def get_chrome_metrics():
    """
    Returns real-time aggregate Chrome statistics from the host system.
    Shows actual RAM in MB/GB, actual CPU %, and every individual chrome.exe process.
    """
    try:
        data = get_live_chrome_system_processes()
        return jsonify({
            "status": "success",
            "chrome_metrics": data
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch Chrome metrics: {str(e)}"}), 500


@schedule_bp.route("/chrome/sync", methods=["POST"])
def sync_chrome_tabs_and_processes():
    """
    Real-Time Chrome Synchronization Endpoint.
    Merges actual open Chrome tabs from the extension with real chrome.exe system processes.
    Generates real scheduling tasks directly from the user's active browser!
    """
    data = request.get_json() or {}
    extension_tabs = data.get("tabs", [])
    system_chrome = get_live_chrome_system_processes()
    procs = system_chrome.get("processes", [])

    real_tasks = []
    renderers = [p for p in procs if p["type"] == "Tab Renderer"]
    gpu_proc = next((p for p in procs if p["type"] == "GPU Acceleration"), None)
    core_proc = next((p for p in procs if p["type"] == "Browser Core"), None)
    net_proc = next((p for p in procs if p["type"] == "Network Service"), None)

    # 1. Add Browser Core if found
    if core_proc:
        real_tasks.append({
            "name": f"Chrome Core (PID {core_proc['pid']})",
            "arrival": 0,
            "burst": max(2, min(8, int(round(core_proc['memory_mb'] / 35.0)))),
            "priority": 1,
            "pid": core_proc["pid"],
            "memory_mb": core_proc["memory_mb"],
            "cpu_percent": core_proc["cpu_percent"],
            "process_type": "Browser Core",
            "is_real_chrome": True
        })

    # 2. Add GPU Acceleration if found
    if gpu_proc:
        real_tasks.append({
            "name": f"Chrome GPU (PID {gpu_proc['pid']})",
            "arrival": 0,
            "burst": max(2, min(10, int(round(gpu_proc['memory_mb'] / 30.0)))),
            "priority": 1,
            "pid": gpu_proc["pid"],
            "memory_mb": gpu_proc["memory_mb"],
            "cpu_percent": gpu_proc["cpu_percent"],
            "process_type": "GPU Hardware",
            "is_real_chrome": True
        })

    # 3. Add Network Service if found
    if net_proc:
        real_tasks.append({
            "name": f"Chrome Network (PID {net_proc['pid']})",
            "arrival": 1,
            "burst": max(1, min(6, int(round(net_proc['memory_mb'] / 25.0)))),
            "priority": 2,
            "pid": net_proc["pid"],
            "memory_mb": net_proc["memory_mb"],
            "cpu_percent": net_proc["cpu_percent"],
            "process_type": "Network Service",
            "is_real_chrome": True
        })

    # 4. If extension sent real tabs, map real tabs with actual memory
    if extension_tabs:
        for idx, tab in enumerate(extension_tabs):
            title = (tab.get("title") or "Chrome Tab").strip()
            # Clean title
            clean_title = title[:35] + ("..." if len(title) > 35 else "")
            url = tab.get("url", "")
            is_active = tab.get("active", False)
            is_audible = tab.get("audible", False)

            # Assign memory from real renderers list
            matched_proc = renderers[idx] if idx < len(renderers) else None
            mem_mb = matched_proc["memory_mb"] if matched_proc else round(60 + (idx * 15), 1)
            pid = matched_proc["pid"] if matched_proc else None

            # Calculate realistic burst based on tab type and memory
            url_lower = url.lower()
            if is_audible or "youtube" in url_lower or "netflix" in url_lower or "spotify" in url_lower:
                burst = max(6, min(14, int(round(mem_mb / 20.0))))
                priority = 1  # Audio streaming must not stutter
            elif is_active:
                burst = max(4, min(12, int(round(mem_mb / 25.0))))
                priority = 1  # Foreground active tab
            elif any(k in url_lower for k in ["github", "stackoverflow", "docs", "chatgpt"]):
                burst = max(3, min(8, int(round(mem_mb / 30.0))))
                priority = 2
            else:
                burst = max(2, min(6, int(round(mem_mb / 40.0))))
                priority = 3  # Background idle tab

            real_tasks.append({
                "name": f"Tab: {clean_title}",
                "arrival": idx + 1,
                "burst": burst,
                "priority": priority,
                "pid": pid,
                "memory_mb": mem_mb,
                "cpu_percent": matched_proc["cpu_percent"] if matched_proc else 0.0,
                "is_active": is_active,
                "is_audible": is_audible,
                "tab_id": tab.get("id"),
                "url": url,
                "process_type": "Tab Renderer",
                "is_real_chrome": True
            })
    else:
        # If tabs not received directly (e.g. opened in standalone dashboard), use top system renderers
        for idx, r in enumerate(renderers[:8]):
            burst = max(2, min(15, int(round(r["memory_mb"] / 20.0 + r["cpu_percent"] * 1.2))))
            real_tasks.append({
                "name": f"Chrome Renderer (PID {r['pid']})",
                "arrival": idx + 1,
                "burst": burst,
                "priority": 1 if idx == 0 else (2 if r["memory_mb"] > 100 else 3),
                "pid": r["pid"],
                "memory_mb": r["memory_mb"],
                "cpu_percent": r["cpu_percent"],
                "process_type": "Tab Renderer",
                "is_real_chrome": True
            })

    return jsonify({
        "status": "success",
        "chrome_summary": {
            "total_processes": system_chrome["total_processes"],
            "total_memory_mb": system_chrome["total_memory_mb"],
            "total_memory_gb": system_chrome["total_memory_gb"],
            "total_cpu_percent": system_chrome["total_cpu_percent"],
            "tabs_synced": len(extension_tabs) if extension_tabs else len(renderers[:8])
        },
        "tasks": real_tasks
    }), 200


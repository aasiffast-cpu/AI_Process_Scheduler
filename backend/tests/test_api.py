import os
import sys
import json
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from config import Config


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


@pytest.fixture
def client():
    app = create_app(TestConfig)
    with app.test_client() as client:
        yield client


def test_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert data["author"] == "Muhammad Asif"


def test_schedule_endpoint_fcfs(client):
    payload = {
        "algorithm": "fcfs",
        "tasks": [
            {"name": "P1", "arrival": 0, "burst": 4, "priority": 1},
            {"name": "P2", "arrival": 1, "burst": 2, "priority": 2}
        ]
    }
    res = client.post("/api/schedule", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["algorithm"] == "FCFS"
    assert "gantt" in data
    assert "avg_waiting_time" in data


def test_schedule_endpoint_ai(client):
    payload = {
        "algorithm": "ai",
        "tasks": [
            {"name": "Database Backup Task", "arrival": 0, "burst": 0, "priority": 1},
            {"name": "Video Rendering Task", "arrival": 1, "burst": 0, "priority": 3}
        ]
    }
    res = client.post("/api/schedule", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert "AI" in data["algorithm"]
    assert len(data["tasks"]) == 2
    # Verify burst was predicted
    for t in data["tasks"]:
        assert t["burst"] > 0


def test_compare_endpoint(client):
    payload = {
        "time_quantum": 2,
        "tasks": [
            {"name": "Task A", "arrival": 0, "burst": 5, "priority": 2},
            {"name": "Task B", "arrival": 1, "burst": 3, "priority": 1}
        ]
    }
    res = client.post("/api/compare", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert "best_algorithm" in data
    assert "comparison" in data


def test_history_endpoints(client):
    # Schedule first
    payload = {
        "algorithm": "fcfs",
        "tasks": [{"name": "P1", "arrival": 0, "burst": 3, "priority": 1}]
    }
    res = client.post("/api/schedule", json=payload)
    assert res.status_code == 200

    # Fetch history
    h_res = client.get("/api/history")
    assert h_res.status_code == 200
    h_data = h_res.get_json()
    assert h_data["count"] >= 1

    entry_id = h_data["history"][0]["id"]

    # Delete history entry
    del_res = client.delete(f"/api/history/{entry_id}")
    assert del_res.status_code == 200

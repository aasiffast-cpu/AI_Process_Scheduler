"""
Flask Application Entry Point for AI Process Scheduler
Author: Muhammad Asif
"""

import os
import sys

# Ensure backend root is in Python sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Ensure safe UTF-8 output on Windows terminals
if sys.platform == "win32":
    try:
        if sys.stdout and hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if sys.stderr and hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from config import Config
from models.db_models import init_db
from routes.schedule_routes import schedule_bp
from scheduler.ai_model import get_ai_predictor

EXTENSION_DIR = os.path.abspath(os.path.join(backend_dir, "..", "extension"))


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for Chrome Extension origins and local testing
    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"]
    )

    # Initialize SQLite Database & attach session
    db_session = init_db(app.config["SQLALCHEMY_DATABASE_URI"])
    app.db_session = db_session

    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db_session.remove()

    # Register Blueprints
    app.register_blueprint(schedule_bp, url_prefix="/api")

    # Web Dashboard routes (renders the interactive UI directly in browser!)
    @app.route("/")
    @app.route("/dashboard")
    @app.route("/gui")
    def serve_dashboard():
        accept = request.headers.get("Accept", "")
        # If explicitly asking for JSON and not HTML (e.g. automated test/curl)
        if "application/json" in accept and "text/html" not in accept:
            return jsonify({
                "project": "AI Process Scheduler Backend",
                "author": "Muhammad Asif",
                "version": "1.0.0",
                "status": "online",
                "endpoints": {
                    "health": "/api/health",
                    "schedule": "/api/schedule (POST)",
                    "predict": "/api/predict (POST)",
                    "compare": "/api/compare (POST)",
                    "history": "/api/history (GET, DELETE)",
                    "system_processes": "/api/system-processes (GET)"
                }
            })
        return send_from_directory(EXTENSION_DIR, "popup.html")

    # Serve static assets (popup.css, popup.js, icons, etc.)
    @app.route("/<path:filename>")
    def serve_static(filename):
        if os.path.exists(os.path.join(EXTENSION_DIR, filename)):
            return send_from_directory(EXTENSION_DIR, filename)
        return jsonify({"error": "Resource not found"}), 404

    # Error Handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error occurred", "details": str(e)}), 500

    return app


if __name__ == "__main__":
    print("=" * 60)
    print("Initializing AI Process Scheduler Backend...")
    print(f"Author: Muhammad Asif")
    print(f"Host: {Config.HOST}:{Config.PORT}")
    print("=" * 60)

    # Pre-warm AI predictor
    try:
        predictor = get_ai_predictor()
        print("[OK] AI Predictor model is primed and ready.")
    except Exception as e:
        print(f"[WARN] AI predictor warmup notice: {e}")

    app = create_app()
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)

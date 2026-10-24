import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# On Vercel, filesystem is read-only except /tmp
IS_VERCEL = bool(os.environ.get("VERCEL"))
if IS_VERCEL:
    DATA_DIR = "/tmp"
else:
    DATA_DIR = os.path.join(BASE_DIR, "data")
    os.makedirs(DATA_DIR, exist_ok=True)

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "ai-process-scheduler-secret-2026")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URI", f"sqlite:///{os.path.join(DATA_DIR, 'scheduler.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Read model from static data folder, fallback to DATA_DIR
    _bundled_model = os.path.join(BASE_DIR, "data", "model.pkl")
    MODEL_PATH = _bundled_model if os.path.exists(_bundled_model) else os.path.join(DATA_DIR, "model.pkl")
    
    _bundled_dataset = os.path.join(BASE_DIR, "data", "training_data.csv")
    DATASET_PATH = _bundled_dataset if os.path.exists(_bundled_dataset) else os.path.join(DATA_DIR, "training_data.csv")
    
    HOST = "127.0.0.1"
    PORT = int(os.environ.get("PORT", 5000))
    DEBUG = not IS_VERCEL

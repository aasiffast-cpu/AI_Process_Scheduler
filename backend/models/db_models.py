import json
from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session

Base = declarative_base()

class ScheduleHistory(Base):
    __tablename__ = "schedule_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    algorithm = Column(String(50), nullable=False)
    time_quantum = Column(Integer, nullable=True)
    task_count = Column(Integer, default=0)
    avg_waiting_time = Column(Float, default=0.0)
    avg_turnaround_time = Column(Float, default=0.0)
    cpu_utilization = Column(Float, default=0.0)
    tasks_input = Column(Text, nullable=False)   # JSON string
    schedule_output = Column(Text, nullable=False) # JSON string

    def to_dict(self):
        return {
            "id": self.id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "algorithm": self.algorithm,
            "time_quantum": self.time_quantum,
            "task_count": self.task_count,
            "avg_waiting_time": round(self.avg_waiting_time, 2),
            "avg_turnaround_time": round(self.avg_turnaround_time, 2),
            "cpu_utilization": round(self.cpu_utilization, 2),
            "tasks": json.loads(self.tasks_input) if self.tasks_input else [],
            "schedule": json.loads(self.schedule_output) if self.schedule_output else {}
        }


def init_db(database_uri):
    engine = create_engine(database_uri, echo=False)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    return scoped_session(session_factory)

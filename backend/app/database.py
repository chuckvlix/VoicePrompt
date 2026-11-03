import sqlite3
from pathlib import Path
from app.config import settings


def get_db_path() -> Path:
    return Path(settings.sqlite_db_path)


def get_db_connection(db_path: str | Path | None = None) -> sqlite3.Connection:
    target_path = Path(db_path) if db_path is not None else get_db_path()
    # Ensure parent directory exists if a custom path is specified
    if target_path.parent:
        target_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(target_path), timeout=20.0)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: str | Path | None = None) -> None:
    with get_db_connection(db_path) as conn:
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = NORMAL")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_text TEXT NOT NULL,
                improved_text TEXT NOT NULL,
                tone TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.commit()

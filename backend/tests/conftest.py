import os
import tempfile
from typing import Generator
import pytest
from fastapi.testclient import TestClient
from app.config import settings
from app.database import init_db
from app.main import app


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path: str) -> Generator[None, None, None]:
    """
    Ensure every test uses a temporary, isolated SQLite database.
    """
    db_file = os.path.join(str(tmp_path), "test_voiceprompt.db")
    settings.sqlite_db_path = db_file
    init_db(db_file)
    yield
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except OSError:
            pass


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client

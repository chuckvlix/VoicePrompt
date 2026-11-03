from app.database import get_db_connection, init_db


def test_init_db_creates_table(tmp_path):
    custom_db = tmp_path / "custom.db"
    init_db(custom_db)

    with get_db_connection(custom_db) as conn:
        cursor = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='history'"
        )
        table = cursor.fetchone()
        assert table is not None
        assert table["name"] == "history"

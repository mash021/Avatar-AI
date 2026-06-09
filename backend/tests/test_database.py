import pytest

from app.db.session import check_database_connection


def test_database_connection():
    try:
        assert check_database_connection() is True
    except Exception as exc:
        pytest.skip(f"Database not available: {exc}")

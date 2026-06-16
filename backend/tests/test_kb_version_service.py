"""Tests for the knowledge-base version counter.

The KB version is a single integer stored in the `system_metadata` table under
the `kb_version` key. The frontend/clients poll it to know when cached answers
should be invalidated, so the important guarantees are: it starts at 0 when
missing, and every bump increases it by exactly one and persists.
"""

from app.models.system_metadata import SystemMetadata
from app.db.session import SessionLocal
from app.services.kb_version_service import (
    KB_VERSION_KEY,
    bump_kb_version,
    get_kb_version,
)


def test_get_kb_version_initializes_to_zero():
    db = SessionLocal()
    try:
        # Remove any pre-existing row so we exercise the "missing key" branch
        # that should lazily create the metadata row and return 0.
        db.query(SystemMetadata).filter(SystemMetadata.key == KB_VERSION_KEY).delete()
        db.commit()

        assert get_kb_version(db) == 0

        # The getter must have persisted the freshly created row.
        row = db.query(SystemMetadata).filter(SystemMetadata.key == KB_VERSION_KEY).first()
        assert row is not None
        assert row.value == "0"
    finally:
        db.close()


def test_bump_kb_version_increments_by_one():
    db = SessionLocal()
    try:
        # Compare against the current value instead of a hard-coded number so the
        # test stays correct regardless of how many bumps happened beforehand.
        before = get_kb_version(db)
        after = bump_kb_version(db)

        assert after == before + 1
        # The new value must be readable back from the database.
        assert get_kb_version(db) == after
    finally:
        db.close()


def test_bump_kb_version_is_monotonic_across_calls():
    db = SessionLocal()
    try:
        # Two consecutive bumps should advance the counter by two.
        start = get_kb_version(db)
        bump_kb_version(db)
        second = bump_kb_version(db)

        assert second == start + 2
    finally:
        db.close()

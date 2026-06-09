from sqlalchemy.orm import Session

from app.models.system_metadata import SystemMetadata

KB_VERSION_KEY = "kb_version"


def get_kb_version(db: Session) -> int:
    row = db.query(SystemMetadata).filter(SystemMetadata.key == KB_VERSION_KEY).first()
    if not row:
        row = SystemMetadata(key=KB_VERSION_KEY, value="0")
        db.add(row)
        db.commit()
        return 0
    return int(row.value)


def bump_kb_version(db: Session) -> int:
    version = get_kb_version(db) + 1
    row = db.query(SystemMetadata).filter(SystemMetadata.key == KB_VERSION_KEY).first()
    if row:
        row.value = str(version)
    else:
        db.add(SystemMetadata(key=KB_VERSION_KEY, value=str(version)))
    db.commit()
    return version

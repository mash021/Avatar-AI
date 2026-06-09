#!/usr/bin/env python3
"""Seed default admin user. Run from project root."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.db.session import SessionLocal
from app.models.user import User
from app.services.auth_service import create_user, hash_password

DEFAULT_EMAIL = "admin@example.com"
DEFAULT_PASSWORD = "admin123"
DEFAULT_NAME = "Admin User"


def main() -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == DEFAULT_EMAIL).first()
        if existing:
            print(f"Admin user already exists: {DEFAULT_EMAIL}")
            return

        create_user(
            db,
            email=DEFAULT_EMAIL,
            password=DEFAULT_PASSWORD,
            full_name=DEFAULT_NAME,
            role="admin",
        )
        print(f"Admin user created: {DEFAULT_EMAIL} / {DEFAULT_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    main()

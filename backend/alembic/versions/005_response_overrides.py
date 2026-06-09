"""Add response_overrides table

Revision ID: 005
Revises: 004
Create Date: 2026-06-09

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "response_overrides",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("original_message_id", UUID(as_uuid=True), nullable=False),
        sa.Column("improved_content", sa.Text(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["original_message_id"], ["chat_messages.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_response_overrides_original_message_id",
        "response_overrides",
        ["original_message_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_response_overrides_original_message_id", table_name="response_overrides")
    op.drop_table("response_overrides")

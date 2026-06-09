"""Add knowledge_chunks table

Revision ID: 003
Revises: 002
Create Date: 2026-06-09

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "knowledge_chunks",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column(
            "source_type",
            sa.Enum("url", "document", name="chunk_source_type"),
            nullable=False,
        ),
        sa.Column("source_id", UUID(as_uuid=True), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("source_page", sa.Integer(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("token_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("language", sa.String(length=10), nullable=False, server_default="mixed"),
        sa.Column("metadata", JSONB(), nullable=False, server_default="{}"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_knowledge_chunks_source", "knowledge_chunks", ["source_type", "source_id"])
    op.create_index("ix_knowledge_chunks_content_hash", "knowledge_chunks", ["content_hash"])


def downgrade() -> None:
    op.drop_index("ix_knowledge_chunks_content_hash", table_name="knowledge_chunks")
    op.drop_index("ix_knowledge_chunks_source", table_name="knowledge_chunks")
    op.drop_table("knowledge_chunks")
    op.execute("DROP TYPE IF EXISTS chunk_source_type")

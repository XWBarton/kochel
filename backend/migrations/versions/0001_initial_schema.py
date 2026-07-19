"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-07-18 20:39:09.260507

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _timestamp_columns() -> list[sa.Column]:
    return [
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    ]


def upgrade() -> None:
    op.create_table(
        "composers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("sort_name", sa.String(200), nullable=False),
        sa.Column("birth_year", sa.SmallInteger()),
        sa.Column("death_year", sa.SmallInteger()),
        sa.Column("period", sa.String(30)),
        *_timestamp_columns(),
    )
    op.create_index("ix_composers_sort_name", "composers", ["sort_name"])

    op.create_table(
        "people",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("sort_name", sa.String(200)),
        *_timestamp_columns(),
    )
    op.create_index("ix_people_sort_name", "people", ["sort_name"])

    op.create_table(
        "ensembles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        *_timestamp_columns(),
    )
    op.create_index("ix_ensembles_name", "ensembles", ["name"])

    op.create_table(
        "works",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "composer_id",
            sa.Integer(),
            sa.ForeignKey("composers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("subtitle", sa.String(200)),
        sa.Column("key", sa.String(20)),
        sa.Column("form", sa.String(50)),
        sa.Column("category", sa.String(30)),
        sa.Column("composed_year", sa.SmallInteger()),
        sa.Column(
            "composed_year_uncertain", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column("composed_year_range_end", sa.SmallInteger()),
        *_timestamp_columns(),
    )
    op.create_index("ix_works_composer_id", "works", ["composer_id"])
    op.create_index("ix_works_composer_id_title", "works", ["composer_id", "title"])
    op.create_index("ix_works_form", "works", ["form"])

    op.create_table(
        "work_catalogue_numbers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "work_id", sa.Integer(), sa.ForeignKey("works.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("system", sa.String(20), nullable=False),
        sa.Column("number", sa.String(50), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.false()),
        *_timestamp_columns(),
        sa.UniqueConstraint("work_id", "system", "number", name="uq_work_catalogue_number"),
    )
    op.create_index(
        "ix_work_catalogue_numbers_system_number", "work_catalogue_numbers", ["system", "number"]
    )

    op.create_table(
        "movements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "work_id", sa.Integer(), sa.ForeignKey("works.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("movement_number", sa.SmallInteger(), nullable=False),
        sa.Column("name", sa.String(200)),
        *_timestamp_columns(),
        sa.UniqueConstraint("work_id", "movement_number", name="uq_movement_work_number"),
    )
    op.create_index("ix_movements_work_id", "movements", ["work_id"])

    op.create_table(
        "recordings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "work_id", sa.Integer(), sa.ForeignKey("works.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "movement_id", sa.Integer(), sa.ForeignKey("movements.id", ondelete="SET NULL")
        ),
        sa.Column(
            "ensemble_id", sa.Integer(), sa.ForeignKey("ensembles.id", ondelete="SET NULL")
        ),
        sa.Column("label", sa.String(150)),
        sa.Column("recording_year", sa.SmallInteger()),
        sa.Column("release_year", sa.SmallInteger()),
        sa.Column(
            "is_default_in_library", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column("notes", sa.Text()),
        *_timestamp_columns(),
    )
    op.create_index("ix_recordings_work_id", "recordings", ["work_id"])
    op.create_index("ix_recordings_movement_id", "recordings", ["movement_id"])
    op.create_index("ix_recordings_ensemble_id", "recordings", ["ensemble_id"])
    # partial unique index: at most one default recording per work.
    # not expressible via SQLAlchemy's declarative UniqueConstraint (Postgres-specific
    # partial index), so this one is hand-written rather than autogenerated.
    op.execute(
        "CREATE UNIQUE INDEX uq_recordings_one_default_per_work "
        "ON recordings (work_id) WHERE is_default_in_library"
    )

    op.create_table(
        "recording_performers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "recording_id",
            sa.Integer(),
            sa.ForeignKey("recordings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("person_id", sa.Integer(), sa.ForeignKey("people.id"), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("instrument", sa.String(60)),
        sa.Column("credited_order", sa.SmallInteger()),
        *_timestamp_columns(),
    )
    op.create_index(
        "ix_recording_performers_recording_id", "recording_performers", ["recording_id"]
    )
    op.create_index("ix_recording_performers_person_id", "recording_performers", ["person_id"])
    op.create_index(
        "ix_recording_performers_person_id_role", "recording_performers", ["person_id", "role"]
    )

    op.create_table(
        "tracks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "recording_id",
            sa.Integer(),
            sa.ForeignKey("recordings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("file_path", sa.String(500), nullable=False, unique=True),
        sa.Column("track_number", sa.SmallInteger()),
        sa.Column("disc_number", sa.SmallInteger()),
        sa.Column("format", sa.String(10), nullable=False),
        sa.Column("duration_seconds", sa.Float(), nullable=False),
        sa.Column("bitrate_kbps", sa.Integer()),
        sa.Column("sample_rate_hz", sa.Integer()),
        sa.Column("channels", sa.SmallInteger()),
        sa.Column("file_size_bytes", sa.BigInteger()),
        sa.Column("embedded_tags", postgresql.JSONB()),
        sa.Column("checksum", sa.String(64)),
        *_timestamp_columns(),
    )
    op.create_index("ix_tracks_recording_id", "tracks", ["recording_id"])

    op.create_table(
        "track_movements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "track_id", sa.Integer(), sa.ForeignKey("tracks.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "movement_id",
            sa.Integer(),
            sa.ForeignKey("movements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("sequence", sa.SmallInteger(), nullable=False, server_default="1"),
        sa.Column("start_seconds", sa.Float()),
        sa.Column("duration_seconds_override", sa.Float()),
        *_timestamp_columns(),
        sa.UniqueConstraint("track_id", "movement_id", name="uq_track_movement"),
    )
    op.create_index("ix_track_movements_movement_id", "track_movements", ["movement_id"])


def downgrade() -> None:
    op.drop_table("track_movements")
    op.drop_table("tracks")
    op.drop_table("recording_performers")
    op.execute("DROP INDEX IF EXISTS uq_recordings_one_default_per_work")
    op.drop_table("recordings")
    op.drop_table("movements")
    op.drop_table("work_catalogue_numbers")
    op.drop_table("works")
    op.drop_table("ensembles")
    op.drop_table("people")
    op.drop_table("composers")

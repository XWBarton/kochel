from sqlalchemy import (
    BigInteger,
    Float,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Track(Base, TimestampMixin):
    __tablename__ = "tracks"
    __table_args__ = (Index("ix_tracks_recording_id", "recording_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    recording_id: Mapped[int] = mapped_column(
        ForeignKey("recordings.id", ondelete="CASCADE"), nullable=False
    )
    file_path: Mapped[str] = mapped_column(String(500), nullable=False, unique=True)
    track_number: Mapped[int | None] = mapped_column(SmallInteger)
    disc_number: Mapped[int | None] = mapped_column(SmallInteger)
    format: Mapped[str] = mapped_column(String(10), nullable=False)
    duration_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    bitrate_kbps: Mapped[int | None] = mapped_column(Integer)
    sample_rate_hz: Mapped[int | None] = mapped_column(Integer)
    channels: Mapped[int | None] = mapped_column(SmallInteger)
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger)
    embedded_tags: Mapped[dict | None] = mapped_column(JSONB)
    checksum: Mapped[str | None] = mapped_column(String(64))

    recording: Mapped["Recording"] = relationship(back_populates="tracks")
    track_movements: Mapped[list["TrackMovement"]] = relationship(
        back_populates="track", cascade="all, delete-orphan"
    )


class TrackMovement(Base, TimestampMixin):
    __tablename__ = "track_movements"
    __table_args__ = (
        UniqueConstraint("track_id", "movement_id", name="uq_track_movement"),
        Index("ix_track_movements_movement_id", "movement_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    track_id: Mapped[int] = mapped_column(ForeignKey("tracks.id", ondelete="CASCADE"), nullable=False)
    movement_id: Mapped[int] = mapped_column(
        ForeignKey("movements.id", ondelete="CASCADE"), nullable=False
    )
    sequence: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    start_seconds: Mapped[float | None] = mapped_column(Float)
    duration_seconds_override: Mapped[float | None] = mapped_column(Float)

    track: Mapped["Track"] = relationship(back_populates="track_movements")
    movement: Mapped["Movement"] = relationship()

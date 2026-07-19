from sqlalchemy import Boolean, ForeignKey, Index, SmallInteger, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Recording(Base, TimestampMixin):
    __tablename__ = "recordings"
    __table_args__ = (
        Index("ix_recordings_work_id", "work_id"),
        Index("ix_recordings_movement_id", "movement_id"),
        Index("ix_recordings_ensemble_id", "ensemble_id"),
        Index(
            "uq_recordings_one_default_per_work",
            "work_id",
            unique=True,
            postgresql_where=text("is_default_in_library"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    work_id: Mapped[int] = mapped_column(ForeignKey("works.id", ondelete="CASCADE"), nullable=False)
    movement_id: Mapped[int | None] = mapped_column(
        ForeignKey("movements.id", ondelete="SET NULL")
    )
    ensemble_id: Mapped[int | None] = mapped_column(
        ForeignKey("ensembles.id", ondelete="SET NULL")
    )
    label: Mapped[str | None] = mapped_column(String(150))
    recording_year: Mapped[int | None] = mapped_column(SmallInteger)
    release_year: Mapped[int | None] = mapped_column(SmallInteger)
    is_default_in_library: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notes: Mapped[str | None] = mapped_column(Text)

    work: Mapped["Work"] = relationship(back_populates="recordings")
    movement: Mapped["Movement | None"] = relationship()
    ensemble: Mapped["Ensemble | None"] = relationship()
    performers: Mapped[list["RecordingPerformer"]] = relationship(
        back_populates="recording", cascade="all, delete-orphan"
    )
    tracks: Mapped[list["Track"]] = relationship(
        back_populates="recording", cascade="all, delete-orphan"
    )


class RecordingPerformer(Base, TimestampMixin):
    __tablename__ = "recording_performers"
    __table_args__ = (
        Index("ix_recording_performers_recording_id", "recording_id"),
        Index("ix_recording_performers_person_id", "person_id"),
        Index("ix_recording_performers_person_id_role", "person_id", "role"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    recording_id: Mapped[int] = mapped_column(
        ForeignKey("recordings.id", ondelete="CASCADE"), nullable=False
    )
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    instrument: Mapped[str | None] = mapped_column(String(60))
    credited_order: Mapped[int | None] = mapped_column(SmallInteger)

    recording: Mapped["Recording"] = relationship(back_populates="performers")
    person: Mapped["Person"] = relationship()

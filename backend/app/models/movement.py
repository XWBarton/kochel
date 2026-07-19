from sqlalchemy import ForeignKey, Index, SmallInteger, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Movement(Base, TimestampMixin):
    __tablename__ = "movements"
    __table_args__ = (
        UniqueConstraint("work_id", "movement_number", name="uq_movement_work_number"),
        Index("ix_movements_work_id", "work_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    work_id: Mapped[int] = mapped_column(ForeignKey("works.id", ondelete="CASCADE"), nullable=False)
    movement_number: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    name: Mapped[str | None] = mapped_column(String(200))

    work: Mapped["Work"] = relationship(back_populates="movements")

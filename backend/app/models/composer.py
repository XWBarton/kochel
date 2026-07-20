from sqlalchemy import Float, Index, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Composer(Base, TimestampMixin):
    __tablename__ = "composers"
    __table_args__ = (Index("ix_composers_sort_name", "sort_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    sort_name: Mapped[str] = mapped_column(String(200), nullable=False)
    birth_year: Mapped[int | None] = mapped_column(SmallInteger)
    death_year: Mapped[int | None] = mapped_column(SmallInteger)
    period: Mapped[str | None] = mapped_column(String(30))
    image_filename: Mapped[str | None] = mapped_column(String(255))
    # relative focal point within the image, 0..1 — where CSS object-position
    # should center the circular crop; set via the reposition drag control
    image_focal_x: Mapped[float] = mapped_column(Float, nullable=False, server_default="0.5")
    image_focal_y: Mapped[float] = mapped_column(Float, nullable=False, server_default="0.5")

    works: Mapped[list["Work"]] = relationship(back_populates="composer", cascade="all, delete-orphan")

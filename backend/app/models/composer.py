from sqlalchemy import Index, SmallInteger, String
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

    works: Mapped[list["Work"]] = relationship(back_populates="composer", cascade="all, delete-orphan")

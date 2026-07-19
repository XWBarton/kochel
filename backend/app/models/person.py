from sqlalchemy import Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Person(Base, TimestampMixin):
    __tablename__ = "people"
    __table_args__ = (Index("ix_people_sort_name", "sort_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    sort_name: Mapped[str | None] = mapped_column(String(200))

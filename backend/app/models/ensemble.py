from sqlalchemy import Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Ensemble(Base, TimestampMixin):
    __tablename__ = "ensembles"
    __table_args__ = (Index("ix_ensembles_name", "name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)

from sqlalchemy import Boolean, ForeignKey, Index, SmallInteger, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Work(Base, TimestampMixin):
    __tablename__ = "works"
    __table_args__ = (
        Index("ix_works_composer_id", "composer_id"),
        Index("ix_works_composer_id_title", "composer_id", "title"),
        Index("ix_works_form", "form"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    composer_id: Mapped[int] = mapped_column(
        ForeignKey("composers.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    subtitle: Mapped[str | None] = mapped_column(String(200))
    key: Mapped[str | None] = mapped_column(String(20))
    form: Mapped[str | None] = mapped_column(String(50))
    category: Mapped[str | None] = mapped_column(String(30))
    composed_year: Mapped[int | None] = mapped_column(SmallInteger)
    composed_year_uncertain: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    composed_year_range_end: Mapped[int | None] = mapped_column(SmallInteger)

    composer: Mapped["Composer"] = relationship(back_populates="works")
    catalogue_numbers: Mapped[list["WorkCatalogueNumber"]] = relationship(
        back_populates="work", cascade="all, delete-orphan"
    )
    movements: Mapped[list["Movement"]] = relationship(
        back_populates="work", cascade="all, delete-orphan", order_by="Movement.movement_number"
    )
    recordings: Mapped[list["Recording"]] = relationship(
        back_populates="work", cascade="all, delete-orphan"
    )


class WorkCatalogueNumber(Base, TimestampMixin):
    __tablename__ = "work_catalogue_numbers"
    __table_args__ = (
        UniqueConstraint("work_id", "system", "number", name="uq_work_catalogue_number"),
        Index("ix_work_catalogue_numbers_system_number", "system", "number"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    work_id: Mapped[int] = mapped_column(ForeignKey("works.id", ondelete="CASCADE"), nullable=False)
    system: Mapped[str] = mapped_column(String(20), nullable=False)
    number: Mapped[str] = mapped_column(String(50), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    work: Mapped["Work"] = relationship(back_populates="catalogue_numbers")

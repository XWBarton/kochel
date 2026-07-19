"""Flat, unscoped listings — 'browse by X' entry points that don't hang off
a single composer or work (e.g. the iOS Library Home's Works/Conductors tabs)."""

from fastapi import APIRouter
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep
from app.models import Person, Recording, Work
from app.models.recording import RecordingPerformer
from app.schemas.conductor import ConductorListResponse, ConductorSummary
from app.schemas.work import WorkBrowseItem, WorkBrowseResponse

router = APIRouter(tags=["browse"])


@router.get("/works", response_model=WorkBrowseResponse)
async def list_all_works(session: SessionDep) -> WorkBrowseResponse:
    stmt = (
        select(Work)
        .options(selectinload(Work.composer), selectinload(Work.recordings))
        .order_by(Work.title)
    )
    works = (await session.execute(stmt)).scalars().all()
    items = [
        WorkBrowseItem(
            id=w.id,
            title=w.title,
            category=w.category,
            composer_id=w.composer_id,
            composer_name=w.composer.name,
            recording_count=len(w.recordings),
        )
        for w in works
    ]
    return WorkBrowseResponse(items=items, total=len(items))


@router.get("/conductors", response_model=ConductorListResponse)
async def list_conductors(session: SessionDep) -> ConductorListResponse:
    stmt = (
        select(
            Person,
            func.count(func.distinct(Recording.id)).label("recording_count"),
            func.count(func.distinct(Recording.work_id)).label("work_count"),
        )
        .join(RecordingPerformer, RecordingPerformer.person_id == Person.id)
        .join(Recording, Recording.id == RecordingPerformer.recording_id)
        .where(RecordingPerformer.role == "conductor")
        .group_by(Person.id)
        .order_by(Person.sort_name, Person.name)
    )
    rows = (await session.execute(stmt)).all()
    items = [
        ConductorSummary(id=person.id, name=person.name, recording_count=rc, work_count=wc)
        for person, rc, wc in rows
    ]
    return ConductorListResponse(items=items, total=len(items))

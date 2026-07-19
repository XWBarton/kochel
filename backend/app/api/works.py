from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep
from app.models import Composer, Recording, Work
from app.models.recording import RecordingPerformer
from app.models.track import Track
from app.schemas.recording import RecordingListItem, RecordingListResponse
from app.schemas.work import MovementOut, WorkDetail, WorkListItem, WorkListResponse

router = APIRouter(tags=["works"])


def _work_options():
    return (
        selectinload(Work.catalogue_numbers),
        selectinload(Work.movements),
        selectinload(Work.recordings),
    )


def _to_work_list_item(work: Work) -> WorkListItem:
    return WorkListItem.model_validate(
        {
            **work.__dict__,
            "movement_count": len(work.movements),
            "recording_count": len(work.recordings),
        }
    )


@router.get("/composers/{composer_id}/works", response_model=WorkListResponse)
async def list_works_for_composer(composer_id: int, session: SessionDep) -> WorkListResponse:
    composer = await session.get(Composer, composer_id)
    if composer is None:
        raise HTTPException(status_code=404, detail="Composer not found")

    stmt = (
        select(Work)
        .where(Work.composer_id == composer_id)
        .options(*_work_options())
        .order_by(Work.category, Work.title)
    )
    result = await session.execute(stmt)
    works = result.scalars().all()
    items = [_to_work_list_item(w) for w in works]
    return WorkListResponse(items=items, total=len(items))


@router.get("/works/{work_id}", response_model=WorkDetail)
async def get_work(work_id: int, session: SessionDep) -> WorkDetail:
    stmt = (
        select(Work)
        .where(Work.id == work_id)
        .options(*_work_options(), selectinload(Work.composer))
    )
    result = await session.execute(stmt)
    work = result.scalar_one_or_none()
    if work is None:
        raise HTTPException(status_code=404, detail="Work not found")

    base = _to_work_list_item(work)
    return WorkDetail.model_validate(
        {
            **base.model_dump(),
            "composer_id": work.composer_id,
            "composer_name": work.composer.name,
            "movements": [MovementOut.model_validate(m) for m in work.movements],
        }
    )


@router.get("/works/{work_id}/recordings", response_model=RecordingListResponse)
async def list_recordings_for_work(work_id: int, session: SessionDep) -> RecordingListResponse:
    work = await session.get(Work, work_id)
    if work is None:
        raise HTTPException(status_code=404, detail="Work not found")

    stmt = (
        select(Recording)
        .where(Recording.work_id == work_id)
        .options(
            selectinload(Recording.ensemble),
            selectinload(Recording.performers).selectinload(RecordingPerformer.person),
            selectinload(Recording.tracks).selectinload(Track.track_movements),
        )
        .order_by(Recording.is_default_in_library.desc(), Recording.recording_year)
    )
    result = await session.execute(stmt)
    recordings = result.scalars().unique().all()

    items = []
    for recording in recordings:
        tracks_out = [
            {
                **track.__dict__,
                "movement_ids": [tm.movement_id for tm in track.track_movements],
                "track_movements": track.track_movements,
            }
            for track in recording.tracks
        ]
        total_duration = sum(track.duration_seconds for track in recording.tracks)
        items.append(
            RecordingListItem.model_validate(
                {
                    **recording.__dict__,
                    "tracks": tracks_out,
                    "total_duration_seconds": total_duration,
                }
            )
        )

    return RecordingListResponse(items=items, total=len(items))

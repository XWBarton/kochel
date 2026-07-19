from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep
from app.api.import_ import _get_or_create_ensemble, _get_or_create_person
from app.models import Composer, Ensemble, Person, Recording, Work
from app.models.recording import RecordingPerformer
from app.models.track import Track
from app.schemas.import_ import ImportRecordingIn
from app.schemas.recording import RecordingListItem, RecordingListResponse
from app.schemas.work import MovementOut, WorkDetail, WorkListItem, WorkListResponse

router = APIRouter(tags=["works"])


def _recording_options():
    return (
        selectinload(Recording.ensemble),
        selectinload(Recording.performers).selectinload(RecordingPerformer.person),
        selectinload(Recording.tracks).selectinload(Track.track_movements),
    )


def _to_recording_list_item(recording: Recording) -> RecordingListItem:
    tracks_out = [
        {
            **track.__dict__,
            "movement_ids": [tm.movement_id for tm in track.track_movements],
            "track_movements": track.track_movements,
        }
        for track in recording.tracks
    ]
    total_duration = sum(track.duration_seconds for track in recording.tracks)
    return RecordingListItem.model_validate(
        {
            **recording.__dict__,
            "tracks": tracks_out,
            "total_duration_seconds": total_duration,
        }
    )


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


@router.delete("/works/{work_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_work(work_id: int, session: SessionDep) -> None:
    """Deletes a work and everything under it (movements, recordings,
    tracks) via the DB's ON DELETE CASCADE — the composer row and any other
    works it has are untouched. Does not remove the underlying audio files
    on disk."""
    work = await session.get(Work, work_id)
    if work is None:
        raise HTTPException(status_code=404, detail="Work not found")
    await session.delete(work)
    await session.commit()


@router.get("/works/{work_id}/recordings", response_model=RecordingListResponse)
async def list_recordings_for_work(work_id: int, session: SessionDep) -> RecordingListResponse:
    work = await session.get(Work, work_id)
    if work is None:
        raise HTTPException(status_code=404, detail="Work not found")

    stmt = (
        select(Recording)
        .where(Recording.work_id == work_id)
        .options(*_recording_options())
        .order_by(Recording.is_default_in_library.desc(), Recording.recording_year)
    )
    result = await session.execute(stmt)
    recordings = result.scalars().unique().all()

    items = [_to_recording_list_item(r) for r in recordings]
    return RecordingListResponse(items=items, total=len(items))


@router.put("/recordings/{recording_id}", response_model=RecordingListItem)
async def update_recording(recording_id: int, payload: ImportRecordingIn, session: SessionDep) -> RecordingListItem:
    """Edits an existing recording's metadata and replaces its performer
    list wholesale. Tracks/movement mapping aren't touched here — that's
    fixed at import time, not something you'd casually re-map."""
    recording = await session.get(Recording, recording_id)
    if recording is None:
        raise HTTPException(status_code=404, detail="Recording not found")

    ensemble = None
    if payload.ensemble_id is not None:
        ensemble = await session.get(Ensemble, payload.ensemble_id)
        if ensemble is None:
            raise HTTPException(status_code=404, detail="Ensemble not found")
    elif payload.ensemble_name:
        ensemble = await _get_or_create_ensemble(session, payload.ensemble_name)

    recording.ensemble_id = ensemble.id if ensemble else None
    recording.label = payload.label
    recording.recording_year = payload.recording_year
    recording.release_year = payload.release_year
    recording.notes = payload.notes
    recording.is_default_in_library = payload.is_default_in_library

    existing_performers = (
        await session.execute(select(RecordingPerformer).where(RecordingPerformer.recording_id == recording_id))
    ).scalars().all()
    for performer in existing_performers:
        await session.delete(performer)
    await session.flush()

    for p_in in payload.performers:
        if p_in.person_id is not None:
            person = await session.get(Person, p_in.person_id)
            if person is None:
                raise HTTPException(status_code=404, detail=f"Person {p_in.person_id} not found")
        else:
            if not p_in.name:
                raise HTTPException(
                    status_code=400, detail="Performer name is required when not referencing an existing person"
                )
            person = await _get_or_create_person(session, p_in.name, p_in.sort_name)
        session.add(
            RecordingPerformer(
                recording_id=recording_id,
                person_id=person.id,
                role=p_in.role,
                instrument=p_in.instrument,
                credited_order=p_in.credited_order,
            )
        )

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=409, detail="Another recording is already marked as default for this work"
        )

    stmt = select(Recording).where(Recording.id == recording_id).options(*_recording_options())
    result = await session.execute(stmt)
    fresh = result.scalar_one()
    return _to_recording_list_item(fresh)

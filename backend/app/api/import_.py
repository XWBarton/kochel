from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep
from app.config import settings
from app.ingest.scanner import scan_file, scan_library
from app.ingest.upload import UploadRejected, resolve_upload_destination
from app.integrations import openopus
from app.models import (
    Composer,
    Ensemble,
    Movement,
    Person,
    Recording,
    RecordingPerformer,
    Track,
    TrackMovement,
    Work,
    WorkCatalogueNumber,
)
from app.schemas.import_ import (
    ComposerSearchResult,
    EnsembleSearchResult,
    ImportCommitRequest,
    ImportCommitResponse,
    PersonSearchResult,
    ScanFileOut,
    ScanGroupOut,
    ScanResponse,
    UploadedFileResult,
    UploadResponse,
    WorkSearchResult,
)

router = APIRouter(prefix="/import", tags=["import"])

SEARCH_LIMIT = 15
UPLOAD_CHUNK_SIZE = 1024 * 1024


@router.post("/upload", response_model=UploadResponse)
async def upload(files: list[UploadFile] = File(...)) -> UploadResponse:
    """Writes uploaded files into MUSIC_LIBRARY_ROOT, preserving whatever
    relative folder structure the browser sent (each UploadFile.filename is
    the full relative path — see the client, which sets it from
    File.webkitRelativePath when uploading a whole album folder). Existing
    files at the same path are left untouched rather than overwritten."""
    results: list[UploadedFileResult] = []

    for upload_file in files:
        relative_path = upload_file.filename or ""
        try:
            destination = resolve_upload_destination(relative_path)
        except UploadRejected as exc:
            results.append(
                UploadedFileResult(relative_path=relative_path, status="rejected", detail=exc.reason)
            )
            continue

        if destination.exists():
            results.append(
                UploadedFileResult(
                    relative_path=relative_path,
                    status="skipped",
                    detail="a file already exists at this path",
                    file_size_bytes=destination.stat().st_size,
                )
            )
            continue

        destination.parent.mkdir(parents=True, exist_ok=True)
        size = 0
        with destination.open("wb") as f:
            while chunk := await upload_file.read(UPLOAD_CHUNK_SIZE):
                f.write(chunk)
                size += len(chunk)

        results.append(
            UploadedFileResult(
                relative_path=relative_path, status="saved", detail="uploaded", file_size_bytes=size
            )
        )

    return UploadResponse(
        results=results,
        saved_count=sum(1 for r in results if r.status == "saved"),
        skipped_count=sum(1 for r in results if r.status == "skipped"),
        rejected_count=sum(1 for r in results if r.status == "rejected"),
    )


@router.get("/scan", response_model=ScanResponse)
async def scan(session: SessionDep) -> ScanResponse:
    result = await session.execute(select(Track.file_path))
    existing_paths = set(result.scalars().all())

    groups = scan_library(existing_paths)
    total_files = sum(len(g.files) for g in groups)
    return ScanResponse(
        groups=[
            ScanGroupOut(
                relative_dir=g.relative_dir,
                files=[ScanFileOut(**f.__dict__) for f in g.files],
            )
            for g in groups
        ],
        total_files=total_files,
    )


@router.get("/composers/search", response_model=list[ComposerSearchResult])
async def search_composers(session: SessionDep, q: str = Query(min_length=1)) -> list[ComposerSearchResult]:
    stmt = (
        select(Composer)
        .where(
            or_(
                Composer.name.ilike(f"%{q}%"),
                Composer.sort_name.ilike(f"%{q}%"),
            )
        )
        .order_by(Composer.sort_name)
        .limit(SEARCH_LIMIT)
    )
    result = await session.execute(stmt)
    library_results = [
        ComposerSearchResult(
            source="library",
            id=c.id,
            name=c.name,
            sort_name=c.sort_name,
            birth_year=c.birth_year,
            death_year=c.death_year,
            period=c.period,
        )
        for c in result.scalars().all()
    ]

    openopus_matches = await openopus.search_composers(q)
    library_names = {r.name.lower() for r in library_results}
    openopus_results = [
        ComposerSearchResult(
            source="openopus",
            openopus_id=m["openopus_id"],
            name=m["name"],
            birth_year=m["birth_year"],
            death_year=m["death_year"],
            period=m["period"],
        )
        for m in openopus_matches
        if m["name"].lower() not in library_names
    ]

    return library_results + openopus_results


@router.get("/works/search", response_model=list[WorkSearchResult])
async def search_works(
    session: SessionDep, composer_id: int, q: str | None = Query(default=None)
) -> list[WorkSearchResult]:
    stmt = (
        select(Work)
        .where(Work.composer_id == composer_id)
        .options(selectinload(Work.movements))
        .order_by(Work.title)
    )
    if q:
        stmt = stmt.where(Work.title.ilike(f"%{q}%"))
    result = await session.execute(stmt)
    return [
        WorkSearchResult(
            source="library", id=w.id, title=w.title, category=w.category, movement_count=len(w.movements)
        )
        for w in result.scalars().all()
    ]


@router.get("/openopus/works", response_model=list[WorkSearchResult])
async def search_openopus_works(
    openopus_composer_id: str, q: str | None = Query(default=None)
) -> list[WorkSearchResult]:
    works = await openopus.list_works_for_composer(openopus_composer_id)
    if q:
        q_lower = q.lower()
        works = [w for w in works if q_lower in w["title"].lower()]
    return [
        WorkSearchResult(source="openopus", title=w["title"], category=w["genre"])
        for w in works[:SEARCH_LIMIT]
    ]


@router.get("/ensembles/search", response_model=list[EnsembleSearchResult])
async def search_ensembles(session: SessionDep, q: str = Query(min_length=1)) -> list[EnsembleSearchResult]:
    stmt = select(Ensemble).where(Ensemble.name.ilike(f"%{q}%")).order_by(Ensemble.name).limit(SEARCH_LIMIT)
    result = await session.execute(stmt)
    return [EnsembleSearchResult(id=e.id, name=e.name) for e in result.scalars().all()]


@router.get("/people/search", response_model=list[PersonSearchResult])
async def search_people(session: SessionDep, q: str = Query(min_length=1)) -> list[PersonSearchResult]:
    stmt = select(Person).where(Person.name.ilike(f"%{q}%")).order_by(Person.name).limit(SEARCH_LIMIT)
    result = await session.execute(stmt)
    return [PersonSearchResult(id=p.id, name=p.name) for p in result.scalars().all()]


async def _get_or_create_ensemble(session: AsyncSession, name: str) -> Ensemble:
    stmt = select(Ensemble).where(func.lower(Ensemble.name) == name.lower())
    result = await session.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing is not None:
        return existing
    ensemble = Ensemble(name=name)
    session.add(ensemble)
    await session.flush()
    return ensemble


async def _get_or_create_person(session: AsyncSession, name: str, sort_name: str | None) -> Person:
    stmt = select(Person).where(func.lower(Person.name) == name.lower())
    result = await session.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing is not None:
        return existing
    person = Person(name=name, sort_name=sort_name)
    session.add(person)
    await session.flush()
    return person


@router.post("/commit", response_model=ImportCommitResponse)
async def commit_import(payload: ImportCommitRequest, session: SessionDep) -> ImportCommitResponse:
    if not payload.tracks:
        raise HTTPException(status_code=400, detail="At least one track is required")

    movement_by_number: dict[int, Movement] = {}

    if payload.work.id is not None:
        work = await session.get(Work, payload.work.id, options=[selectinload(Work.movements)])
        if work is None:
            raise HTTPException(status_code=404, detail="Work not found")
        composer = await session.get(Composer, work.composer_id)
        for m in work.movements:
            movement_by_number[m.movement_number] = m
    else:
        if payload.composer.id is not None:
            composer = await session.get(Composer, payload.composer.id)
            if composer is None:
                raise HTTPException(status_code=404, detail="Composer not found")
        else:
            if not payload.composer.name:
                raise HTTPException(
                    status_code=400, detail="Composer name is required when creating a new composer"
                )
            composer = Composer(
                name=payload.composer.name,
                sort_name=payload.composer.sort_name or payload.composer.name,
                birth_year=payload.composer.birth_year,
                death_year=payload.composer.death_year,
                period=payload.composer.period,
            )
            session.add(composer)
            await session.flush()

        if not payload.work.title:
            raise HTTPException(status_code=400, detail="Work title is required when creating a new work")
        if not payload.work.movements:
            raise HTTPException(
                status_code=400, detail="At least one movement is required when creating a new work"
            )

        work = Work(
            composer_id=composer.id,
            title=payload.work.title,
            subtitle=payload.work.subtitle,
            key=payload.work.key,
            form=payload.work.form,
            category=payload.work.category,
            composed_year=payload.work.composed_year,
            composed_year_uncertain=payload.work.composed_year_uncertain,
            composed_year_range_end=payload.work.composed_year_range_end,
        )
        session.add(work)
        await session.flush()

        for cn in payload.work.catalogue_numbers:
            session.add(
                WorkCatalogueNumber(
                    work_id=work.id, system=cn.system, number=cn.number, is_primary=cn.is_primary
                )
            )
        for m_in in payload.work.movements:
            movement = Movement(work_id=work.id, movement_number=m_in.movement_number, name=m_in.name)
            session.add(movement)
            movement_by_number[m_in.movement_number] = movement
        await session.flush()

    ensemble = None
    if payload.recording.ensemble_id is not None:
        ensemble = await session.get(Ensemble, payload.recording.ensemble_id)
        if ensemble is None:
            raise HTTPException(status_code=404, detail="Ensemble not found")
    elif payload.recording.ensemble_name:
        ensemble = await _get_or_create_ensemble(session, payload.recording.ensemble_name)

    recording = Recording(
        work_id=work.id,
        ensemble_id=ensemble.id if ensemble else None,
        label=payload.recording.label,
        recording_year=payload.recording.recording_year,
        release_year=payload.recording.release_year,
        notes=payload.recording.notes,
        is_default_in_library=payload.recording.is_default_in_library,
    )
    session.add(recording)
    try:
        await session.flush()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=409, detail="Another recording is already marked as default for this work"
        )

    for p_in in payload.recording.performers:
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
                recording_id=recording.id,
                person_id=person.id,
                role=p_in.role,
                instrument=p_in.instrument,
                credited_order=p_in.credited_order,
            )
        )

    track_ids: list[int] = []
    for t_in in payload.tracks:
        abs_path = settings.music_library_root / t_in.relative_path
        if not abs_path.is_file():
            raise HTTPException(status_code=404, detail=f"File not found on disk: {t_in.relative_path}")

        scanned = scan_file(abs_path, t_in.relative_path)
        if scanned is None:
            raise HTTPException(status_code=422, detail=f"Could not read audio file: {t_in.relative_path}")

        movements = []
        for num in t_in.movement_numbers:
            if num not in movement_by_number:
                raise HTTPException(
                    status_code=400, detail=f"Movement number {num} does not exist on this work"
                )
            movements.append(movement_by_number[num])
        if not movements:
            raise HTTPException(
                status_code=400, detail=f"Track {t_in.relative_path} must be mapped to at least one movement"
            )

        track = Track(
            recording_id=recording.id,
            file_path=t_in.relative_path,
            track_number=t_in.track_number,
            disc_number=t_in.disc_number,
            format=scanned.format,
            duration_seconds=scanned.duration_seconds,
            bitrate_kbps=scanned.bitrate_kbps,
            sample_rate_hz=scanned.sample_rate_hz,
            channels=scanned.channels,
            file_size_bytes=scanned.file_size_bytes,
            embedded_tags=scanned.tags,
        )
        session.add(track)
        try:
            await session.flush()
        except IntegrityError:
            await session.rollback()
            raise HTTPException(status_code=409, detail=f"Track already imported: {t_in.relative_path}")

        for sequence, movement in enumerate(movements, start=1):
            session.add(TrackMovement(track_id=track.id, movement_id=movement.id, sequence=sequence))
        track_ids.append(track.id)

    await session.commit()
    return ImportCommitResponse(
        composer_id=composer.id, work_id=work.id, recording_id=recording.id, track_ids=track_ids
    )

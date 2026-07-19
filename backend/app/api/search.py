from fastapi import APIRouter, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep
from app.models import Composer, Ensemble, Person, Recording, RecordingPerformer, Work
from app.schemas.search import SearchComposerResult, SearchRecordingResult, SearchResponse, SearchWorkResult

router = APIRouter(tags=["search"])

SEARCH_LIMIT = 10


@router.get("/search", response_model=SearchResponse)
async def search(session: SessionDep, q: str = Query(min_length=1)) -> SearchResponse:
    like = f"%{q}%"

    composer_stmt = (
        select(Composer, func.count(Work.id).label("work_count"))
        .outerjoin(Work, Work.composer_id == Composer.id)
        .where(Composer.name.ilike(like))
        .group_by(Composer.id)
        .order_by(Composer.sort_name)
        .limit(SEARCH_LIMIT)
    )
    composers = [
        SearchComposerResult(
            id=c.id, name=c.name, birth_year=c.birth_year, death_year=c.death_year, work_count=work_count
        )
        for c, work_count in (await session.execute(composer_stmt)).all()
    ]

    work_stmt = (
        select(Work)
        .where(Work.title.ilike(like))
        .options(selectinload(Work.composer))
        .order_by(Work.title)
        .limit(SEARCH_LIMIT)
    )
    works = [
        SearchWorkResult(id=w.id, title=w.title, composer_id=w.composer_id, composer_name=w.composer.name)
        for w in (await session.execute(work_stmt)).scalars().all()
    ]

    # matches on ensemble name OR any credited performer/conductor name, per the
    # design spec's "live-filtering across composer/work/conductor/performer names"
    recording_stmt = (
        select(Recording)
        .distinct()
        .outerjoin(Recording.ensemble)
        .outerjoin(Recording.performers)
        .outerjoin(RecordingPerformer.person)
        .where(or_(Ensemble.name.ilike(like), Person.name.ilike(like)))
        .options(
            selectinload(Recording.work).selectinload(Work.composer),
            selectinload(Recording.ensemble),
            selectinload(Recording.performers).selectinload(RecordingPerformer.person),
        )
        .order_by(Recording.recording_year.desc().nullslast())
        .limit(SEARCH_LIMIT)
    )
    recordings = []
    for r in (await session.execute(recording_stmt)).unique().scalars().all():
        conductor = next((p for p in r.performers if p.role == "conductor"), None)
        recordings.append(
            SearchRecordingResult(
                id=r.id,
                work_id=r.work_id,
                work_title=r.work.title,
                composer_name=r.work.composer.name,
                ensemble_name=r.ensemble.name if r.ensemble else None,
                conductor_name=conductor.person.name if conductor else None,
                label=r.label,
                recording_year=r.recording_year,
            )
        )

    return SearchResponse(query=q, composers=composers, works=works, recordings=recordings)

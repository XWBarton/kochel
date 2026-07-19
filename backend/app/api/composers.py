from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select

from app.api.deps import SessionDep
from app.models import Composer, Work
from app.schemas.composer import ComposerListItem, ComposerListResponse, ComposerUpdate

router = APIRouter(prefix="/composers", tags=["composers"])


def _list_query():
    return (
        select(Composer, func.count(Work.id).label("work_count"))
        .outerjoin(Work, Work.composer_id == Composer.id)
        .group_by(Composer.id)
        .order_by(Composer.sort_name)
    )


@router.get("", response_model=ComposerListResponse)
async def list_composers(session: SessionDep) -> ComposerListResponse:
    result = await session.execute(_list_query())
    items = [
        ComposerListItem.model_validate({**composer.__dict__, "work_count": work_count})
        for composer, work_count in result.all()
    ]
    return ComposerListResponse(items=items, total=len(items))


@router.get("/{composer_id}", response_model=ComposerListItem)
async def get_composer(composer_id: int, session: SessionDep) -> ComposerListItem:
    result = await session.execute(_list_query().where(Composer.id == composer_id))
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Composer not found")
    composer, work_count = row
    return ComposerListItem.model_validate({**composer.__dict__, "work_count": work_count})


@router.put("/{composer_id}", response_model=ComposerListItem)
async def update_composer(composer_id: int, payload: ComposerUpdate, session: SessionDep) -> ComposerListItem:
    composer = await session.get(Composer, composer_id)
    if composer is None:
        raise HTTPException(status_code=404, detail="Composer not found")
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")

    composer.name = payload.name
    composer.sort_name = payload.sort_name or payload.name
    composer.birth_year = payload.birth_year
    composer.death_year = payload.death_year
    composer.period = payload.period
    await session.commit()

    result = await session.execute(_list_query().where(Composer.id == composer_id))
    composer, work_count = result.first()
    return ComposerListItem.model_validate({**composer.__dict__, "work_count": work_count})

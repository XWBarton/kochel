from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func, select

from app.api.deps import SessionDep
from app.config import settings
from app.models import Composer, Work
from app.schemas.composer import (
    ComposerImagePositionUpdate,
    ComposerListItem,
    ComposerListResponse,
    ComposerUpdate,
)

router = APIRouter(prefix="/composers", tags=["composers"])

IMAGE_CONTENT_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
IMAGE_MEDIA_TYPES = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024
IMAGE_CHUNK_SIZE = 1024 * 1024


def _list_query():
    return (
        select(Composer, func.count(Work.id).label("work_count"))
        .outerjoin(Work, Work.composer_id == Composer.id)
        .group_by(Composer.id)
        .order_by(Composer.sort_name)
    )


def _image_url(composer: Composer) -> str | None:
    if not composer.image_filename:
        return None
    version = int(composer.updated_at.timestamp())
    return f"/api/v1/composers/{composer.id}/image?v={version}"


def _to_list_item(composer: Composer, work_count: int) -> ComposerListItem:
    return ComposerListItem.model_validate(
        {**composer.__dict__, "work_count": work_count, "image_url": _image_url(composer)}
    )


@router.get("", response_model=ComposerListResponse)
async def list_composers(session: SessionDep) -> ComposerListResponse:
    result = await session.execute(_list_query())
    items = [_to_list_item(composer, work_count) for composer, work_count in result.all()]
    return ComposerListResponse(items=items, total=len(items))


@router.get("/{composer_id}", response_model=ComposerListItem)
async def get_composer(composer_id: int, session: SessionDep) -> ComposerListItem:
    result = await session.execute(_list_query().where(Composer.id == composer_id))
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Composer not found")
    composer, work_count = row
    return _to_list_item(composer, work_count)


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
    return _to_list_item(composer, work_count)


@router.put("/{composer_id}/image", response_model=ComposerListItem)
async def update_composer_image(composer_id: int, session: SessionDep, file: UploadFile = File(...)) -> ComposerListItem:
    composer = await session.get(Composer, composer_id)
    if composer is None:
        raise HTTPException(status_code=404, detail="Composer not found")

    ext = IMAGE_CONTENT_TYPES.get(file.content_type or "")
    if ext is None:
        raise HTTPException(status_code=422, detail="Image must be JPEG, PNG, or WebP")

    settings.composer_images_root.mkdir(parents=True, exist_ok=True)
    destination = settings.composer_images_root / f"{composer_id}.{ext}"

    size = 0
    with destination.open("wb") as f:
        while chunk := await file.read(IMAGE_CHUNK_SIZE):
            size += len(chunk)
            if size > MAX_IMAGE_BYTES:
                f.close()
                destination.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="Image must be smaller than 10MB")
            f.write(chunk)

    if composer.image_filename and composer.image_filename != destination.name:
        (settings.composer_images_root / composer.image_filename).unlink(missing_ok=True)

    composer.image_filename = destination.name
    composer.image_focal_x = 0.5
    composer.image_focal_y = 0.5
    await session.commit()

    result = await session.execute(_list_query().where(Composer.id == composer_id))
    composer, work_count = result.first()
    return _to_list_item(composer, work_count)


@router.delete("/{composer_id}/image", response_model=ComposerListItem)
async def delete_composer_image(composer_id: int, session: SessionDep) -> ComposerListItem:
    composer = await session.get(Composer, composer_id)
    if composer is None:
        raise HTTPException(status_code=404, detail="Composer not found")

    if composer.image_filename:
        (settings.composer_images_root / composer.image_filename).unlink(missing_ok=True)
        composer.image_filename = None
        composer.image_focal_x = 0.5
        composer.image_focal_y = 0.5
        await session.commit()

    result = await session.execute(_list_query().where(Composer.id == composer_id))
    composer, work_count = result.first()
    return _to_list_item(composer, work_count)


@router.patch("/{composer_id}/image/position", response_model=ComposerListItem)
async def update_composer_image_position(
    composer_id: int, payload: ComposerImagePositionUpdate, session: SessionDep
) -> ComposerListItem:
    composer = await session.get(Composer, composer_id)
    if composer is None:
        raise HTTPException(status_code=404, detail="Composer not found")
    if not composer.image_filename:
        raise HTTPException(status_code=400, detail="Composer has no image to position")

    composer.image_focal_x = payload.focal_x
    composer.image_focal_y = payload.focal_y
    await session.commit()

    result = await session.execute(_list_query().where(Composer.id == composer_id))
    composer, work_count = result.first()
    return _to_list_item(composer, work_count)


@router.get("/{composer_id}/image")
async def get_composer_image(composer_id: int, session: SessionDep) -> FileResponse:
    composer = await session.get(Composer, composer_id)
    if composer is None or not composer.image_filename:
        raise HTTPException(status_code=404, detail="No image for this composer")

    abs_path = settings.composer_images_root / composer.image_filename
    if not abs_path.is_file():
        raise HTTPException(status_code=404, detail="Image file missing on disk")

    ext = abs_path.suffix.lstrip(".").lower()
    return FileResponse(path=abs_path, media_type=IMAGE_MEDIA_TYPES.get(ext, "application/octet-stream"))

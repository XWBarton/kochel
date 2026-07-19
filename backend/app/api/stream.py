from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.api.deps import SessionDep
from app.config import settings
from app.models import Track

router = APIRouter(prefix="/tracks", tags=["stream"])

FORMAT_MEDIA_TYPES = {
    "flac": "audio/flac",
    "mp3": "audio/mpeg",
    "wav": "audio/wav",
    "alac": "audio/mp4",
    "aac": "audio/aac",
}


@router.get("/{track_id}/stream")
async def stream_track(track_id: int, session: SessionDep) -> FileResponse:
    track = await session.get(Track, track_id)
    if track is None:
        raise HTTPException(status_code=404, detail="Track not found")

    abs_path = settings.music_library_root / track.file_path
    if not abs_path.is_file():
        raise HTTPException(status_code=404, detail="Audio file missing on disk")

    return FileResponse(
        path=abs_path,
        media_type=FORMAT_MEDIA_TYPES.get(track.format, "application/octet-stream"),
        filename=abs_path.name,
    )

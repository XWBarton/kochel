from pydantic import BaseModel, ConfigDict

from app.schemas.track import TrackOut


class PersonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class EnsembleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class RecordingPerformerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    person: PersonOut
    role: str
    instrument: str | None


class RecordingListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    movement_id: int | None
    ensemble: EnsembleOut | None
    performers: list[RecordingPerformerOut]
    label: str | None
    recording_year: int | None
    release_year: int | None
    notes: str | None
    is_default_in_library: bool
    total_duration_seconds: float
    tracks: list[TrackOut]


class RecordingListResponse(BaseModel):
    items: list[RecordingListItem]
    total: int

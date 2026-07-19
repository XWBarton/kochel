from pydantic import BaseModel, ConfigDict


class TrackMovementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    movement_id: int
    sequence: int
    start_seconds: float | None
    duration_seconds_override: float | None


class TrackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    track_number: int | None
    disc_number: int | None
    format: str
    duration_seconds: float
    movement_ids: list[int]
    track_movements: list[TrackMovementOut]

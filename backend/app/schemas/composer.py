from pydantic import BaseModel, ConfigDict, Field


class ComposerListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sort_name: str
    birth_year: int | None
    death_year: int | None
    period: str | None
    work_count: int
    image_url: str | None = None
    image_focal_x: float = 0.5
    image_focal_y: float = 0.5


class ComposerListResponse(BaseModel):
    items: list[ComposerListItem]
    total: int


class ComposerUpdate(BaseModel):
    name: str
    sort_name: str | None = None
    birth_year: int | None = None
    death_year: int | None = None
    period: str | None = None


class ComposerImagePositionUpdate(BaseModel):
    focal_x: float = Field(ge=0.0, le=1.0)
    focal_y: float = Field(ge=0.0, le=1.0)

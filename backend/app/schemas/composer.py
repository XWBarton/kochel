from pydantic import BaseModel, ConfigDict


class ComposerListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sort_name: str
    birth_year: int | None
    death_year: int | None
    period: str | None
    work_count: int


class ComposerListResponse(BaseModel):
    items: list[ComposerListItem]
    total: int

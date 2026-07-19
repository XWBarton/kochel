from pydantic import BaseModel, ConfigDict, Field


class CatalogueNumberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    system: str
    number: str
    is_primary: bool


class CatalogueNumberIn(BaseModel):
    system: str
    number: str
    is_primary: bool = False


class WorkUpdate(BaseModel):
    title: str
    subtitle: str | None = None
    key: str | None = None
    form: str | None = None
    category: str | None = None
    composed_year: int | None = None
    composed_year_uncertain: bool = False
    composed_year_range_end: int | None = None
    catalogue_numbers: list[CatalogueNumberIn] = Field(default_factory=list)


class WorkListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    subtitle: str | None
    key: str | None
    form: str | None
    category: str | None
    composed_year: int | None
    composed_year_uncertain: bool
    composed_year_range_end: int | None
    catalogue_numbers: list[CatalogueNumberOut]
    movement_count: int
    recording_count: int


class WorkListResponse(BaseModel):
    items: list[WorkListItem]
    total: int


class MovementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    movement_number: int
    name: str | None


class WorkDetail(WorkListItem):
    composer_id: int
    composer_name: str
    movements: list[MovementOut]


class WorkBrowseItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str | None
    composer_id: int
    composer_name: str
    recording_count: int


class WorkBrowseResponse(BaseModel):
    items: list[WorkBrowseItem]
    total: int

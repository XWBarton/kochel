from pydantic import BaseModel


class SearchComposerResult(BaseModel):
    id: int
    name: str
    birth_year: int | None
    death_year: int | None
    work_count: int


class SearchWorkResult(BaseModel):
    id: int
    title: str
    composer_id: int
    composer_name: str


class SearchRecordingResult(BaseModel):
    id: int
    work_id: int
    work_title: str
    composer_name: str
    ensemble_name: str | None
    conductor_name: str | None
    label: str | None
    recording_year: int | None


class SearchResponse(BaseModel):
    query: str
    composers: list[SearchComposerResult]
    works: list[SearchWorkResult]
    recordings: list[SearchRecordingResult]

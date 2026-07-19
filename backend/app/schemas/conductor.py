from pydantic import BaseModel


class ConductorSummary(BaseModel):
    id: int
    name: str
    recording_count: int
    work_count: int


class ConductorListResponse(BaseModel):
    items: list[ConductorSummary]
    total: int

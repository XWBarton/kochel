from typing import Literal

from pydantic import BaseModel, Field


class ScanFileOut(BaseModel):
    relative_path: str
    filename: str
    format: str
    duration_seconds: float
    bitrate_kbps: int | None
    sample_rate_hz: int | None
    channels: int | None
    file_size_bytes: int
    tags: dict[str, str | None]


class ScanGroupOut(BaseModel):
    relative_dir: str
    files: list[ScanFileOut]


class ScanResponse(BaseModel):
    groups: list[ScanGroupOut]
    total_files: int


class UploadedFileResult(BaseModel):
    relative_path: str
    status: Literal["saved", "skipped", "rejected"]
    detail: str
    file_size_bytes: int | None = None


class UploadResponse(BaseModel):
    results: list[UploadedFileResult]
    saved_count: int
    skipped_count: int
    rejected_count: int


class DiscardPendingRequest(BaseModel):
    relative_paths: list[str]


class DiscardPendingResult(BaseModel):
    relative_path: str
    status: Literal["deleted", "not_found", "rejected"]
    detail: str


class DiscardPendingResponse(BaseModel):
    results: list[DiscardPendingResult]
    deleted_count: int


class ComposerSearchResult(BaseModel):
    source: Literal["library", "openopus"]
    id: int | None = None
    openopus_id: str | None = None
    name: str
    sort_name: str | None = None
    birth_year: int | None = None
    death_year: int | None = None
    period: str | None = None


class WorkSearchResult(BaseModel):
    source: Literal["library", "openopus"]
    id: int | None = None
    title: str
    category: str | None = None
    movement_count: int | None = None


class EnsembleSearchResult(BaseModel):
    id: int
    name: str


class PersonSearchResult(BaseModel):
    id: int
    name: str


# ---- commit payload ----


class ImportCatalogueNumberIn(BaseModel):
    system: str
    number: str
    is_primary: bool = False


class ImportMovementIn(BaseModel):
    movement_number: int
    name: str | None = None


class ImportComposerIn(BaseModel):
    id: int | None = None
    name: str | None = None
    sort_name: str | None = None
    birth_year: int | None = None
    death_year: int | None = None
    period: str | None = None


class ImportWorkIn(BaseModel):
    id: int | None = None
    title: str | None = None
    subtitle: str | None = None
    key: str | None = None
    form: str | None = None
    category: str | None = None
    composed_year: int | None = None
    composed_year_uncertain: bool = False
    composed_year_range_end: int | None = None
    catalogue_numbers: list[ImportCatalogueNumberIn] = Field(default_factory=list)
    movements: list[ImportMovementIn] = Field(default_factory=list)


class ImportPerformerIn(BaseModel):
    person_id: int | None = None
    name: str | None = None
    sort_name: str | None = None
    role: Literal["conductor", "soloist", "performer"]
    instrument: str | None = None
    credited_order: int | None = None


class ImportRecordingIn(BaseModel):
    ensemble_id: int | None = None
    ensemble_name: str | None = None
    label: str | None = None
    recording_year: int | None = None
    release_year: int | None = None
    notes: str | None = None
    is_default_in_library: bool = False
    performers: list[ImportPerformerIn] = Field(default_factory=list)


class ImportTrackIn(BaseModel):
    relative_path: str
    track_number: int | None = None
    disc_number: int | None = None
    movement_numbers: list[int] = Field(default_factory=list)


class ImportCommitRequest(BaseModel):
    composer: ImportComposerIn
    work: ImportWorkIn
    recording: ImportRecordingIn
    tracks: list[ImportTrackIn]


class ImportCommitResponse(BaseModel):
    composer_id: int
    work_id: int
    recording_id: int
    track_ids: list[int]

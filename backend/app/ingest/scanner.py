"""Filesystem scan + tag extraction — first pass of the import pipeline.

Walks MUSIC_LIBRARY_ROOT, reads embedded tags as a *hint* (classical tagging
in the wild is inconsistent, per the product brief — nothing here is trusted
as final), and groups files by directory, since one folder is almost always
one recording/release in a real-world classical library layout. Files whose
relative path already matches an existing Track are skipped so re-scanning
after adding new files only surfaces what's new.
"""

from dataclasses import dataclass, field
from pathlib import Path

import mutagen

from app.config import settings

AUDIO_EXTENSIONS = {".flac", ".mp3", ".m4a", ".wav", ".aac", ".ogg", ".alac"}

FORMAT_BY_EXTENSION = {
    ".flac": "flac",
    ".mp3": "mp3",
    ".m4a": "alac",
    ".wav": "wav",
    ".aac": "aac",
    ".ogg": "ogg",
    ".alac": "alac",
}


@dataclass
class ScannedFile:
    relative_path: str
    filename: str
    format: str
    duration_seconds: float
    bitrate_kbps: int | None
    sample_rate_hz: int | None
    channels: int | None
    file_size_bytes: int
    tags: dict[str, str | None]


@dataclass
class ScannedGroup:
    relative_dir: str
    files: list["ScannedFile"] = field(default_factory=list)


def _first_tag(easy_file, key: str) -> str | None:
    if easy_file is None:
        return None
    values = easy_file.get(key)
    return values[0] if values else None


def _extract_tags(easy_file) -> dict[str, str | None]:
    return {
        "title": _first_tag(easy_file, "title"),
        "composer": _first_tag(easy_file, "composer"),
        "artist": _first_tag(easy_file, "artist"),
        "albumartist": _first_tag(easy_file, "albumartist"),
        "album": _first_tag(easy_file, "album"),
        "date": _first_tag(easy_file, "date"),
        "tracknumber": _first_tag(easy_file, "tracknumber"),
        "discnumber": _first_tag(easy_file, "discnumber"),
        "genre": _first_tag(easy_file, "genre"),
    }


def _numeric_prefix(value: str | None) -> int:
    """'3/12' -> 3, '' or None or garbage -> 0, for sorting purposes only."""
    if not value:
        return 0
    try:
        return int(value.split("/")[0].strip())
    except ValueError:
        return 0


def scan_file(abs_path: Path, relative_path: str) -> ScannedFile | None:
    try:
        easy_file = mutagen.File(abs_path, easy=True)
        info_source = easy_file if easy_file is not None else mutagen.File(abs_path)
    except Exception:
        return None

    if info_source is None:
        return None

    info = info_source.info
    ext = abs_path.suffix.lower()
    bitrate = getattr(info, "bitrate", None)
    return ScannedFile(
        relative_path=relative_path,
        filename=abs_path.name,
        format=FORMAT_BY_EXTENSION.get(ext, ext.lstrip(".")),
        duration_seconds=round(getattr(info, "length", 0.0), 3),
        bitrate_kbps=(bitrate // 1000) if bitrate else None,
        sample_rate_hz=getattr(info, "sample_rate", None),
        channels=getattr(info, "channels", None),
        file_size_bytes=abs_path.stat().st_size,
        tags=_extract_tags(easy_file),
    )


def scan_library(existing_paths: set[str]) -> list[ScannedGroup]:
    root = settings.music_library_root
    if not root.is_dir():
        return []

    groups: dict[str, ScannedGroup] = {}

    for abs_path in sorted(root.rglob("*")):
        if not abs_path.is_file() or abs_path.suffix.lower() not in AUDIO_EXTENSIONS:
            continue

        relative_path = str(abs_path.relative_to(root))
        if relative_path in existing_paths:
            continue

        scanned = scan_file(abs_path, relative_path)
        if scanned is None:
            continue

        parent = abs_path.parent
        relative_dir = "." if parent == root else str(parent.relative_to(root))
        group = groups.setdefault(relative_dir, ScannedGroup(relative_dir=relative_dir))
        group.files.append(scanned)

    for group in groups.values():
        group.files.sort(
            key=lambda f: (
                _numeric_prefix(f.tags.get("discnumber")),
                _numeric_prefix(f.tags.get("tracknumber")),
                f.filename,
            )
        )

    return [groups[key] for key in sorted(groups.keys())]

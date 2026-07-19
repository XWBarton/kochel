"""Path validation for uploaded audio files — the only place in the ingest
pipeline that writes into MUSIC_LIBRARY_ROOT; scanning and streaming are
read-only. Kept framework-agnostic (no FastAPI types) so it's trivial to
unit-test the adversarial-input handling directly.
"""

from pathlib import Path

from app.config import settings
from app.ingest.scanner import AUDIO_EXTENSIONS


class UploadRejected(Exception):
    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(reason)


def _resolve_within_root(relative_path: str) -> Path:
    """Shared traversal/root-confinement checks — this path is driven
    entirely by client-supplied filenames, so it's treated as untrusted
    input regardless of the single-user trust model elsewhere."""
    if not relative_path or relative_path != relative_path.strip():
        raise UploadRejected("empty or malformed path")

    candidate = Path(relative_path)
    if candidate.is_absolute():
        raise UploadRejected("absolute paths are not allowed")
    if ".." in candidate.parts:
        raise UploadRejected("path traversal is not allowed")

    root = settings.music_library_root.resolve()
    destination = (root / candidate).resolve()
    if not destination.is_relative_to(root):
        raise UploadRejected("resolved path escapes the music library root")

    return destination


def resolve_upload_destination(relative_path: str) -> Path:
    """Validates and resolves a browser-supplied relative path to an absolute
    destination under MUSIC_LIBRARY_ROOT, for accepting a brand-new upload.
    """
    destination = _resolve_within_root(relative_path)
    if destination.suffix.lower() not in AUDIO_EXTENSIONS:
        raise UploadRejected(f"unsupported file type: {destination.suffix or '(none)'}")
    return destination


def resolve_library_file(relative_path: str) -> Path:
    """Same traversal/root-confinement checks as resolve_upload_destination,
    without the extension allowlist — used to locate an already-scanned
    pending file (e.g. to discard it) rather than accept a new upload.
    """
    return _resolve_within_root(relative_path)

"""Unit tests for the tag-extraction helpers in app.ingest.scanner.

These use lightweight fakes for the mutagen tag objects rather than real
encoded audio files, so they stay hermetic and don't need an audio encoder
in the test environment (the app itself only ever reads tags via mutagen —
no encoder is a runtime dependency). The raw-tag shapes faked here (a dict
of frame-like objects exposing `.text`, and a dict of plain lists) mirror
real mutagen ID3/MP4 behavior confirmed interactively against mutagen 1.47.
"""

from app.ingest.scanner import _extract_tags, _first_raw


class FakeFrame:
    def __init__(self, text):
        self.text = text


class FakeEasyFile(dict):
    def get(self, key, default=None):
        value = super().get(key)
        return value if value is not None else default


def test_first_raw_reads_id3_style_frame_with_text_attr():
    raw = {"MVNM": FakeFrame(["Allegro"])}
    assert _first_raw(raw, "MVNM", "\xa9mvn") == "Allegro"


def test_first_raw_reads_mp4_style_plain_list():
    raw = {"\xa9mvi": [2]}
    assert _first_raw(raw, "MVIN", "\xa9mvi") == "2"


def test_first_raw_tries_keys_in_order():
    raw = {"\xa9mvn": ["Presto"]}
    assert _first_raw(raw, "MVNM", "\xa9mvn") == "Presto"


def test_first_raw_returns_none_when_missing():
    assert _first_raw({}, "MVNM", "\xa9mvn") is None
    assert _first_raw(None, "MVNM") is None


def test_extract_tags_reads_extended_fields_from_easy_tags(tmp_path):
    easy = FakeEasyFile(
        {
            "title": ["Symphony No. 5"],
            "composer": ["Beethoven"],
            "conductor": ["Karajan"],
            "catalognumber": ["Op. 67"],
            "organization": ["DG"],
            "discsubtitle": ["Disc 1"],
            "originaldate": ["1963"],
            "movementname": ["Allegro con brio"],
            "movementnumber": ["1"],
        }
    )
    tags = _extract_tags(tmp_path / "nonexistent.flac", easy)
    assert tags["conductor"] == "Karajan"
    assert tags["catalognumber"] == "Op. 67"
    assert tags["organization"] == "DG"
    assert tags["discsubtitle"] == "Disc 1"
    assert tags["originaldate"] == "1963"
    assert tags["movementname"] == "Allegro con brio"
    assert tags["movementnumber"] == "1"


def test_extract_tags_reads_picard_movement_number_key(tmp_path):
    """MusicBrainz Picard writes the movement *number* to the Vorbis comment
    key "movement" (not "movementnumber") — verified against a real FLAC
    file round-tripped through mutagen; regression-guards that convention."""
    easy = FakeEasyFile({"movementname": ["Adagio"], "movement": ["2"]})
    tags = _extract_tags(tmp_path / "nonexistent.flac", easy)
    assert tags["movementname"] == "Adagio"
    assert tags["movementnumber"] == "2"


def test_extract_tags_falls_back_gracefully_when_raw_load_fails(tmp_path):
    """No MVNM/MVIN in the easy tags, and the raw re-parse can't find the
    (nonexistent) file — should degrade to None, not raise."""
    easy = FakeEasyFile({"title": ["X"]})
    tags = _extract_tags(tmp_path / "nonexistent.mp3", easy)
    assert tags["movementname"] is None
    assert tags["movementnumber"] is None

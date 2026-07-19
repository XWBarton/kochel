"""Dev/demo seed script — NOT a production import path.

Truncates all app tables and repopulates them with a small synthetic classical
library (tiny sine-tone WAV files, no real audio) chosen to exercise every
relationship in the schema: multiple catalogue systems on one work (Vivaldi),
zero catalogue numbers + a single implicit movement (Florence Price), a
recording file spanning more than one movement (Bach), and a conductor who
appears on recordings of two different composers (Trevor Pinnock), so the
"browse by conductor" pivot has something real to return.

Run with: python -m scripts.seed
"""

import asyncio
import math
import struct
import wave
from pathlib import Path

from sqlalchemy import text

from app.config import settings
from app.db import async_session_maker
from app.models import (
    Composer,
    Ensemble,
    Movement,
    Person,
    Recording,
    RecordingPerformer,
    Track,
    TrackMovement,
    Work,
    WorkCatalogueNumber,
)

SAMPLE_RATE = 44100
BIT_DEPTH = 16
CHANNELS = 1
BITRATE_KBPS = SAMPLE_RATE * BIT_DEPTH * CHANNELS // 1000

TABLES_IN_DELETE_ORDER = [
    "track_movements",
    "tracks",
    "recording_performers",
    "recordings",
    "movements",
    "work_catalogue_numbers",
    "works",
    "ensembles",
    "people",
    "composers",
]


def write_tone_wav(path: Path, duration_seconds: float, freq: float) -> float:
    """Writes a tiny mono sine-tone WAV file. Returns the actual duration,
    computed from the real sample count so it's numerically consistent with
    what the streaming endpoint will report."""
    path.parent.mkdir(parents=True, exist_ok=True)
    n_frames = max(1, round(duration_seconds * SAMPLE_RATE))
    amplitude = 3000
    frames = bytearray(2 * n_frames)
    for i in range(n_frames):
        sample = int(amplitude * math.sin(2 * math.pi * freq * i / SAMPLE_RATE))
        struct.pack_into("<h", frames, 2 * i, sample)
    with wave.open(str(path), "w") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(BIT_DEPTH // 8)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(bytes(frames))
    return n_frames / SAMPLE_RATE


async def add_track(
    session,
    *,
    recording: Recording,
    rel_dir: str,
    filename: str,
    duration_seconds: float,
    movements: list[Movement],
    track_number: int,
    freq: float = 440.0,
) -> Track:
    rel_path = f"_seed/{rel_dir}/{filename}"
    abs_path = settings.music_library_root / rel_path
    actual_duration = write_tone_wav(abs_path, duration_seconds, freq)
    track = Track(
        recording_id=recording.id,
        file_path=rel_path,
        track_number=track_number,
        format="wav",
        duration_seconds=actual_duration,
        bitrate_kbps=BITRATE_KBPS,
        sample_rate_hz=SAMPLE_RATE,
        channels=CHANNELS,
        file_size_bytes=abs_path.stat().st_size,
    )
    session.add(track)
    await session.flush()
    for sequence, movement in enumerate(movements, start=1):
        session.add(TrackMovement(track_id=track.id, movement_id=movement.id, sequence=sequence))
    await session.flush()
    return track


async def truncate_all(session) -> None:
    await session.execute(
        text(f"TRUNCATE {', '.join(TABLES_IN_DELETE_ORDER)} RESTART IDENTITY CASCADE")
    )
    await session.commit()


async def seed_bach(session) -> tuple[Person, Ensemble]:
    bach = Composer(
        name="Johann Sebastian Bach",
        sort_name="Bach, Johann Sebastian",
        birth_year=1685,
        death_year=1750,
        period="baroque",
    )
    session.add(bach)
    await session.flush()

    work = Work(
        composer_id=bach.id,
        title="Brandenburg Concerto No. 3 in G major",
        key="G major",
        form="concerto",
        category="Orchestral",
        composed_year=1721,
    )
    session.add(work)
    await session.flush()
    session.add(WorkCatalogueNumber(work_id=work.id, system="BWV", number="1048", is_primary=True))

    movements = [
        Movement(work_id=work.id, movement_number=1, name="Allegro"),
        Movement(work_id=work.id, movement_number=2, name="Adagio"),
        Movement(work_id=work.id, movement_number=3, name="Allegro"),
    ]
    session.add_all(movements)
    await session.flush()

    ensemble = Ensemble(name="The English Concert")
    conductor = Person(name="Trevor Pinnock", sort_name="Pinnock, Trevor")
    session.add_all([ensemble, conductor])
    await session.flush()

    rec1 = Recording(
        work_id=work.id,
        ensemble_id=ensemble.id,
        label="Archiv Produktion",
        recording_year=1982,
        release_year=1983,
        is_default_in_library=True,
    )
    session.add(rec1)
    await session.flush()
    session.add(RecordingPerformer(recording_id=rec1.id, person_id=conductor.id, role="conductor"))
    await session.flush()
    for m in movements:
        await add_track(
            session,
            recording=rec1,
            rel_dir="Bach/Brandenburg Concerto No. 3/rec1",
            filename=f"mvt{m.movement_number}.wav",
            duration_seconds=2.5 + m.movement_number * 0.5,
            movements=[m],
            track_number=m.movement_number,
            freq=220.0 * m.movement_number,
        )

    # Second recording: same conductor/ensemble, different session — deliberately
    # a live recording where movements II+III are captured as one continuous file,
    # to exercise track_movements as a genuine many-to-many join.
    rec2 = Recording(
        work_id=work.id,
        ensemble_id=ensemble.id,
        label="Deutsche Grammophon",
        recording_year=1995,
        release_year=1996,
        is_default_in_library=False,
        notes="Live recording",
    )
    session.add(rec2)
    await session.flush()
    session.add(RecordingPerformer(recording_id=rec2.id, person_id=conductor.id, role="conductor"))
    await session.flush()
    await add_track(
        session,
        recording=rec2,
        rel_dir="Bach/Brandenburg Concerto No. 3/rec2",
        filename="mvt1.wav",
        duration_seconds=2.8,
        movements=[movements[0]],
        track_number=1,
        freq=220.0,
    )
    await add_track(
        session,
        recording=rec2,
        rel_dir="Bach/Brandenburg Concerto No. 3/rec2",
        filename="mvt2-3.wav",
        duration_seconds=5.2,
        movements=[movements[1], movements[2]],
        track_number=2,
        freq=440.0,
    )

    return conductor, ensemble


async def seed_vivaldi(session) -> None:
    vivaldi = Composer(
        name="Antonio Vivaldi",
        sort_name="Vivaldi, Antonio",
        birth_year=1678,
        death_year=1741,
        period="baroque",
    )
    session.add(vivaldi)
    await session.flush()

    work = Work(
        composer_id=vivaldi.id,
        title='"La Primavera" (Spring)',
        key="E major",
        form="concerto",
        category="Orchestral",
        composed_year=1723,
    )
    session.add(work)
    await session.flush()
    session.add_all(
        [
            WorkCatalogueNumber(work_id=work.id, system="RV", number="269", is_primary=True),
            WorkCatalogueNumber(work_id=work.id, system="Op.", number="8 No. 1", is_primary=False),
        ]
    )

    movements = [
        Movement(work_id=work.id, movement_number=1, name="Allegro"),
        Movement(work_id=work.id, movement_number=2, name="Largo"),
        Movement(work_id=work.id, movement_number=3, name="Allegro (Danza pastorale)"),
    ]
    session.add_all(movements)
    await session.flush()

    ensemble = Ensemble(name="I Musici")
    soloist = Person(name="Salvatore Accardo", sort_name="Accardo, Salvatore")
    session.add_all([ensemble, soloist])
    await session.flush()

    recording = Recording(
        work_id=work.id,
        ensemble_id=ensemble.id,
        label="Philips",
        recording_year=1975,
        release_year=1976,
        is_default_in_library=True,
    )
    session.add(recording)
    await session.flush()
    session.add(
        RecordingPerformer(
            recording_id=recording.id, person_id=soloist.id, role="soloist", instrument="violin"
        )
    )
    await session.flush()
    for m in movements:
        await add_track(
            session,
            recording=recording,
            rel_dir="Vivaldi/La Primavera",
            filename=f"mvt{m.movement_number}.wav",
            duration_seconds=2.0 + m.movement_number * 0.4,
            movements=[m],
            track_number=m.movement_number,
            freq=330.0 * m.movement_number,
        )


async def seed_mozart(session, *, reuse_conductor: Person, reuse_ensemble: Ensemble) -> None:
    mozart = Composer(
        name="Wolfgang Amadeus Mozart",
        sort_name="Mozart, Wolfgang Amadeus",
        birth_year=1756,
        death_year=1791,
        period="classical",
    )
    session.add(mozart)
    await session.flush()

    # Work A — Orchestral, reuses the Bach recording's conductor+ensemble so
    # "recordings conducted by Trevor Pinnock" genuinely spans two composers.
    symphony = Work(
        composer_id=mozart.id,
        title="Symphony No. 40 in G minor",
        key="G minor",
        form="symphony",
        category="Orchestral",
        composed_year=1788,
    )
    session.add(symphony)
    await session.flush()
    session.add(WorkCatalogueNumber(work_id=symphony.id, system="K", number="550", is_primary=True))

    symphony_movements = [
        Movement(work_id=symphony.id, movement_number=1, name="Molto allegro"),
        Movement(work_id=symphony.id, movement_number=2, name="Andante"),
        Movement(work_id=symphony.id, movement_number=3, name="Menuetto: Allegretto"),
        Movement(work_id=symphony.id, movement_number=4, name="Allegro assai"),
    ]
    session.add_all(symphony_movements)
    await session.flush()

    symphony_recording = Recording(
        work_id=symphony.id,
        ensemble_id=reuse_ensemble.id,
        label="Archiv Produktion",
        recording_year=1990,
        release_year=1991,
        is_default_in_library=True,
    )
    session.add(symphony_recording)
    await session.flush()
    session.add(
        RecordingPerformer(
            recording_id=symphony_recording.id, person_id=reuse_conductor.id, role="conductor"
        )
    )
    await session.flush()
    for m in symphony_movements:
        await add_track(
            session,
            recording=symphony_recording,
            rel_dir="Mozart/Symphony No. 40",
            filename=f"mvt{m.movement_number}.wav",
            duration_seconds=1.8 + m.movement_number * 0.3,
            movements=[m],
            track_number=m.movement_number,
            freq=260.0 * m.movement_number,
        )

    # Work B — Chamber, different conductor/ensemble, so Composer Detail has
    # two categories to group by.
    serenade = Work(
        composer_id=mozart.id,
        title="Eine kleine Nachtmusik",
        key="G major",
        form="serenade",
        category="Chamber",
        composed_year=1787,
    )
    session.add(serenade)
    await session.flush()
    session.add(WorkCatalogueNumber(work_id=serenade.id, system="K", number="525", is_primary=True))

    serenade_movements = [
        Movement(work_id=serenade.id, movement_number=1, name="Allegro"),
        Movement(work_id=serenade.id, movement_number=2, name="Romance: Andante"),
        Movement(work_id=serenade.id, movement_number=3, name="Menuetto: Allegretto"),
        Movement(work_id=serenade.id, movement_number=4, name="Rondo: Allegro"),
    ]
    session.add_all(serenade_movements)
    await session.flush()

    academy = Ensemble(name="Academy of St Martin in the Fields")
    marriner = Person(name="Neville Marriner", sort_name="Marriner, Neville")
    session.add_all([academy, marriner])
    await session.flush()

    serenade_recording = Recording(
        work_id=serenade.id,
        ensemble_id=academy.id,
        label="Philips",
        recording_year=1985,
        release_year=1986,
        is_default_in_library=True,
    )
    session.add(serenade_recording)
    await session.flush()
    session.add(
        RecordingPerformer(recording_id=serenade_recording.id, person_id=marriner.id, role="conductor")
    )
    await session.flush()
    for m in serenade_movements:
        await add_track(
            session,
            recording=serenade_recording,
            rel_dir="Mozart/Eine kleine Nachtmusik",
            filename=f"mvt{m.movement_number}.wav",
            duration_seconds=2.2 + m.movement_number * 0.3,
            movements=[m],
            track_number=m.movement_number,
            freq=294.0 * m.movement_number,
        )


async def seed_price(session) -> None:
    price = Composer(
        name="Florence Price",
        sort_name="Price, Florence",
        birth_year=1887,
        death_year=1953,
        period="romantic",
    )
    session.add(price)
    await session.flush()

    # No catalogue number system exists for Price's works — zero rows in
    # work_catalogue_numbers, and a single implicit movement since "Adoration"
    # is a short, through-composed character piece rather than a multi-movement work.
    work = Work(
        composer_id=price.id,
        title="Adoration",
        form="character piece",
        category="Piano",
        composed_year=1951,
        composed_year_uncertain=True,
    )
    session.add(work)
    await session.flush()

    movement = Movement(work_id=work.id, movement_number=1, name=None)
    session.add(movement)
    await session.flush()

    pianist = Person(name="Samantha Ege", sort_name="Ege, Samantha")
    session.add(pianist)
    await session.flush()

    recording = Recording(
        work_id=work.id,
        label="Lorelt",
        recording_year=2018,
        release_year=2018,
        is_default_in_library=True,
    )
    session.add(recording)
    await session.flush()
    session.add(
        RecordingPerformer(
            recording_id=recording.id, person_id=pianist.id, role="soloist", instrument="piano"
        )
    )
    await session.flush()
    await add_track(
        session,
        recording=recording,
        rel_dir="Price/Adoration",
        filename="track1.wav",
        duration_seconds=3.4,
        movements=[movement],
        track_number=1,
        freq=392.0,
    )


async def main() -> None:
    async with async_session_maker() as session:
        print("Truncating existing data...")
        await truncate_all(session)

        print("Seeding Bach...")
        conductor, ensemble = await seed_bach(session)
        print("Seeding Vivaldi...")
        await seed_vivaldi(session)
        print("Seeding Mozart...")
        await seed_mozart(session, reuse_conductor=conductor, reuse_ensemble=ensemble)
        print("Seeding Florence Price...")
        await seed_price(session)

        await session.commit()

    counts = await gather_counts()
    print("\nSeed complete:")
    for table, count in counts.items():
        print(f"  {table}: {count}")

    print_curl_examples()


async def gather_counts() -> dict[str, int]:
    async with async_session_maker() as session:
        counts = {}
        for table in reversed(TABLES_IN_DELETE_ORDER):
            result = await session.execute(text(f"SELECT COUNT(*) FROM {table}"))
            counts[table] = result.scalar_one()
        return counts


def print_curl_examples() -> None:
    base = "http://localhost:8000/api/v1"
    print(
        f"""
Try it out:
  curl {base}/composers
  curl {base}/composers/1/works
  curl {base}/works/1/recordings
  curl -D - {base}/tracks/1/stream -o /dev/null
  curl -D - -H "Range: bytes=0-999" {base}/tracks/1/stream -o /dev/null
"""
    )


if __name__ == "__main__":
    asyncio.run(main())

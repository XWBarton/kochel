import mutagen

# minimal valid MPEG1 Layer3 frame (128kbps, 44100Hz) repeated so mutagen can
# compute a real duration — used to build tiny fake "tagged" files for tests.
_MP3_FRAME = bytes([0xFF, 0xFB, 0x90, 0x64]) + bytes(417 - 4)


def _write_tagged_mp3(path, *, title=None, composer=None, album=None, tracknumber=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(_MP3_FRAME * 20)
    f = mutagen.File(str(path), easy=True)
    if title:
        f["title"] = title
    if composer:
        f["composer"] = composer
    if album:
        f["album"] = album
    if tracknumber:
        f["tracknumber"] = tracknumber
    f.save()


async def test_scan_finds_new_files_grouped_by_directory(client, music_root):
    _write_tagged_mp3(
        music_root / "Beethoven" / "Symphony No. 5" / "01.mp3",
        title="I. Allegro con brio",
        composer="Ludwig van Beethoven",
        album="Symphony No. 5",
        tracknumber="1",
    )
    _write_tagged_mp3(
        music_root / "Beethoven" / "Symphony No. 5" / "02.mp3",
        title="II. Andante con moto",
        composer="Ludwig van Beethoven",
        album="Symphony No. 5",
        tracknumber="2",
    )

    resp = await client.get("/api/v1/import/scan")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_files"] == 2
    assert len(body["groups"]) == 1
    group = body["groups"][0]
    assert group["relative_dir"] == "Beethoven/Symphony No. 5"
    assert {f["tags"]["title"] for f in group["files"]} == {
        "I. Allegro con brio",
        "II. Andante con moto",
    }


async def test_commit_creates_new_composer_work_recording_and_tracks(client, music_root):
    _write_tagged_mp3(music_root / "Beethoven" / "Symphony No. 5" / "01.mp3", tracknumber="1")
    _write_tagged_mp3(music_root / "Beethoven" / "Symphony No. 5" / "02.mp3", tracknumber="2")

    payload = {
        "composer": {"name": "Ludwig van Beethoven", "sort_name": "Beethoven, Ludwig van", "period": "classical"},
        "work": {
            "title": "Symphony No. 5 in C minor",
            "form": "symphony",
            "category": "Orchestral",
            "catalogue_numbers": [{"system": "Op.", "number": "67", "is_primary": True}],
            "movements": [
                {"movement_number": 1, "name": "Allegro con brio"},
                {"movement_number": 2, "name": "Andante con moto"},
            ],
        },
        "recording": {
            "ensemble_name": "Vienna Philharmonic",
            "label": "Deutsche Grammophon",
            "recording_year": 1970,
            "is_default_in_library": True,
            "performers": [{"name": "Herbert von Karajan", "role": "conductor"}],
        },
        "tracks": [
            {"relative_path": "Beethoven/Symphony No. 5/01.mp3", "track_number": 1, "movement_numbers": [1]},
            {"relative_path": "Beethoven/Symphony No. 5/02.mp3", "track_number": 2, "movement_numbers": [2]},
        ],
    }

    resp = await client.post("/api/v1/import/commit", json=payload)
    assert resp.status_code == 200, resp.text
    result = resp.json()
    assert len(result["track_ids"]) == 2

    composers = (await client.get("/api/v1/composers")).json()
    assert composers["total"] == 1
    assert composers["items"][0]["name"] == "Ludwig van Beethoven"

    works = (await client.get(f"/api/v1/composers/{result['composer_id']}/works")).json()
    assert works["total"] == 1
    work = works["items"][0]
    assert work["catalogue_numbers"] == [{"system": "Op.", "number": "67", "is_primary": True}]
    assert work["movement_count"] == 2

    recordings = (await client.get(f"/api/v1/works/{result['work_id']}/recordings")).json()
    assert recordings["total"] == 1
    recording = recordings["items"][0]
    assert recording["ensemble"]["name"] == "Vienna Philharmonic"
    assert recording["performers"][0]["role"] == "conductor"
    assert len(recording["tracks"]) == 2

    # already-imported files are excluded from the next scan
    rescan = (await client.get("/api/v1/import/scan")).json()
    assert rescan["total_files"] == 0


async def test_commit_reuses_existing_composer_and_work_for_a_second_recording(client, music_root):
    _write_tagged_mp3(music_root / "Beethoven" / "Symphony No. 5" / "a" / "01.mp3")
    _write_tagged_mp3(music_root / "Beethoven" / "Symphony No. 5" / "b" / "01.mp3")

    first_payload = {
        "composer": {"name": "Ludwig van Beethoven", "sort_name": "Beethoven, Ludwig van"},
        "work": {
            "title": "Symphony No. 5 in C minor",
            "movements": [{"movement_number": 1, "name": None}],
        },
        "recording": {"ensemble_name": "Vienna Philharmonic", "performers": []},
        "tracks": [
            {"relative_path": "Beethoven/Symphony No. 5/a/01.mp3", "movement_numbers": [1]},
        ],
    }
    first = (await client.post("/api/v1/import/commit", json=first_payload)).json()

    second_payload = {
        "composer": {"id": first["composer_id"]},
        "work": {"id": first["work_id"]},
        "recording": {"ensemble_name": "Berlin Philharmonic", "performers": []},
        "tracks": [
            {"relative_path": "Beethoven/Symphony No. 5/b/01.mp3", "movement_numbers": [1]},
        ],
    }
    resp = await client.post("/api/v1/import/commit", json=second_payload)
    assert resp.status_code == 200, resp.text
    second = resp.json()

    assert second["composer_id"] == first["composer_id"]
    assert second["work_id"] == first["work_id"]

    composers = (await client.get("/api/v1/composers")).json()
    assert composers["total"] == 1  # no duplicate composer created

    recordings = (await client.get(f"/api/v1/works/{first['work_id']}/recordings")).json()
    assert recordings["total"] == 2


async def test_commit_rejects_second_default_recording_for_same_work(client, music_root):
    _write_tagged_mp3(music_root / "Bach" / "a" / "01.mp3")
    _write_tagged_mp3(music_root / "Bach" / "b" / "01.mp3")

    base_payload = {
        "composer": {"name": "J.S. Bach", "sort_name": "Bach, J.S."},
        "work": {"title": "Test Work", "movements": [{"movement_number": 1}]},
        "recording": {"is_default_in_library": True, "performers": []},
        "tracks": [{"relative_path": "Bach/a/01.mp3", "movement_numbers": [1]}],
    }
    first = (await client.post("/api/v1/import/commit", json=base_payload)).json()

    second_payload = {
        "composer": {"id": first["composer_id"]},
        "work": {"id": first["work_id"]},
        "recording": {"is_default_in_library": True, "performers": []},
        "tracks": [{"relative_path": "Bach/b/01.mp3", "movement_numbers": [1]}],
    }
    resp = await client.post("/api/v1/import/commit", json=second_payload)
    assert resp.status_code == 409


async def test_composer_search_returns_library_and_openopus_results(client, music_root):
    _write_tagged_mp3(music_root / "Bach" / "01.mp3")
    payload = {
        "composer": {"name": "J.S. Bach", "sort_name": "Bach, J.S."},
        "work": {"title": "Test Work", "movements": [{"movement_number": 1}]},
        "recording": {"performers": []},
        "tracks": [{"relative_path": "Bach/01.mp3", "movement_numbers": [1]}],
    }
    await client.post("/api/v1/import/commit", json=payload)

    resp = await client.get("/api/v1/import/composers/search?q=Bach")
    assert resp.status_code == 200
    results = resp.json()
    sources = {r["source"] for r in results}
    assert "library" in sources
    # our library composer's name shouldn't also show up duplicated as an openopus suggestion
    library_names = {r["name"] for r in results if r["source"] == "library"}
    openopus_names = {r["name"] for r in results if r["source"] == "openopus"}
    assert library_names.isdisjoint(openopus_names)

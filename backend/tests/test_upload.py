async def test_upload_saves_files_preserving_relative_paths(client, music_root):
    files = [
        ("files", ("Bach/Brandenburg Concerto No. 3/01 Allegro.flac", b"fake flac bytes", "audio/flac")),
        ("files", ("Bach/Brandenburg Concerto No. 3/02 Adagio.flac", b"more fake bytes", "audio/flac")),
    ]
    resp = await client.post("/api/v1/import/upload", files=files)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["saved_count"] == 2
    assert body["skipped_count"] == 0
    assert body["rejected_count"] == 0

    saved_dir = music_root / "Bach" / "Brandenburg Concerto No. 3"
    assert (saved_dir / "01 Allegro.flac").read_bytes() == b"fake flac bytes"
    assert (saved_dir / "02 Adagio.flac").read_bytes() == b"more fake bytes"


async def test_upload_rejects_path_traversal(client, music_root):
    files = [("files", ("../../etc/passwd.mp3", b"evil", "audio/mpeg"))]
    resp = await client.post("/api/v1/import/upload", files=files)
    assert resp.status_code == 200
    body = resp.json()
    assert body["rejected_count"] == 1
    assert body["saved_count"] == 0
    assert "traversal" in body["results"][0]["detail"]


async def test_upload_rejects_disallowed_extensions(client, music_root):
    files = [
        ("files", ("Bach/cover.jpg", b"not audio", "image/jpeg")),
        ("files", ("Bach/liner-notes.pdf", b"not audio either", "application/pdf")),
    ]
    resp = await client.post("/api/v1/import/upload", files=files)
    assert resp.status_code == 200
    body = resp.json()
    assert body["rejected_count"] == 2
    assert body["saved_count"] == 0
    assert not (music_root / "Bach" / "cover.jpg").exists()


async def test_upload_skips_existing_file_without_overwriting(client, music_root):
    existing = music_root / "Bach" / "01.flac"
    existing.parent.mkdir(parents=True)
    existing.write_bytes(b"original content")

    files = [("files", ("Bach/01.flac", b"new content that should not land", "audio/flac"))]
    resp = await client.post("/api/v1/import/upload", files=files)
    assert resp.status_code == 200
    body = resp.json()
    assert body["skipped_count"] == 1
    assert body["saved_count"] == 0
    assert existing.read_bytes() == b"original content"


async def test_discard_pending_deletes_files_and_empty_parent_dirs(client, music_root):
    nested = music_root / "Handel" / "Water Music" / "01.flac"
    nested.parent.mkdir(parents=True)
    nested.write_bytes(b"fake flac bytes")

    resp = await client.post("/api/v1/import/discard", json={"relative_paths": ["Handel/Water Music/01.flac"]})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["deleted_count"] == 1
    assert body["results"][0]["status"] == "deleted"

    assert not nested.exists()
    assert not (music_root / "Handel" / "Water Music").exists()
    assert not (music_root / "Handel").exists()  # emptied all the way up to (not including) the root


async def test_discard_pending_never_touches_the_root_itself(client, music_root):
    resp = await client.post("/api/v1/import/discard", json={"relative_paths": ["nonexistent.flac"]})
    assert resp.status_code == 200
    body = resp.json()
    assert body["deleted_count"] == 0
    assert body["results"][0]["status"] == "not_found"
    assert music_root.exists()


async def test_discard_pending_rejects_path_traversal(client, music_root):
    resp = await client.post("/api/v1/import/discard", json={"relative_paths": ["../../etc/passwd"]})
    assert resp.status_code == 200
    body = resp.json()
    assert body["results"][0]["status"] == "rejected"
    assert "traversal" in body["results"][0]["detail"]


async def test_discard_pending_leaves_sibling_files_alone(client, music_root):
    (music_root / "Bach").mkdir()
    keep = music_root / "Bach" / "keep.flac"
    keep.write_bytes(b"keep me")
    remove = music_root / "Bach" / "remove.flac"
    remove.write_bytes(b"remove me")

    resp = await client.post("/api/v1/import/discard", json={"relative_paths": ["Bach/remove.flac"]})
    assert resp.status_code == 200
    assert resp.json()["deleted_count"] == 1
    assert keep.exists()
    assert not remove.exists()

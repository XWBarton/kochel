import pytest

from scripts import seed as seed_module


@pytest.fixture(autouse=True)
async def seeded(db_session):
    await seed_module.main()


async def _get_bach_work(client):
    resp = await client.get("/api/v1/composers")
    bach_id = next(c["id"] for c in resp.json()["items"] if c["name"] == "Johann Sebastian Bach")
    resp = await client.get(f"/api/v1/composers/{bach_id}/works")
    return resp.json()["items"][0]


async def test_list_composers(client):
    resp = await client.get("/api/v1/composers")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 4
    names = {c["name"] for c in body["items"]}
    assert names == {
        "Johann Sebastian Bach",
        "Antonio Vivaldi",
        "Wolfgang Amadeus Mozart",
        "Florence Price",
    }


async def test_list_works_for_composer(client):
    work = await _get_bach_work(client)
    assert work["catalogue_numbers"] == [{"system": "BWV", "number": "1048", "is_primary": True}]
    assert work["movement_count"] == 3
    assert work["recording_count"] == 2


async def test_list_recordings_for_work(client):
    work = await _get_bach_work(client)
    resp = await client.get(f"/api/v1/works/{work['id']}/recordings")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 2

    default = next(r for r in body["items"] if r["is_default_in_library"])
    assert len(default["tracks"]) == 3

    non_default = next(r for r in body["items"] if not r["is_default_in_library"])
    assert any(len(t["movement_ids"]) == 2 for t in non_default["tracks"])


async def test_stream_range_request(client):
    work = await _get_bach_work(client)
    resp = await client.get(f"/api/v1/works/{work['id']}/recordings")
    track_id = resp.json()["items"][0]["tracks"][0]["id"]

    resp = await client.get(f"/api/v1/tracks/{track_id}/stream", headers={"Range": "bytes=0-99"})
    assert resp.status_code == 206
    assert resp.headers["content-range"].startswith("bytes 0-99/")
    assert len(resp.content) == 100


async def test_stream_track_not_found(client):
    resp = await client.get("/api/v1/tracks/99999/stream")
    assert resp.status_code == 404

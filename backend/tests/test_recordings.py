import pytest

from scripts import seed as seed_module


@pytest.fixture(autouse=True)
async def seeded(db_session):
    await seed_module.main()


async def _get_recording(client, work_title: str) -> dict:
    resp = await client.get("/api/v1/works")
    work = next(w for w in resp.json()["items"] if w["title"] == work_title)
    recordings = (await client.get(f"/api/v1/works/{work['id']}/recordings")).json()["items"]
    return recordings[0]


async def test_update_recording_metadata_fields(client):
    recording = await _get_recording(client, "Brandenburg Concerto No. 3 in G major")

    resp = await client.put(
        f"/api/v1/recordings/{recording['id']}",
        json={
            "ensemble_id": recording["ensemble"]["id"],
            "label": "Archiv Produktion",
            "recording_year": 1982,
            "release_year": 1983,
            "notes": "Remastered edition",
            "is_default_in_library": recording["is_default_in_library"],
            "performers": [],
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["label"] == "Archiv Produktion"
    assert body["recording_year"] == 1982
    assert body["release_year"] == 1983
    assert body["notes"] == "Remastered edition"
    assert body["performers"] == []


async def test_update_recording_replaces_performers(client):
    recording = await _get_recording(client, "Brandenburg Concerto No. 3 in G major")
    assert len(recording["performers"]) == 1  # seeded with Trevor Pinnock, conductor

    resp = await client.put(
        f"/api/v1/recordings/{recording['id']}",
        json={
            "ensemble_id": recording["ensemble"]["id"],
            "label": recording["label"],
            "recording_year": recording["recording_year"],
            "release_year": recording["release_year"],
            "notes": recording["notes"],
            "is_default_in_library": recording["is_default_in_library"],
            "performers": [
                {"name": "Someone New", "role": "conductor"},
                {"name": "Another Person", "role": "soloist", "instrument": "violin"},
            ],
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    names = {p["person"]["name"] for p in body["performers"]}
    assert names == {"Someone New", "Another Person"}


async def test_update_recording_can_change_ensemble_by_name(client):
    recording = await _get_recording(client, "Brandenburg Concerto No. 3 in G major")

    resp = await client.put(
        f"/api/v1/recordings/{recording['id']}",
        json={
            "ensemble_id": None,
            "ensemble_name": "Brand New Chamber Orchestra",
            "label": recording["label"],
            "recording_year": recording["recording_year"],
            "release_year": recording["release_year"],
            "notes": recording["notes"],
            "is_default_in_library": recording["is_default_in_library"],
            "performers": [],
        },
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["ensemble"]["name"] == "Brand New Chamber Orchestra"


async def test_update_recording_404_for_unknown_id(client):
    resp = await client.put(
        "/api/v1/recordings/999999",
        json={
            "ensemble_id": None,
            "label": None,
            "recording_year": None,
            "release_year": None,
            "notes": None,
            "is_default_in_library": False,
            "performers": [],
        },
    )
    assert resp.status_code == 404


async def test_update_recording_rejects_second_default_for_same_work(client):
    resp = await client.get("/api/v1/works")
    work = next(w for w in resp.json()["items"] if w["title"] == "Brandenburg Concerto No. 3 in G major")
    recordings = (await client.get(f"/api/v1/works/{work['id']}/recordings")).json()["items"]
    assert len(recordings) == 2  # seeded with two recordings of this work

    default_recording = next(r for r in recordings if r["is_default_in_library"])
    other_recording = next(r for r in recordings if not r["is_default_in_library"])

    resp = await client.put(
        f"/api/v1/recordings/{other_recording['id']}",
        json={
            "ensemble_id": other_recording["ensemble"]["id"] if other_recording["ensemble"] else None,
            "label": other_recording["label"],
            "recording_year": other_recording["recording_year"],
            "release_year": other_recording["release_year"],
            "notes": other_recording["notes"],
            "is_default_in_library": True,
            "performers": [],
        },
    )
    assert resp.status_code == 409
    assert default_recording["id"] != other_recording["id"]

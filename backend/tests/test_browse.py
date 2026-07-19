import pytest

from scripts import seed as seed_module


@pytest.fixture(autouse=True)
async def seeded(db_session):
    await seed_module.main()


async def test_list_all_works_flat(client):
    resp = await client.get("/api/v1/works")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 5
    titles = {w["title"] for w in body["items"]}
    assert "Adoration" in titles
    bach_work = next(w for w in body["items"] if w["composer_name"] == "Johann Sebastian Bach")
    assert bach_work["recording_count"] == 2


async def test_list_conductors(client):
    resp = await client.get("/api/v1/conductors")
    assert resp.status_code == 200
    body = resp.json()
    names = {c["name"] for c in body["items"]}
    assert "Trevor Pinnock" in names
    pinnock = next(c for c in body["items"] if c["name"] == "Trevor Pinnock")
    # conducts 2 Bach recordings + 1 Mozart recording = 3 recordings across 2 works
    assert pinnock["recording_count"] == 3
    assert pinnock["work_count"] == 2

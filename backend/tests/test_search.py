import pytest

from scripts import seed as seed_module


@pytest.fixture(autouse=True)
async def seeded(db_session):
    await seed_module.main()


async def test_search_finds_composer_and_work(client):
    resp = await client.get("/api/v1/search?q=Bach")
    assert resp.status_code == 200
    body = resp.json()
    assert any(c["name"] == "Johann Sebastian Bach" for c in body["composers"])

    resp = await client.get("/api/v1/search?q=Brandenburg")
    body = resp.json()
    assert any("Brandenburg" in w["title"] for w in body["works"])


async def test_search_finds_recording_by_conductor(client):
    resp = await client.get("/api/v1/search?q=Pinnock")
    body = resp.json()
    assert body["composers"] == []
    assert body["works"] == []
    assert len(body["recordings"]) >= 1
    assert body["recordings"][0]["conductor_name"] == "Trevor Pinnock"


async def test_search_recording_by_ensemble_name(client):
    resp = await client.get("/api/v1/search?q=English Concert")
    body = resp.json()
    assert len(body["recordings"]) >= 1
    assert all(r["ensemble_name"] == "The English Concert" for r in body["recordings"])

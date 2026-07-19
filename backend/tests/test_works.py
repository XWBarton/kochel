import pytest

from scripts import seed as seed_module


@pytest.fixture(autouse=True)
async def seeded(db_session):
    await seed_module.main()


async def _work_id(client, title: str) -> int:
    resp = await client.get("/api/v1/works")
    work = next(w for w in resp.json()["items"] if w["title"] == title)
    return work["id"]


async def test_delete_work_removes_it(client):
    work_id = await _work_id(client, "Brandenburg Concerto No. 3 in G major")

    resp = await client.delete(f"/api/v1/works/{work_id}")
    assert resp.status_code == 204

    assert (await client.get(f"/api/v1/works/{work_id}")).status_code == 404
    remaining_titles = {w["title"] for w in (await client.get("/api/v1/works")).json()["items"]}
    assert "Brandenburg Concerto No. 3 in G major" not in remaining_titles


async def test_delete_work_leaves_composer_and_other_works_intact(client):
    work_id = await _work_id(client, "Brandenburg Concerto No. 3 in G major")
    composer_resp = await client.get(f"/api/v1/works/{work_id}")
    composer_id = composer_resp.json()["composer_id"]

    await client.delete(f"/api/v1/works/{work_id}")

    resp = await client.get(f"/api/v1/composers/{composer_id}/works")
    assert resp.status_code == 200  # composer itself still resolvable via its works route


async def test_delete_work_404_for_unknown_id(client):
    resp = await client.delete("/api/v1/works/999999")
    assert resp.status_code == 404

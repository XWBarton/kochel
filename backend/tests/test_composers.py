import pytest

from scripts import seed as seed_module


@pytest.fixture(autouse=True)
async def seeded(db_session):
    await seed_module.main()


async def _composer_id(client, name: str) -> int:
    resp = await client.get("/api/v1/composers")
    composer = next(c for c in resp.json()["items"] if c["name"] == name)
    return composer["id"]


async def test_update_composer_fields(client):
    composer_id = await _composer_id(client, "Johann Sebastian Bach")

    resp = await client.put(
        f"/api/v1/composers/{composer_id}",
        json={
            "name": "J.S. Bach",
            "sort_name": "Bach, J.S.",
            "birth_year": 1685,
            "death_year": 1750,
            "period": "Baroque",
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["name"] == "J.S. Bach"
    assert body["sort_name"] == "Bach, J.S."
    assert body["period"] == "Baroque"


async def test_update_composer_defaults_sort_name_to_name_when_blank(client):
    composer_id = await _composer_id(client, "Johann Sebastian Bach")

    resp = await client.put(
        f"/api/v1/composers/{composer_id}",
        json={"name": "Bach", "sort_name": "", "birth_year": None, "death_year": None, "period": None},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["sort_name"] == "Bach"


async def test_update_composer_leaves_works_intact(client):
    composer_id = await _composer_id(client, "Johann Sebastian Bach")

    await client.put(
        f"/api/v1/composers/{composer_id}",
        json={"name": "J.S. Bach", "sort_name": None, "birth_year": None, "death_year": None, "period": None},
    )
    resp = await client.get(f"/api/v1/composers/{composer_id}/works")
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1


async def test_update_composer_rejects_blank_name(client):
    composer_id = await _composer_id(client, "Johann Sebastian Bach")
    resp = await client.put(
        f"/api/v1/composers/{composer_id}",
        json={"name": "  ", "sort_name": None, "birth_year": None, "death_year": None, "period": None},
    )
    assert resp.status_code == 400


async def test_update_composer_404_for_unknown_id(client):
    resp = await client.put(
        "/api/v1/composers/999999",
        json={"name": "Anyone", "sort_name": None, "birth_year": None, "death_year": None, "period": None},
    )
    assert resp.status_code == 404


async def test_upload_composer_image_sets_url_and_serves_file(client, composer_images_root):
    composer_id = await _composer_id(client, "Johann Sebastian Bach")

    resp = await client.put(
        f"/api/v1/composers/{composer_id}/image",
        files={"file": ("bach.jpg", b"fake jpeg bytes", "image/jpeg")},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["image_url"] is not None
    assert (composer_images_root / f"{composer_id}.jpg").read_bytes() == b"fake jpeg bytes"

    get_resp = await client.get(f"/api/v1/composers/{composer_id}/image")
    assert get_resp.status_code == 200
    assert get_resp.content == b"fake jpeg bytes"
    assert get_resp.headers["content-type"] == "image/jpeg"


async def test_upload_composer_image_replaces_previous_extension(client, composer_images_root):
    composer_id = await _composer_id(client, "Johann Sebastian Bach")

    await client.put(
        f"/api/v1/composers/{composer_id}/image",
        files={"file": ("bach.jpg", b"jpeg bytes", "image/jpeg")},
    )
    resp = await client.put(
        f"/api/v1/composers/{composer_id}/image",
        files={"file": ("bach.png", b"png bytes", "image/png")},
    )
    assert resp.status_code == 200, resp.text
    assert not (composer_images_root / f"{composer_id}.jpg").exists()
    assert (composer_images_root / f"{composer_id}.png").read_bytes() == b"png bytes"


async def test_upload_composer_image_rejects_unsupported_type(client, composer_images_root):
    composer_id = await _composer_id(client, "Johann Sebastian Bach")

    resp = await client.put(
        f"/api/v1/composers/{composer_id}/image",
        files={"file": ("bach.pdf", b"not an image", "application/pdf")},
    )
    assert resp.status_code == 422
    assert not any(composer_images_root.iterdir()) if composer_images_root.exists() else True


async def test_delete_composer_image_clears_url_and_removes_file(client, composer_images_root):
    composer_id = await _composer_id(client, "Johann Sebastian Bach")
    await client.put(
        f"/api/v1/composers/{composer_id}/image",
        files={"file": ("bach.jpg", b"jpeg bytes", "image/jpeg")},
    )

    resp = await client.delete(f"/api/v1/composers/{composer_id}/image")
    assert resp.status_code == 200, resp.text
    assert resp.json()["image_url"] is None
    assert not (composer_images_root / f"{composer_id}.jpg").exists()

    get_resp = await client.get(f"/api/v1/composers/{composer_id}/image")
    assert get_resp.status_code == 404


async def test_get_composer_image_404_when_none_set(client, composer_images_root):
    composer_id = await _composer_id(client, "Johann Sebastian Bach")
    resp = await client.get(f"/api/v1/composers/{composer_id}/image")
    assert resp.status_code == 404

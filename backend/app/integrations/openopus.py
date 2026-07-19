"""Open Opus (api.openopus.org) client — a free reference dataset used only to
*suggest* composer/work matches during import. It is never a source of truth:
suggestions are copied into our own tables at commit time, and Open Opus IDs
are not stored anywhere in the schema.

Network failures are swallowed and surfaced as empty result lists rather than
raised — a slow/unreachable Open Opus should degrade the import UI to "no
suggestions", not break scanning or manual entry.
"""

import logging

import httpx

logger = logging.getLogger(__name__)

BASE_URL = "https://api.openopus.org"
TIMEOUT = httpx.Timeout(5.0)


def _year(date_str: str | None) -> int | None:
    if not date_str:
        return None
    try:
        return int(date_str.split("-")[0])
    except (ValueError, IndexError):
        return None


async def _get(path: str) -> dict | None:
    try:
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=TIMEOUT) as client:
            resp = await client.get(path)
            resp.raise_for_status()
            return resp.json()
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("Open Opus request failed: %s (%s)", path, exc)
        return None


async def search_composers(query: str) -> list[dict]:
    """GET /composer/list/search/{query}.json"""
    if not query.strip():
        return []
    data = await _get(f"/composer/list/search/{query}.json")
    if not data:
        return []
    return [
        {
            "openopus_id": c["id"],
            "name": c.get("complete_name") or c["name"],
            "period": c.get("epoch"),
            "birth_year": _year(c.get("birth")),
            "death_year": _year(c.get("death")),
        }
        for c in data.get("composers", [])
    ]


async def list_works_for_composer(openopus_id: str) -> list[dict]:
    """GET /work/list/composer/{id}/genre/all.json"""
    data = await _get(f"/work/list/composer/{openopus_id}/genre/all.json")
    if not data:
        return []
    return [
        {"title": w["title"], "genre": w.get("genre")} for w in data.get("works", [])
    ]

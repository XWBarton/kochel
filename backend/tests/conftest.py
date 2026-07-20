"""Runs against a real Postgres (DATABASE_URL) rather than a mocked DB —
schema is dropped and recreated per test, so tests observe the same
integrity constraints (FKs, partial unique index) that production runs
against.

DATABASE_URL for test runs MUST point at a database whose name ends in
"_test" (e.g. postgresql+asyncpg://user:pass@host:5432/kochel_test) — this
is enforced below. The fixture drops and recreates the entire schema before
every test, so pointing it at the dev/demo database would silently wipe it.
"""

import asyncio

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app import db as app_db
from app.config import settings
from app.main import app
from app.models import Base

_BASE_URL, _, _DB_NAME = settings.database_url.rpartition("/")

if not _DB_NAME.endswith("_test"):
    raise RuntimeError(
        "Refusing to run tests: DATABASE_URL must point at a database whose name "
        f"ends in '_test' (got {settings.database_url!r}). This test suite drops "
        "and recreates the whole schema before every test — pointing it at the "
        "dev/demo database would destroy that data. Pass e.g. "
        "DATABASE_URL=postgresql+asyncpg://user:pass@postgres:5432/kochel_test."
    )


async def _ensure_test_database_exists() -> None:
    maintenance_engine = create_async_engine(
        f"{_BASE_URL}/postgres", isolation_level="AUTOCOMMIT"
    )
    try:
        async with maintenance_engine.connect() as conn:
            exists = await conn.scalar(
                text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": _DB_NAME}
            )
            if not exists:
                await conn.execute(text(f'CREATE DATABASE "{_DB_NAME}"'))
    finally:
        await maintenance_engine.dispose()


asyncio.run(_ensure_test_database_exists())


@pytest_asyncio.fixture
async def db_session():
    # app.db.engine is a module-level singleton whose pooled asyncpg connections
    # are bound to whichever event loop opened them. pytest-asyncio gives each
    # test function its own loop, so a pooled connection from a previous test's
    # loop would otherwise blow up on checkout — dispose it first so this test
    # opens fresh connections under its own loop.
    await app_db.engine.dispose()

    engine = create_async_engine(settings.database_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    yield
    await app_db.engine.dispose()


@pytest_asyncio.fixture
async def client(db_session):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def music_root(tmp_path, db_session):
    original = settings.music_library_root
    settings.music_library_root = tmp_path
    yield tmp_path
    settings.music_library_root = original


@pytest_asyncio.fixture
async def composer_images_root(tmp_path, db_session):
    original = settings.composer_images_root
    settings.composer_images_root = tmp_path / "composer-images"
    yield settings.composer_images_root
    settings.composer_images_root = original

"""
Data retention purge task — 48-hour auto-expiry.

Deletes all Investigation records (and cascades to entities, relationships,
raw_signals, and evidence) where expires_at < now().

This module provides:
  - A one-shot `run_purge()` coroutine (callable on demand or via test)
  - An `async_scheduler()` loop that runs every 30 minutes and can be
    started as an asyncio background task.
"""

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.domain.models import Investigation

logger = logging.getLogger(__name__)

PURGE_INTERVAL_SECONDS = 1800  # 30 minutes


async def run_purge(db: AsyncSession | None = None) -> int:
    """
    Delete all expired investigations.

    If `db` is provided (e.g. in tests), use it directly.
    Otherwise, open a fresh session from the pool.

    Returns the number of investigations deleted.
    """
    own_session = db is None
    session = db if db else AsyncSessionLocal()

    try:
        now = datetime.now(timezone.utc)
        stmt = (
            select(Investigation)
            .where(
                Investigation.expires_at.isnot(None),
                Investigation.expires_at < now,
            )
        )
        result = await session.execute(stmt)
        expired = result.scalars().all()
        count = len(expired)

        if count:
            ids = [inv.id for inv in expired]
            del_stmt = delete(Investigation).where(Investigation.id.in_(ids))
            await session.execute(del_stmt)
            await session.commit()
            logger.info("Purge task: deleted %d expired investigation(s).", count)
        else:
            logger.debug("Purge task: no expired investigations found.")

        return count

    except Exception as exc:
        logger.error("Purge task failed: %s", exc, exc_info=True)
        if own_session:
            await session.rollback()
        raise
    finally:
        if own_session:
            await session.close()


async def async_scheduler() -> None:
    """
    Background asyncio task that runs run_purge() on a fixed interval.
    Intended to be started with asyncio.create_task() during app lifespan.
    """
    logger.info(
        "Data retention scheduler started. Purge interval: %ds.", PURGE_INTERVAL_SECONDS
    )
    while True:
        try:
            await run_purge()
        except Exception:
            pass  # Errors are logged inside run_purge; scheduler must never crash.
        await asyncio.sleep(PURGE_INTERVAL_SECONDS)

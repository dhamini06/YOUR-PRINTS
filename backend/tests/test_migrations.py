import os
import pytest
from alembic.config import Config
from alembic import command


def test_alembic_schema_upgrade_and_downgrade():
    """Verify that Alembic migrations run cleanly to head and downgrade to base."""
    db_file = "test_migration_run.db"
    if os.path.exists(db_file):
        os.remove(db_file)

    try:
        ini_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
        migrations_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "migrations"))

        alembic_cfg = Config(ini_path)
        alembic_cfg.set_main_option("script_location", migrations_dir)
        alembic_cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{db_file}")

        # Run upgrade to head
        command.upgrade(alembic_cfg, "head")

        # Run downgrade to base
        command.downgrade(alembic_cfg, "base")
    finally:
        if os.path.exists(db_file):
            os.remove(db_file)

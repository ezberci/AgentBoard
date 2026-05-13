from sqlalchemy import event
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import StaticPool

from vibe_kanban_clone.config import settings

engine = create_async_engine(
    f"sqlite+aiosqlite:///{settings.db_path}",
    connect_args={"timeout": 5.0},
    poolclass=StaticPool,
)


@event.listens_for(engine.sync_engine, "connect")
def _set_sqlite_pragmas(dbapi_conn, _):
    cur = dbapi_conn.cursor()
    cur.execute("PRAGMA busy_timeout=5000")
    cur.execute("PRAGMA foreign_keys=ON")
    cur.execute("PRAGMA synchronous=NORMAL")
    cur.close()

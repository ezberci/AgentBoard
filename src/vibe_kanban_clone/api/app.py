from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from vibe_kanban_clone.api.deps import require_auth
from vibe_kanban_clone.api.routes import (
    agents,
    columns,
    mcp_info,
    models,
    projects,
    skills,
    tasks,
    ws,
)
from vibe_kanban_clone.config import settings
from vibe_kanban_clone.logging import configure_logging

configure_logging()

app = FastAPI(
    title="Vibe Kanban Clone",
    docs_url=None if settings.env == "production" else "/docs",
    redoc_url=None if settings.env == "production" else "/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "x-api-key"],
)

app.include_router(projects.router, prefix="/api", dependencies=[Depends(require_auth)])
app.include_router(columns.router, prefix="/api", dependencies=[Depends(require_auth)])
app.include_router(tasks.router, prefix="/api", dependencies=[Depends(require_auth)])
app.include_router(agents.router, prefix="/api", dependencies=[Depends(require_auth)])
app.include_router(skills.router, prefix="/api", dependencies=[Depends(require_auth)])
app.include_router(models.router, prefix="/api", dependencies=[Depends(require_auth)])
app.include_router(mcp_info.router, prefix="/api", dependencies=[Depends(require_auth)])
app.include_router(ws.router)


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}

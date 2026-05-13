from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from vibe_kanban_clone.api.routes import agents, columns, mcp_info, projects, skills, tasks, ws
from vibe_kanban_clone.config import settings

app = FastAPI(title="Vibe Kanban Clone")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/api")
app.include_router(columns.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(agents.router, prefix="/api")
app.include_router(skills.router, prefix="/api")
app.include_router(mcp_info.router, prefix="/api")
app.include_router(ws.router)


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}

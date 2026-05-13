from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from vibe_kanban_clone.config import settings

app = FastAPI(title="Vibe Kanban Clone")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}

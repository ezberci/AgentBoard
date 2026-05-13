import uvicorn

from vibe_kanban_clone.config import settings


def main() -> None:
    uvicorn.run(
        "vibe_kanban_clone.api.app:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=True,
    )


if __name__ == "__main__":
    main()

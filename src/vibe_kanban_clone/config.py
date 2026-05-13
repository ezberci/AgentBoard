from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    db_path: Path = Path("vibe_kanban.db")
    app_host: str = "127.0.0.1"
    app_port: int = 8765
    cors_origins: list[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

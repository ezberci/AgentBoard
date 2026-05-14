from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    db_path: Path = Path(__file__).resolve().parents[2] / "vibe_kanban.db"
    app_host: str = "127.0.0.1"
    app_port: int = 8765
    cors_origins: list[str] = ["http://localhost:5173"]
    api_key: str = "dev-key-change-me"
    env: str = "development"


settings = Settings()

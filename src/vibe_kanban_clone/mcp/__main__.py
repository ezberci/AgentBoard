from pathlib import Path

from dotenv import load_dotenv

env_path = Path(__file__).resolve().parents[2] / ".env"
if env_path.exists():
    load_dotenv(env_path)

from vibe_kanban_clone.mcp.server import run  # noqa: E402

if __name__ == "__main__":
    run()

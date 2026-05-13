from pathlib import Path

from dotenv import load_dotenv

env_path = Path(__file__).resolve().parents[2] / ".env"
if env_path.exists():
    load_dotenv(env_path)

# TODO: MCP server entrypoint (Phase 3)

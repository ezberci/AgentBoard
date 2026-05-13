"""MCP info route."""

from pathlib import Path

from fastapi import APIRouter

router = APIRouter()

_project_root = Path(__file__).resolve().parents[4]


@router.get("/mcp-info")
async def mcp_info() -> dict[str, str | list[str]]:
    """Return MCP server registration snippet for Claude Code."""
    return {
        "name": "vibe-kanban",
        "command": "uv",
        "args": [
            "--directory",
            str(_project_root),
            "run",
            "python",
            "-m",
            "vibe_kanban_clone.mcp",
        ],
    }

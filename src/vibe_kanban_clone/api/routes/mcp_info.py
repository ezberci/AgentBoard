"""MCP info route."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/mcp-info")
async def mcp_info() -> dict[str, str | list[str]]:
    """Return MCP server registration snippet for Claude Code."""
    return {
        "name": "vibe-kanban",
        "command": "uv",
        "args": [
            "--directory",
            ".",
            "run",
            "python",
            "-m",
            "vibe_kanban_clone.mcp",
        ],
    }

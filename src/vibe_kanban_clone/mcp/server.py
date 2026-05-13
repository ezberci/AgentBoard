"""MCP server wiring."""

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("vibe-kanban")


def run() -> None:
    """Run the MCP server over stdio transport."""
    # Import tools to register them via decorators
    import vibe_kanban_clone.mcp.tools  # noqa: F401

    mcp.run(transport="stdio")

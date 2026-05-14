"""API key authentication dependency."""

from fastapi import HTTPException, Request

from vibe_kanban_clone.config import settings


async def require_auth(request: Request) -> None:
    """Validate the X-API-Key header."""
    api_key = request.headers.get("x-api-key")
    if api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")

"""WebSocket routes for real-time updates."""

import asyncio
import json
from typing import Any

import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from vibe_kanban_clone.config import settings

logger = structlog.get_logger()

router = APIRouter()


class ConnectionManager:
    """In-memory connection manager for WebSocket channels."""

    def __init__(self) -> None:
        self._project_connections: dict[int, set[WebSocket]] = {}
        self._global_connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect_project(self, websocket: WebSocket, project_id: int) -> bool:
        """Accept and track a project-level connection."""
        api_key = websocket.headers.get("x-api-key") or websocket.query_params.get("api_key")
        if api_key != settings.api_key:
            await websocket.close(code=1008)
            return False
        await websocket.accept()
        async with self._lock:
            self._project_connections.setdefault(project_id, set()).add(websocket)
        return True

    async def connect_global(self, websocket: WebSocket) -> bool:
        """Accept and track a global connection."""
        api_key = websocket.headers.get("x-api-key") or websocket.query_params.get("api_key")
        if api_key != settings.api_key:
            await websocket.close(code=1008)
            return False
        await websocket.accept()
        async with self._lock:
            self._global_connections.add(websocket)
        return True

    async def disconnect(self, websocket: WebSocket, project_id: int | None = None) -> None:
        """Remove a connection from all channels."""
        async with self._lock:
            if project_id is not None:
                project_set = self._project_connections.get(project_id)
                if project_set:
                    project_set.discard(websocket)
                    if not project_set:
                        del self._project_connections[project_id]
            self._global_connections.discard(websocket)

    async def broadcast_project(self, project_id: int, message: dict[str, Any]) -> None:
        """Broadcast a JSON message to all connections on a project channel."""
        connections = self._project_connections.get(project_id, set()).copy()
        payload = json.dumps(message)
        for conn in connections:
            try:
                await conn.send_text(payload)
            except Exception as exc:
                logger.warning("websocket_send_failed", error=str(exc))
                await self.disconnect(conn, project_id)

    async def broadcast_global(self, message: dict[str, Any]) -> None:
        """Broadcast a JSON message to all global connections."""
        connections = self._global_connections.copy()
        payload = json.dumps(message)
        for conn in connections:
            try:
                await conn.send_text(payload)
            except Exception as exc:
                logger.warning("websocket_send_failed", error=str(exc))
                await self.disconnect(conn)


manager = ConnectionManager()


@router.websocket("/ws/projects/{project_id}")
async def project_websocket(websocket: WebSocket, project_id: int) -> None:
    """Project-level WebSocket channel."""
    accepted = await manager.connect_project(websocket, project_id)
    if not accepted:
        return
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket, project_id)


@router.websocket("/ws/global")
async def global_websocket(websocket: WebSocket) -> None:
    """Global WebSocket channel for agent/skill/model events."""
    accepted = await manager.connect_global(websocket)
    if not accepted:
        return
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)


async def broadcast_project(project_id: int, event_type: str, payload: dict[str, Any]) -> None:
    """Helper to broadcast an event to a project's channel."""
    await manager.broadcast_project(project_id, {"type": event_type, "payload": payload})


async def broadcast_global(event_type: str, payload: dict[str, Any]) -> None:
    """Helper to broadcast an event to the global channel."""
    await manager.broadcast_global({"type": event_type, "payload": payload})

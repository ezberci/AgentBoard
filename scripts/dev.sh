#!/bin/bash
set -e

cd "$(dirname "$0")/.."

uv run uvicorn vibe_kanban_clone.api.app:app --host 127.0.0.1 --port 8765 &
BACKEND_PID=$!

cd web && pnpm dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM EXIT
wait

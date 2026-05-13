#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "=== ruff format ==="
uv run ruff format --check src tests
echo "=== ruff check ==="
uv run ruff check src tests
echo "=== pytest ==="
uv run pytest
echo "=== All checks passed ==="

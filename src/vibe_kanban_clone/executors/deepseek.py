"""DeepSeek executor implementation."""

import json
import os
from collections.abc import AsyncIterator

import httpx

from vibe_kanban_clone.executors.base import BaseExecutor


class DeepSeekExecutor(BaseExecutor):
    """Executor for DeepSeek API (OpenAI-compatible streaming)."""

    async def run(self, prompt: str, model_config: dict) -> AsyncIterator[str]:
        api_key = os.environ.get(model_config["api_key_env"])
        if not api_key:
            raise RuntimeError(f"Missing env var: {model_config['api_key_env']}")

        base_url = model_config.get("base_url", "https://api.deepseek.com")
        model_id = model_config["model_id"]

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model_id,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": True,
                },
                timeout=120,
            )
            response.raise_for_status()

            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        delta = chunk["choices"][0]["delta"]
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except Exception:
                        pass

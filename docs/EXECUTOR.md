# Executor System

> Internal LLM execution for tasks.

## 1. Overview

The executor system runs tasks against LLM APIs (currently DeepSeek) with:
- Streaming output (token-by-token)
- WebSocket broadcast to frontend
- Run history persistence
- Failure isolation and rollback

## 2. Architecture

```
[User clicks Run] → POST /api/tasks/{id}/run
         ↓
[FastAPI] → asyncio.create_task(execute_task_run(...))
         ↓
[Background] → Executor.run(prompt, model_config)
         ↓
[DeepSeek API] → SSE streaming
         ↓
[Per-token] → WS broadcast run.token
         ↓
[Done] → DB update + WS broadcast run.finished
```

## 3. Components

### 3.1 Base Interface

```python
# src/vibe_kanban_clone/executors/base.py
class BaseExecutor(ABC):
    @abstractmethod
    async def run(self, prompt: str, model_config: dict) -> AsyncIterator[str]:
        ...
```

### 3.2 Registry

```python
# src/vibe_kanban_clone/executors/registry.py
_EXECUTORS = {
    "deepseek": DeepSeekExecutor,
}

def get_executor(provider: str) -> BaseExecutor:
    return _EXECUTORS[provider]()
```

Register custom executor:
```python
from vibe_kanban_clone.executors.registry import register_executor
register_executor("openai", OpenAIExecutor)
```

### 3.3 DeepSeek Executor

OpenAI-compatible streaming using `httpx.AsyncClient`:

```python
async with httpx.AsyncClient() as client:
    response = await client.post(
        f"{base_url}/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": model_id,
            "messages": [{"role": "user", "content": prompt}],
            "stream": True,
        },
        timeout=120,
    )
    async for line in response.aiter_lines():
        if line.startswith("data: "):
            data = line[6:]
            if data == "[DONE]": break
            chunk = json.loads(data)
            content = chunk["choices"][0]["delta"].get("content", "")
            if content:
                yield content
```

## 4. Execution Service

`services/runs.py` handles the full lifecycle:

1. **Create run record** (`status=running`)
2. **Broadcast `run.started`**
3. **Stream tokens** → broadcast `run.token` per chunk
4. **On success**: update run (`status=completed`, `output=full_text`)
5. **On failure**: rollback session, open cleanup session, update run (`status=failed`, `error=message`)
6. **Broadcast `run.finished`**

### Failure Path

```python
try:
    async for token in executor.run(...):
        ...
except Exception as e:
    await session.rollback()
    async with async_session_factory() as cleanup_session:
        run_clone = await cleanup_session.get(TaskRun, run.id)
        run_clone.status = "failed"
        run_clone.error = f"{type(e).__name__}: {e}"[:500]
        run_clone.finished_at = datetime.now(timezone.utc)
        await cleanup_session.commit()
    await broadcast_project(project_id, "run.finished", { ... })
```

**Rules:**
- Task column does NOT change on failure — user moves manually
- Error stored in `task_runs.error` (max 500 chars, CHECK constraint)
- Full traceback NOT broadcast — only short error message
- Re-run requires user to click Run again

## 5. Model Registry

Executors read model config from the `models` table:

| Field | Example | Usage |
|-------|---------|-------|
| `provider` | `deepseek` | Registry lookup |
| `model_id` | `deepseek-chat` | API request body |
| `api_key_env` | `DEEPSEEK_API_KEY` | `os.environ.get(...)` |
| `base_url` | `https://api.deepseek.com` | Optional override |

## 6. Adding a New Provider

1. Create `executors/<provider>.py` extending `BaseExecutor`
2. Register in `executors/registry.py`
3. Add model row via `/api/models` or DB seed

No backend code changes required beyond the executor class itself.

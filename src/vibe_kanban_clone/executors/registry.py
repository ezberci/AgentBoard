"""Executor registry."""

from vibe_kanban_clone.executors.base import BaseExecutor
from vibe_kanban_clone.executors.deepseek import DeepSeekExecutor

_EXECUTORS: dict[str, type[BaseExecutor]] = {
    "deepseek": DeepSeekExecutor,
}


def get_executor(provider: str) -> BaseExecutor:
    """Return an executor instance for the given provider."""
    executor_cls = _EXECUTORS.get(provider)
    if executor_cls is None:
        raise ValueError(f"Unsupported provider: {provider}")
    return executor_cls()


def register_executor(provider: str, executor_cls: type[BaseExecutor]) -> None:
    """Register a custom executor."""
    _EXECUTORS[provider] = executor_cls

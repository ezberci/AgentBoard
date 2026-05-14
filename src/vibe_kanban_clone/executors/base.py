"""Abstract executor interface."""

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator


class BaseExecutor(ABC):
    """Base class for LLM executors."""

    @abstractmethod
    async def run(self, prompt: str, model_config: dict) -> AsyncIterator[str]:
        """Execute a prompt and yield output tokens/chunks."""
        ...

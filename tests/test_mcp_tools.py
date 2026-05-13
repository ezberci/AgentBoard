import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import test_engine
from vibe_kanban_clone.db import engine as _engine_module
from vibe_kanban_clone.mcp.tools import claim_next_task, complete_task, get_context, list_tasks
from vibe_kanban_clone.schemas.agent import AgentCreate
from vibe_kanban_clone.schemas.column import ColumnCreate
from vibe_kanban_clone.schemas.project import ProjectCreate
from vibe_kanban_clone.schemas.task import TaskCreate
from vibe_kanban_clone.services.agents import create_agent
from vibe_kanban_clone.services.columns import create_column
from vibe_kanban_clone.services.projects import create_project
from vibe_kanban_clone.services.tasks import create_task


@pytest.fixture(autouse=True)
def patch_mcp_engine():
    original = _engine_module.engine
    _engine_module.engine = test_engine
    yield
    _engine_module.engine = original


@pytest.mark.asyncio
async def test_get_context(session: AsyncSession):
    project = await create_project(session, ProjectCreate(name="Test Project"))
    col = await create_column(session, project.id, ColumnCreate(name="Backlog", position=0))
    await create_task(session, TaskCreate(project_id=project.id, column_id=col.id, title="Task 1"))

    ctx = await get_context()
    assert ctx["current_project"]["name"] == "Test Project"
    assert len(ctx["columns"]) == 1
    assert ctx["columns"][0]["name"] == "Backlog"
    assert len(ctx["recent_tasks"]) == 1
    assert ctx["recent_tasks"][0]["title"] == "Task 1"


@pytest.mark.asyncio
async def test_list_tasks(session: AsyncSession):
    project = await create_project(session, ProjectCreate(name="P"))
    col = await create_column(session, project.id, ColumnCreate(name="Backlog", position=0))
    await create_task(
        session, TaskCreate(project_id=project.id, column_id=col.id, title="T1", priority=1)
    )
    await create_task(
        session, TaskCreate(project_id=project.id, column_id=col.id, title="T2", priority=2)
    )

    tasks = await list_tasks(project_id=project.id, status="todo")
    assert len(tasks) == 2

    tasks = await list_tasks(project_id=project.id, priority_gte=2)
    assert len(tasks) == 1
    assert tasks[0]["title"] == "T2"


@pytest.mark.asyncio
async def test_claim_next_task(session: AsyncSession):
    project = await create_project(session, ProjectCreate(name="P"))
    col1 = await create_column(session, project.id, ColumnCreate(name="Backlog", position=0))
    col2 = await create_column(session, project.id, ColumnCreate(name="In Progress", position=1))
    _task = await create_task(
        session, TaskCreate(project_id=project.id, column_id=col1.id, title="T1")
    )
    agent = await create_agent(session, AgentCreate(name="A1"))

    claimed = await claim_next_task(agent_id=agent.id, project_id=project.id)
    assert claimed is not None
    assert claimed["title"] == "T1"
    assert claimed["column_id"] == col2.id
    assert claimed["assigned_agent_id"] == agent.id
    assert claimed["claimed_at"] is not None


@pytest.mark.asyncio
async def test_complete_task(session: AsyncSession):
    project = await create_project(session, ProjectCreate(name="P"))
    col1 = await create_column(session, project.id, ColumnCreate(name="Backlog", position=0))
    terminal = await create_column(
        session, project.id, ColumnCreate(name="Done", position=2, is_terminal=True)
    )
    task = await create_task(
        session, TaskCreate(project_id=project.id, column_id=col1.id, title="T1")
    )
    agent = await create_agent(session, AgentCreate(name="A1"))

    await claim_next_task(agent_id=agent.id, project_id=project.id)
    completed = await complete_task(task_id=task.id, result="Done!")
    assert completed is not None
    assert completed["result"] == "Done!"
    assert completed["column_id"] == terminal.id

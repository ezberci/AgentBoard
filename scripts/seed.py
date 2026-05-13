#!/usr/bin/env python3
"""Seed script for Vibe Kanban."""

import asyncio

import aiosqlite
import structlog

from vibe_kanban_clone.config import settings
from vibe_kanban_clone.db.base import Base
from vibe_kanban_clone.db.engine import engine
from vibe_kanban_clone.schemas.agent import AgentCreate
from vibe_kanban_clone.schemas.column import ColumnCreate
from vibe_kanban_clone.schemas.project import ProjectCreate
from vibe_kanban_clone.schemas.skill import SkillCreate
from vibe_kanban_clone.schemas.task import TaskCreate
from vibe_kanban_clone.schemas.task_comment import TaskCommentCreate
from vibe_kanban_clone.services import agents, columns, comments, projects, skills, tasks

logger = structlog.get_logger()


async def main() -> None:
    """Seed the database with sample data."""
    db_str = str(settings.db_path)
    async with aiosqlite.connect(db_str) as conn:
        await conn.execute("PRAGMA journal_mode=WAL")
        await conn.commit()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    from sqlalchemy.ext.asyncio import async_sessionmaker

    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    async with AsyncSessionLocal() as session:
        project = await projects.create_project(
            session, ProjectCreate(name="Vibe Kanban", description="Main board")
        )

        column_specs = [
            ("Backlog", 0, False),
            ("Todo", 1, False),
            ("In Progress", 2, False),
            ("Review", 3, False),
            ("Done", 4, True),
        ]
        created_columns = []
        for name, pos, terminal in column_specs:
            col = await columns.create_column(
                session,
                project.id,
                ColumnCreate(name=name, position=pos, is_terminal=terminal),
            )
            created_columns.append(col)

        agent_names = [
            "Alpha-Bot",
            "Beta-Bot",
            "Gamma-Bot",
            "Delta-Bot",
            "Epsilon-Bot",
        ]
        created_agents = []
        for name in agent_names:
            agent = await agents.create_agent(
                session,
                AgentCreate(name=name, system_prompt=f"You are {name}."),
            )
            created_agents.append(agent)

        skill_specs = [
            ("Research", "Find information", "Search and summarize", ["web_search"]),
            ("Code", "Write code", "Implement features", ["code_editor"]),
            ("Review", "Code review", "Review pull requests", ["code_editor", "git"]),
            ("Test", "Write tests", "Unit and integration tests", ["pytest"]),
            ("Deploy", "Deploy services", "CI/CD pipelines", ["docker", "kubernetes"]),
            ("Design", "UI/UX design", "Create mockups", ["figma"]),
            ("Docs", "Documentation", "Write docs and guides", ["markdown"]),
            ("Analytics", "Data analysis", "Analyze metrics", ["sql", "python"]),
        ]
        created_skills = []
        for name, desc, instr, tools in skill_specs:
            skill = await skills.create_skill(
                session,
                SkillCreate(name=name, description=desc, instructions=instr, allowed_tools=tools),
            )
            created_skills.append(skill)

        for i, agent in enumerate(created_agents):
            skill = created_skills[i % len(created_skills)]
            await agents.assign_skill(session, agent, skill)

        task_titles = [
            "Set up repo",
            "Design schema",
            "Implement models",
            "Write migrations",
            "Build API routes",
            "Add auth middleware",
            "Create React app",
            "Set up Tailwind",
            "Build Kanban board",
            "Add drag and drop",
            "Integrate WebSockets",
            "Write unit tests",
            "Write integration tests",
            "Set up CI",
            "Deploy to staging",
            "Performance audit",
            "Add logging",
            "Error handling",
            "Write documentation",
            "User feedback loop",
            "Finalize release",
            "Celebrate launch",
        ]
        created_tasks = []
        for idx, title in enumerate(task_titles):
            col = created_columns[idx % len(created_columns)]
            agent = created_agents[idx % len(created_agents)]
            task = await tasks.create_task(
                session,
                TaskCreate(
                    project_id=project.id,
                    column_id=col.id,
                    title=title,
                    description=f"Details for {title}",
                    priority=(idx % 4) + 1,
                    assigned_agent_id=agent.id,
                ),
            )
            created_tasks.append(task)

        comment_specs = [
            (created_tasks[0].id, "Alice", "Great start!"),
            (created_tasks[1].id, "Bob", "Needs more indexes."),
            (created_tasks[2].id, "Charlie", "Looks good to me."),
        ]
        for task_id, author, body in comment_specs:
            await comments.create_comment(
                session, task_id, TaskCommentCreate(author=author, body=body)
            )

    logger.info("database_seeded", tasks=len(task_titles), agents=len(agent_names))


if __name__ == "__main__":
    asyncio.run(main())

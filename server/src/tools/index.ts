import { registerTool } from "./registry.js";

// Planning
import { definition as plan } from "./planning/plan.js";
import { definition as planEnter } from "./planning/plan_enter.js";
import { definition as planExit } from "./planning/plan_exit.js";
import { definition as question } from "./planning/question.js";
import { definition as todo } from "./planning/todo.js";

// Filesystem
import { definition as read } from "./filesystem/read.js";
import { definition as write } from "./filesystem/write.js";
import { definition as edit } from "./filesystem/edit.js";
import { definition as applyPatch } from "./filesystem/apply_patch.js";

// Search
import { definition as glob } from "./search/glob.js";
import { definition as grep } from "./search/grep.js";

// Shell
import { definition as shell } from "./shell/shell.js";
import { definition as task } from "./shell/task.js";
import { definition as taskStatus } from "./shell/task_status.js";

// Web
import { definition as webfetch } from "./web/webfetch.js";
import { definition as websearch } from "./web/websearch.js";
import { definition as repoClone } from "./web/repo_clone.js";
import { definition as repoOverview } from "./web/repo_overview.js";

// Advanced
import { definition as skill } from "./advanced/skill.js";
import { definition as truncate } from "./advanced/truncate.js";
import { definition as truncationDir } from "./advanced/truncation_dir.js";
import { definition as lsp } from "./advanced/lsp.js";
import { definition as mcpWebsearch } from "./advanced/mcp_websearch.js";

registerTool(plan);
registerTool(planEnter);
registerTool(planExit);
registerTool(question);
registerTool(todo);

registerTool(read);
registerTool(write);
registerTool(edit);
registerTool(applyPatch);

registerTool(glob);
registerTool(grep);

registerTool(shell);
registerTool(task);
registerTool(taskStatus);

registerTool(webfetch);
registerTool(websearch);
registerTool(repoClone);
registerTool(repoOverview);

registerTool(skill);
registerTool(truncate);
registerTool(truncationDir);
registerTool(lsp);
registerTool(mcpWebsearch);

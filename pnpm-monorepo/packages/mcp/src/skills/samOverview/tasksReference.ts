import type { SkillFile } from "../../skillDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { formatToolNames } from "../formatToolNames.js";

export const tasksReference: SkillFile = {
  path: "references/tasks.md",
  description:
    "Tasks, the quest system of the organization: target groups, rewards, states and who completes a task.",
  content: `# Tasks

Tasks (\`/app/tasks\`) are the quest system of the organization. A member posts a task with a reward, citizens do it, and the creator confirms who did it.

- **Target group (Zielgruppe)**:
  - Public (Öffentlich): each citizen can accept the task (Annehmen) and drop it again (Aufgeben). When the task has required roles, only the citizens with one of them can. A limit of participants is optional.
  - Group (Gruppe): one task for the citizens that the creator selects.
  - Personalized (Personalisiert): a separate task for each citizen that the creator selects.
  - Group and personalized tasks need \`task;create;taskVisibility=PERSONALIZED\`, public tasks need \`task;create\`.
- **Reward (Belohnung)**: SILC from the balance of the creator ("SILC (Tausch)"), new SILC ("Neue SILC", needs its own permission) or a text. Each citizen who completed the task gets the SILC.
- **States**: open (Offen), then completed (Erfüllt), cancelled (Abgebrochen) or expired (Abgelaufen, after the expiry date). Only an open task can change.
- **Completion**: the creator (or \`task;manage\`) completes the task and selects who did it (Erfüllt durch). A group or personalized task can let its citizens complete it themselves. A repeatable task (Wiederholbar) makes the next repetition when it is completed.

Tools: ${formatToolNames(ToolGroup.Tasks)}.
`,
};

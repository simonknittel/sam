import type { SkillDefinition } from "../../skillDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { eventsReference } from "./eventsReference.js";
import { fleetReference } from "./fleetReference.js";
import { silcAndSincomeReference } from "./silcAndSincomeReference.js";
import { spynetReference } from "./spynetReference.js";
import { tasksReference } from "./tasksReference.js";
import { wikiReference } from "./wikiReference.js";

export const samOverviewSkill: SkillDefinition = {
  name: "sam-overview",
  description:
    "Explains what SAM is, its apps, and the core concepts and processes of each app. Use it when the user asks what SAM or one of its apps does, where a feature is, or how a process of the organization works in SAM, and before you use the tools of an app that you do not know.",
  instructions: `# SAM overview

SAM (Sinister Administration Module) is the internal tooling, ERP and CRM of our Star Citizen organization. It consists of various tools for managing our organization.

- Members sign in with their Discord account.
- Most content is German.

## Basic concepts

- **Citizen and user**: a citizen is a Star Citizen player in SAM, a member or not. A user is a login. SAM links a user to the citizen with the same confirmed Discord ID. Most apps work with citizens.
- **Roles and permissions**: each app and each action needs permissions from the roles of the citizen. The skill \`sam-permissions\` explains them.
- **Access**: a user must be a member of the Discord server of the organization. A new user must confirm their email address and needs the clearance from Human Resources.
- **SILC**: the internal currency of the organization. Members earn it, for example with tasks, and SINcome turns it into aUEC, the money of Star Citizen.
- **Notifications**: SAM notifies members in the app and with web push, for example about new events, tasks or roles. The notification center of the app (the bell) has an inbox and an archive; \`list_my_notifications\` and \`update_notification\` read and change them. Each user can switch off web push per kind on \`/app/account/notifications\`.
- **System log**: each change and each call of a read tool of this server writes an entry to the system log (audit log).

## Apps

The paths are on the host of this MCP server. \`/app/apps\` lists all apps of the user. The column "Tools" gives the tool groups of this server for the app (\`get_user\` without a user id gives the groups of this client). For an app without tools, send the user to the web app.

| App | Path | Purpose | Tools |
| --- | --- | --- | --- |
| Dashboard | \`/app/dashboard\` | Start page with the calendar, the tasks, a wiki page and the Spynet search | – |
| Spynet | \`/app/spynet\` | Intelligence database: citizens, organizations and notes. See [references/spynet.md](references/spynet.md). | ${ToolGroup.Spynet} |
| IAM | \`/app/iam\` | Roles, permission matrix, inheritance matrix and users. See the skill \`sam-permissions\`. | ${ToolGroup.Roles}, ${ToolGroup.Users} |
| Strafpunkte | \`/app/penalty-points\` | Penalty points for citizens. An entry can have an expiry date (Verfällt am); only active entries count. | ${ToolGroup.PenaltyPoints} |
| Flotte | \`/app/fleet\` | Own ships and the fleet of the organization. See [references/fleet.md](references/fleet.md). | ${ToolGroup.Fleet} |
| Wiki | \`/app/wiki\` | The knowledge of the organization. See [references/wiki.md](references/wiki.md). | ${ToolGroup.Wiki} |
| Events | \`/app/events\` | Operations and meetings with sign-up, lineup and briefing. See [references/events.md](references/events.md). | ${ToolGroup.Events}, ${ToolGroup.Lineup} |
| Tasks | \`/app/tasks\` | Quest system with rewards. See [references/tasks.md](references/tasks.md). | ${ToolGroup.Tasks} |
| SILC | \`/app/silc\` | Balances, transactions and salaries of the internal currency. See [references/silc-and-sincome.md](references/silc-and-sincome.md). | – |
| SINcome | \`/app/sincome\` | Pays out the profit of the organization for SILC. See [references/silc-and-sincome.md](references/silc-and-sincome.md). | – |
| Karriere | \`/app/career\` | Career trees: the way through the roles. | – |
| Dokumente | \`/app/documents\` | Study documents for the certificates of the organization. | – |
| Benachrichtigungen | \`/app/manual-notifications\` | Notifications with an own title and text to citizens or roles. | ${ToolGroup.ManualNotifications} |
| Changelog | \`/app/changelog\` | The changes of SAM | ${ToolGroup.Changelog} |
| System Log | \`/app/system-log\` | The audit log of all actions. It may show personal or sensitive data. | ${ToolGroup.SystemLog} |
| Statistiken | \`/app/statistics\` | Statistics about the use of SAM | – |
| Log Analyzer | \`/app/tools/log-analyzer\` | Finds events in the Game.log of Star Citizen; members can share them | – |
| Account | \`/app/account\` | Profile (time zone, birthday), notification settings, seasonal themes and sessions | – |
| MCP | \`/app/mcp\` | Connect AI clients via MCP | – |
| Uploads | \`/app/uploads\` | Overview of all file uploads | – |
| Timezones, Avatar Creator, Dogfight Trainer, Cornerstone Image Browser | see \`/app/apps\` | Small tools and a game | – |
| SILO-Anfrage, Scrapper's Codex, Projekte | see \`/app/apps\` | External apps: material requests and price lists, sale of loot on the black market of the organization, and the progress of the projects of the organization | – |
`,
  files: [
    spynetReference,
    fleetReference,
    wikiReference,
    eventsReference,
    tasksReference,
    silcAndSincomeReference,
  ],
};

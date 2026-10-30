import type { SkillFile } from "../../skillDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { formatToolNames } from "../formatToolNames.js";

export const eventsReference: SkillFile = {
  path: "references/events.md",
  description:
    "Events of the organization: visibility, organizer, managers and participants, the lineup with positions and applications, the briefing pages and the templates.",
  content: `# Events

Events (\`/app/events\`) are the operations and meetings of the organization, with sign-up, lineup and briefing.

- **Source**: a member makes the event in SAM, or SAM copies it from the Discord server. The data of a Discord event changes only on Discord, and its sign-ups come from Discord. A SAM event can be published on Discord. After that, only the web app can change its name, description and schedule, or delete it.
- **Visibility (Sichtbarkeit)**: public (Öffentlich: all with \`event;read\`) or restricted (Eingeschränkt: the selected roles, the organizer, the managers and \`event;manage\`).
- **People**: the organizer (Organisator) made the event. The organizer, the managers and \`event;manage\` can change the event, its participants and its managers. Participants (Teilnehmer) sign up themselves, or a manager adds them.
- **Participation (Teilnahme)**: on by default. A manager of the event who may also change the positions can turn it off for a SAM event, and a template can prefill it. Turning it off cancels all sign-ups (each participant gets a notification) and removes the assignments and applications of the lineup; the positions stay. While it is off, nobody can sign up or be added, the lineup, the participant list and the fleet of the participants are hidden, and briefing pages for the participants or for a lineup branch are readable only by the managers. Turning it on again restores nothing.
- **Lineup (Aufstellung)**: a tree of positions (Posten), for example ships with their crew. A position can name the required ships (ship variants) and gets one citizen. The lineup needs \`event;read\` and \`ship;read\`. The participants see the lineup only after a manager publishes it. Then they can apply for positions (Interesse anmelden), and a manager assigns a participant or an applicant. \`othersEventPosition;manage\` can also change the positions.
- **Briefing**: wiki pages of the event, separate from the global wiki. Each page has its own read and edit scope: the managers, the participants, the citizens of a lineup branch, or all who can see the event. At first, only the managers can read the briefing. A manager publishes it with the read scope of the root page.
- **Templates (Vorlagen)**: personal blueprints for new events, with lineup and briefing. The owner can share a template with roles.
- **End**: after the end of the event (without an end: 4 hours after the start), nothing of the event can change.

Members get a notification about a new event. Participants also get notifications about changes, a cancellation, the published lineup and the start in 15 minutes. A published briefing notifies the citizens who can read it.

Tools: ${formatToolNames(ToolGroup.Events)}, ${formatToolNames(ToolGroup.Lineup)}.
`,
};

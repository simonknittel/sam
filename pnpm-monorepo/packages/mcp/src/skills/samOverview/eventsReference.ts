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
- **People**: the organizer (Organisator) made the event. The organizer, the managers and \`event;manage\` can change the event, its participants and its managers. Participants (Teilnehmer) sign up themselves, or a manager adds them directly or invites them (Einladung). An invited citizen accepts the invitation with a sign-up or declines it with an optional comment. A manager can withdraw an open invitation.
- **Participation (Teilnahme)**: on by default. A manager of the event who may also change the positions can turn it off for a SAM event, and a template can prefill it. Turning it off cancels all sign-ups (each participant gets a notification), withdraws the open invitations and removes the assignments and applications of the lineup; the positions stay. While it is off, nobody can sign up, be added or be invited, the lineup, the participant list and the fleet of the participants are hidden, and briefing pages for the participants or for a lineup branch are readable only by the managers. Turning it on again restores nothing.
- **Lineup (Aufstellung)**: a tree of positions (Posten), for example ships with their crew. A position can name the required ships (ship variants, one of them) and the required roles (all of them or one of them), and gets one citizen. The requirements are a guide: a citizen who does not meet them can still apply, and a manager can still assign them. The lineup needs \`event;read\` and \`ship;read\`. The participants see the lineup only after a manager publishes it. Then they can apply for positions (Interesse anmelden), and a manager assigns a participant or an applicant. \`othersEventPosition;manage\` can also change the positions.
- **Briefing**: wiki pages of the event, separate from the global wiki. Each page has its own read and edit scope: the managers, the participants, the citizens of a lineup branch, or all who can see the event. At first, only the managers can read the briefing. A manager publishes it with the read scope of the root page. After a change of the published briefing, a manager can announce the change to its readers; this is only available in the SAM web app.
- **Templates (Vorlagen)**: personal blueprints for new events, with lineup and briefing. The owner can share a template with roles.
- **End**: after the end of the event (without an end: 4 hours after the start), nothing of the event can change.

Members get a notification about a new event. Participants also get notifications about a new start, other changes, a cancellation, the published lineup (with their positions), a position that a manager assigns to them or that they lose in the published lineup, a reminder at 07:30 for the events until the next morning and the start in 15 minutes. A citizen gets a notification when a manager invites them, adds them, removes them or makes them a manager. The citizens of the read scope of the briefing get a notification when a manager publishes it; they and the organizers get one when a manager announces a change. The organizers (creator, managers, Discord creator) get notifications about each answer to an invitation, a new application for a position, a participant who cancels and so frees positions, and the sign-ups and cancellations from 24 hours before the start. The notifications about the lineup need \`ship;read\` like the lineup. The citizen who makes a change gets no notification about it.

Tools: ${formatToolNames(ToolGroup.Events)}, ${formatToolNames(ToolGroup.Lineup)}.
`,
};

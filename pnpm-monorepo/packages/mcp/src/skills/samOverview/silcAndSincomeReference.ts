import type { SkillFile } from "../../skillDefinition.js";

export const silcAndSincomeReference: SkillFile = {
  path: "references/silc-and-sincome.md",
  description:
    "SILC, the internal currency of the organization, and SINcome, which pays out the profit of the organization in aUEC: the four phases of a cycle and the calculation of a share.",
  content: `# SILC and SINcome

## SILC

SILC is the internal currency of the organization. Members earn SILC for their work, and SINcome turns it into aUEC, the money of Star Citizen.

- A transaction (Transaktion) books a positive or negative value to a citizen. The balance (Kontostand) is the sum of the transactions.
- Members get SILC from manual bookings, task rewards and monthly role salaries (Gehälter). Only a role that the citizen has directly pays a salary, and a role with levels pays only at its maximum level.
- The SILC app (\`/app/silc\`) shows all balances and transactions and has the settings (salaries, aUEC per SILC). A member sees their own balance and transactions on the SILC tab of their citizen in Spynet.

## SINcome

SINcome (\`/app/sincome\`) pays out the profit of the organization. The share of a member depends on their SILC. A cycle (SINcome-Zeitraum) has four phases:

1. **Collection (Sammelphase)**: members earn SILC. A member can cede their share (Anteil abtreten) to the other members. The phase ends at midnight of the planned end, or a manager ends it earlier. At the end, SAM keeps the positive balance of each citizen as their snapshot, books each positive balance to 0 (a negative balance stays) and makes each citizen with a positive balance a participant. SILC that members earn after this counts for the next cycle.
2. **Payout preparation (Auszahlung wird vorbereitet)**: the managers (Economics) enter the profit (aUEC-Überschuss) and start the payout. The participants get a notification.
3. **Payout (Auszahlung)**: each participant must accept their payout (Zustimmen), but only after they made a character in the current patch of Star Citizen. The managers pay in the game and mark each payout as paid (Ausgezahlt). The phase ends at the planned end, or a manager ends it.
4. **Completed (Auszahlung abgeschlossen)**: nothing can change.

The calculation: aUEC per SILC = the profit ÷ the snapshots of all participants who did not cede their share. The share of a participant = their snapshot × aUEC per SILC. A share that the participant does not accept before the end of the payout expires (Verfallen) and stays with the organization.

\`profitDistributionCycle;read\` shows SINcome, \`profitDistributionCycle;manage\` manages the cycles. The MCP server has no tools for SILC and SINcome.
`,
};

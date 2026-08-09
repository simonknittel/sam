import "./midnight-automations/setup"; // must be first

import type { ScheduledHandler } from "aws-lambda";
import { initializeRequestContext } from "./common/requestContext";
import { archiveIrrelevantOnSiteNotifications } from "./midnight-automations/archiveIrrelevantOnSiteNotifications";
import { autoAssignInactiveRoles } from "./midnight-automations/autoAssignInactiveRoles";
import { countCitizensPerRole } from "./midnight-automations/countCitizensPerRole";
import { countShips } from "./midnight-automations/countShips";
import { countUniqueLogins } from "./midnight-automations/countUniqueLogins";
import { deleteUnusedUploads } from "./midnight-automations/deleteUnusedUploads";
import { disburseRoleSalaries } from "./midnight-automations/disburseRoleSalaries";
import { endCollectionPhases } from "./midnight-automations/endCollectionPhases";
import { endPayoutPhases } from "./midnight-automations/endPayoutPhases";
import { purgeOrphanedWikiTags } from "./midnight-automations/purgeOrphanedWikiTags";
import { purgeTrashedWikiPages } from "./midnight-automations/purgeTrashedWikiPages";
import { removeExpiredRoles } from "./midnight-automations/removeExpiredRoles";

export const handler: ScheduledHandler = async (event, context) => {
  return initializeRequestContext(context.awsRequestId, async () => {
    await endCollectionPhases();
    await endPayoutPhases();
    await removeExpiredRoles();
    await autoAssignInactiveRoles();
    await countCitizensPerRole();
    await disburseRoleSalaries();
    await countShips();
    await countUniqueLogins();
    await purgeTrashedWikiPages();
    await purgeOrphanedWikiTags();
    await archiveIrrelevantOnSiteNotifications();
    await deleteUnusedUploads();
  });
};

import "./midnight-automations/setup"; // must be first

import type { ScheduledHandler } from "aws-lambda";
import { initializeRequestContext } from "./common/requestContext";
import { runJobsInIsolation } from "./common/runJobsInIsolation";
import { archiveIrrelevantOnSiteNotifications } from "./midnight-automations/archiveIrrelevantOnSiteNotifications";
import { autoAssignInactiveRoles } from "./midnight-automations/autoAssignInactiveRoles";
import { countCitizensPerRole } from "./midnight-automations/countCitizensPerRole";
import { countShips } from "./midnight-automations/countShips";
import { countUniqueLogins } from "./midnight-automations/countUniqueLogins";
import { deleteUnusedUploads } from "./midnight-automations/deleteUnusedUploads";
import { disburseRoleSalaries } from "./midnight-automations/disburseRoleSalaries";
import { endCollectionPhases } from "./midnight-automations/endCollectionPhases";
import { endPayoutPhases } from "./midnight-automations/endPayoutPhases";
import { purgeExpiredAuthenticationRecords } from "./midnight-automations/purgeExpiredAuthenticationRecords";
import { purgeOrphanedWikiTags } from "./midnight-automations/purgeOrphanedWikiTags";
import { purgeTrashedWikiPages } from "./midnight-automations/purgeTrashedWikiPages";
import { removeExpiredRoles } from "./midnight-automations/removeExpiredRoles";

export const handler: ScheduledHandler = async (event, context) => {
  return initializeRequestContext(context.awsRequestId, () =>
    runJobsInIsolation({
      endCollectionPhases,
      endPayoutPhases,
      removeExpiredRoles,
      autoAssignInactiveRoles,
      countCitizensPerRole,
      disburseRoleSalaries,
      countShips,
      countUniqueLogins,
      purgeTrashedWikiPages,
      purgeOrphanedWikiTags,
      archiveIrrelevantOnSiteNotifications,
      deleteUnusedUploads,
      purgeExpiredAuthenticationRecords,
    }),
  );
};

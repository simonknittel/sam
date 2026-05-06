import "./midnight-automations/setup"; // must be first

import type { ScheduledHandler } from "aws-lambda";
import { initializeRequestContext } from "./common/requestContext";
import { autoAssignInactiveRoles } from "./midnight-automations/autoAssignInactiveRoles";
import { countCitizensPerRole } from "./midnight-automations/countCitizensPerRole";
import { countShips } from "./midnight-automations/countShips";
import { countUniqueLogins } from "./midnight-automations/countUniqueLogins";
import { disburseRoleSalaries } from "./midnight-automations/disburseRoleSalaries";
import { removeExpiredRoles } from "./midnight-automations/removeExpiredRoles";

export const handler: ScheduledHandler = async (event, context) => {
  return initializeRequestContext(context.awsRequestId, async () => {
    // TODO: Add profit distribution cycle automation here

    await removeExpiredRoles();
    await autoAssignInactiveRoles();
    await countCitizensPerRole();
    await disburseRoleSalaries();
    await countShips();
    await countUniqueLogins();
  });
};

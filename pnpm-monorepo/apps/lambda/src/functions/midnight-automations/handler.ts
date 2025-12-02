import { countCitizensPerRole } from "./countCitizensPerRole";
import { countShips } from "./countShips";
import { countUniqueLogins } from "./countUniqueLogins";
import { disburseRoleSalaries } from "./disburseRoleSalaries";
import "./env";
import { removeExpiredRoles } from "./removeExpiredRoles";

export const midnightAutomationsHandler = async () => {
  // TODO: Add profit distribution cycle automation here

  await removeExpiredRoles();
  await countCitizensPerRole();
  await disburseRoleSalaries();
  await countShips();
  await countUniqueLogins();
};

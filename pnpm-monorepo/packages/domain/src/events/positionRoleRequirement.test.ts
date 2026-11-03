import { EventPositionRoleMatch } from "@sam-monorepo/database/browser";
import { describe, expect, it } from "vitest";
import { hasRequiredRolesOfPosition } from "./positionRoleRequirement.js";

const requiredRoles = [{ roleId: "pilot" }, { roleId: "medic" }];
const pilotOnly = new Set(["pilot", "member"]);
const pilotAndMedic = new Set(["pilot", "medic"]);

describe("hasRequiredRolesOfPosition", () => {
  it("accepts each citizen when the position requires no role", () => {
    expect(
      hasRequiredRolesOfPosition(
        { requiredRoles: [], requiredRoleMatch: EventPositionRoleMatch.ALL },
        new Set(),
      ),
    ).toBe(true);
  });

  it("needs one of the roles with ANY", () => {
    const position = {
      requiredRoles,
      requiredRoleMatch: EventPositionRoleMatch.ANY,
    };

    expect(hasRequiredRolesOfPosition(position, pilotOnly)).toBe(true);
    expect(hasRequiredRolesOfPosition(position, new Set(["member"]))).toBe(
      false,
    );
  });

  it("needs each role with ALL", () => {
    const position = {
      requiredRoles,
      requiredRoleMatch: EventPositionRoleMatch.ALL,
    };

    expect(hasRequiredRolesOfPosition(position, pilotOnly)).toBe(false);
    expect(hasRequiredRolesOfPosition(position, pilotAndMedic)).toBe(true);
  });
});

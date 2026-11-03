import { EventPositionRoleMatch } from "@sam-monorepo/database/browser";
import { describe, expect, it } from "vitest";
import { getMissingRequiredRoleIds } from "./positionRoleRequirement.js";

const requiredRoles = [{ roleId: "pilot" }, { roleId: "medic" }];
const pilotOnly = new Set(["pilot", "member"]);
const pilotAndMedic = new Set(["pilot", "medic"]);

describe("getMissingRequiredRoleIds", () => {
  it("misses nothing when the position requires no role", () => {
    expect(
      getMissingRequiredRoleIds(
        { requiredRoles: [], requiredRoleMatch: EventPositionRoleMatch.ALL },
        new Set(),
      ),
    ).toEqual([]);
  });

  it("needs one of the roles with ANY", () => {
    const position = {
      requiredRoles,
      requiredRoleMatch: EventPositionRoleMatch.ANY,
    };

    expect(getMissingRequiredRoleIds(position, pilotOnly)).toEqual([]);
    expect(getMissingRequiredRoleIds(position, new Set(["member"]))).toEqual([
      "pilot",
      "medic",
    ]);
  });

  it("needs each role with ALL", () => {
    const position = {
      requiredRoles,
      requiredRoleMatch: EventPositionRoleMatch.ALL,
    };

    expect(getMissingRequiredRoleIds(position, pilotOnly)).toEqual(["medic"]);
    expect(getMissingRequiredRoleIds(position, pilotAndMedic)).toEqual([]);
  });
});

import { describe, expect, test } from "vitest";
import { resolveEffectiveRoles } from "./index.js";

const role = (name: string, maxLevel: number | null = null) => ({
  name,
  maxLevel,
  inherits: [] as { name: string }[],
});

describe("resolve effective roles", () => {
  test("returns no roles for no assignments", () => {
    expect(resolveEffectiveRoles([])).toEqual([]);
  });

  test("includes a role without leveling regardless of the current level", () => {
    const member = role("member");

    expect(
      resolveEffectiveRoles([{ currentLevel: null, role: member }]),
    ).toEqual([member]);
  });

  test("includes a leveled role only once the max level is reached", () => {
    const pilot = role("pilot", 3);

    expect(resolveEffectiveRoles([{ currentLevel: 2, role: pilot }])).toEqual(
      [],
    );
    expect(resolveEffectiveRoles([{ currentLevel: 3, role: pilot }])).toEqual([
      pilot,
    ]);
    expect(resolveEffectiveRoles([{ currentLevel: 4, role: pilot }])).toEqual([
      pilot,
    ]);
  });

  test("treats a missing current level on a leveled role as level 0", () => {
    expect(
      resolveEffectiveRoles([{ currentLevel: null, role: role("pilot", 1) }]),
    ).toEqual([]);
  });

  test("includes the inherited roles of an effective role", () => {
    const inherited = { name: "recruit" };
    const officer = { ...role("officer"), inherits: [inherited] };

    expect(
      resolveEffectiveRoles([{ currentLevel: null, role: officer }]),
    ).toEqual([officer, inherited]);
  });

  test("withholds inherited roles while the max level is not reached", () => {
    const inherited = { name: "recruit" };
    const pilot = { ...role("pilot", 3), inherits: [inherited] };

    expect(resolveEffectiveRoles([{ currentLevel: 1, role: pilot }])).toEqual(
      [],
    );
  });

  test("resolves each assignment independently", () => {
    const member = role("member");
    const inherited = { name: "recruit" };
    const officer = { ...role("officer"), inherits: [inherited] };
    const pilot = role("pilot", 3);

    expect(
      resolveEffectiveRoles([
        { currentLevel: null, role: member },
        { currentLevel: 1, role: pilot },
        { currentLevel: null, role: officer },
      ]),
    ).toEqual([member, officer, inherited]);
  });
});

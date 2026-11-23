import { describe, expect, test } from "vitest";
import { CapabilityId, type RemoteControlProgramSwitches } from "./catalog.js";
import {
  findGrantValidityProblem,
  getEffectiveReadAccess,
  getGrantValidityOfPreset,
  GranteeKind,
  GrantOperation,
  GrantValidityPreset,
  GrantValidityProblem,
  ReadAccessBasis,
  ReadAccessRefusal,
  type ReadAccessInput,
  type ShareGrantSource,
} from "./grantAccess.js";

const NOW = new Date("2026-11-23T20:00:00.000Z");
const ONE_HOUR_AGO = new Date("2026-11-23T19:00:00.000Z");
const YESTERDAY = new Date("2026-11-22T20:00:00.000Z");
const IN_ONE_HOUR = new Date("2026-11-23T21:00:00.000Z");
const IN_TWO_HOURS = new Date("2026-11-23T22:00:00.000Z");

const SWITCHES_ON: RemoteControlProgramSwitches = {
  isProgramTurnedOff: false,
  turnedOffConnectorIds: [],
  turnedOffCapabilityIds: [],
};

const createGrant = (
  overrides: Partial<ShareGrantSource> = {},
): ShareGrantSource => ({
  id: "grant",
  ownerCitizenId: "owner",
  granteeKind: GranteeKind.Citizen,
  granteeCitizenId: "viewer",
  granteeRoleId: null,
  capabilityIds: [CapabilityId.LogEntries],
  operations: [GrantOperation.Read],
  startsAt: ONE_HOUR_AGO,
  endsAt: IN_ONE_HOUR,
  revokedAt: null,
  ...overrides,
});

const createInput = (
  overrides: Partial<ReadAccessInput> = {},
): ReadAccessInput => ({
  switches: SWITCHES_ON,
  viewer: {
    citizenId: "viewer",
    roleIds: new Set(["pilot"]),
    hasRemoteControlProgramUse: true,
    hasConsumerPermission: true,
  },
  ownerCitizenId: "owner",
  capabilityId: CapabilityId.LogEntries,
  grants: [createGrant()],
  now: NOW,
  ...overrides,
});

const viewer = createInput().viewer;

describe("getEffectiveReadAccess", () => {
  test("the owner sees all own entries without a grant", () => {
    expect(
      getEffectiveReadAccess(
        createInput({ ownerCitizenId: "viewer", grants: [] }),
      ),
    ).toEqual({
      isGranted: true,
      basis: ReadAccessBasis.Owner,
      visibleTimeRange: { start: null, end: null },
    });
  });

  test.each([
    [
      "the program is off",
      { switches: { ...SWITCHES_ON, isProgramTurnedOff: true } },
      ReadAccessRefusal.ProgramTurnedOff,
    ],
    [
      "the capability is off",
      {
        switches: {
          ...SWITCHES_ON,
          turnedOffCapabilityIds: [CapabilityId.LogEntries],
        },
      },
      ReadAccessRefusal.CapabilityTurnedOff,
    ],
    [
      "remoteControlProgram;use is missing",
      { viewer: { ...viewer, hasRemoteControlProgramUse: false } },
      ReadAccessRefusal.RemoteControlProgramPermissionMissing,
    ],
    [
      "the permission of the consumer is missing",
      { viewer: { ...viewer, hasConsumerPermission: false } },
      ReadAccessRefusal.ConsumerPermissionMissing,
    ],
  ])("refuses the owner too when %s", (_, overrides, refusal) => {
    expect(
      getEffectiveReadAccess(
        createInput({ ...overrides, ownerCitizenId: "viewer" }),
      ),
    ).toEqual({ isGranted: false, refusal });
  });

  test.each([
    ["a citizen grant", createGrant()],
    [
      "a role grant",
      createGrant({
        granteeKind: GranteeKind.Role,
        granteeCitizenId: null,
        granteeRoleId: "pilot",
      }),
    ],
    [
      "a grant to everyone",
      createGrant({
        granteeKind: GranteeKind.Everyone,
        granteeCitizenId: null,
      }),
    ],
  ])("%s shows the entries of its validity period", (_, grant) => {
    expect(getEffectiveReadAccess(createInput({ grants: [grant] }))).toEqual({
      isGranted: true,
      basis: ReadAccessBasis.Grant,
      visibleTimeRange: { start: ONE_HOUR_AGO, end: IN_ONE_HOUR },
    });
  });

  test.each([
    ["no grant", []],
    [
      "a grant to a different citizen",
      [createGrant({ granteeCitizenId: "x" })],
    ],
    [
      "a grant to a role of a different citizen",
      [
        createGrant({
          granteeKind: GranteeKind.Role,
          granteeCitizenId: null,
          granteeRoleId: "medic",
        }),
      ],
    ],
    [
      "a grant of a different owner",
      [createGrant({ ownerCitizenId: "other" })],
    ],
    ["a revoked grant", [createGrant({ revokedAt: ONE_HOUR_AGO })]],
    ["an expired grant", [createGrant({ startsAt: YESTERDAY, endsAt: NOW })]],
    ["a grant that starts later", [createGrant({ startsAt: IN_ONE_HOUR })]],
    ["a grant of a different capability", [createGrant({ capabilityIds: [] })]],
    ["a grant without read", [createGrant({ operations: ["request"] })]],
  ])("refuses the access with %s", (_, grants) => {
    expect(getEffectiveReadAccess(createInput({ grants }))).toEqual({
      isGranted: false,
      refusal: ReadAccessRefusal.NoValidGrant,
    });
  });

  test("more valid grants give one range from the earliest start to the latest end", () => {
    expect(
      getEffectiveReadAccess(
        createInput({
          grants: [
            createGrant({ startsAt: YESTERDAY, endsAt: IN_ONE_HOUR }),
            createGrant({
              granteeKind: GranteeKind.Everyone,
              granteeCitizenId: null,
              startsAt: ONE_HOUR_AGO,
              endsAt: null,
            }),
          ],
        }),
      ),
    ).toEqual({
      isGranted: true,
      basis: ReadAccessBasis.Grant,
      visibleTimeRange: { start: YESTERDAY, end: null },
    });
  });
});

describe("grant validity", () => {
  test("a preset starts now", () => {
    expect(getGrantValidityOfPreset(GrantValidityPreset.OneHour, NOW)).toEqual({
      startsAt: NOW,
      endsAt: IN_ONE_HOUR,
    });
    expect(getGrantValidityOfPreset(GrantValidityPreset.TwoHours, NOW)).toEqual(
      { startsAt: NOW, endsAt: IN_TWO_HOURS },
    );
    expect(getGrantValidityOfPreset(GrantValidityPreset.NoEnd, NOW)).toEqual({
      startsAt: NOW,
      endsAt: null,
    });
  });

  test.each([
    [{ startsAt: YESTERDAY, endsAt: IN_ONE_HOUR }, null],
    [{ startsAt: YESTERDAY, endsAt: null }, null],
    [{ startsAt: IN_ONE_HOUR, endsAt: IN_TWO_HOURS }, null],
    [
      { startsAt: IN_ONE_HOUR, endsAt: IN_ONE_HOUR },
      GrantValidityProblem.EndNotAfterStart,
    ],
    [{ startsAt: YESTERDAY, endsAt: NOW }, GrantValidityProblem.EndNotInFuture],
    [
      { startsAt: new Date(Number.NaN), endsAt: null },
      GrantValidityProblem.TimeNotValid,
    ],
  ])("checks the custom validity %o", (validity, problem) => {
    expect(findGrantValidityProblem(validity, NOW)).toBe(problem);
  });
});

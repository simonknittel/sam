import { describe, expect, test } from "vitest";
import {
  deriveEntryFields,
  EntryType,
  matchEntryLine,
  PATTERNS,
  SHAREABLE_ENTRY_TYPES,
} from "./PATTERNS";
import { SAMPLE_LINES } from "./sampleLines";

const groupsOf = (type: EntryType) => {
  const groups = matchEntryLine(type, SAMPLE_LINES[type])?.groups;
  if (!groups) throw new Error(`The ${type} sample does not match`);
  return groups;
};

describe("PATTERNS", () => {
  test.each(Object.values(EntryType))("matches the whole %s sample", (type) => {
    const match = matchEntryLine(type, SAMPLE_LINES[type]);

    expect(match?.index).toBe(0);
    expect(match?.[0]).toBe(SAMPLE_LINES[type]);
  });

  test.each(Object.values(EntryType))(
    "finds every %s sample once in a file",
    (type) => {
      const fileContent = `${Object.values(SAMPLE_LINES).join("\r\n")}\r\n`;

      const matches = Array.from(fileContent.matchAll(PATTERNS[type].regex));

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe(SAMPLE_LINES[type]);
    },
  );

  test("only the crash takes its time from the preceding line", () => {
    expect(SHAREABLE_ENTRY_TYPES).not.toContain(EntryType.GameCrash);
    expect(SHAREABLE_ENTRY_TYPES).toHaveLength(
      Object.values(EntryType).length - 1,
    );
  });

  test("reads the destroyed vehicle of a death", () => {
    expect(groupsOf(EntryType.OwnDeath)).toMatchObject({
      vehicle: "RSI_Zeus_CL_1",
      zone: "pyro4",
    });
  });

  test("reads the reason and the uptime of a disconnection", () => {
    expect(groupsOf(EntryType.Disconnection)).toMatchObject({
      reason: "Remote Disconnect - Player requested disconnect",
      uptimeSeconds: "3636.990234",
    });
  });

  test("reads the severity, the body part and the tier of an injury", () => {
    expect(groupsOf(EntryType.InjuryDetectedNotification)).toMatchObject({
      severity: "Minor",
      bodyPart: "Left arm",
      tier: "3",
    });
  });

  test("reads the treated body parts of a med bed line", () => {
    expect(groupsOf(EntryType.MedBedHeal)).toMatchObject({
      result: "Success",
      vehicle: "none",
      head: "true",
      torso: "false",
      leftArm: "true",
    });
  });

  test("reads the item, the quantity, the price and the shop of a purchase", () => {
    expect(groupsOf(EntryType.ShopPurchase)).toMatchObject({
      shop: "SCShop_Orison_KelTo",
      price: "18117.000000",
      item: "behr_smg_ballistic_01_mag",
      quantity: "61",
    });
  });

  test("reads the handle from the second line of a party notification", () => {
    expect(groupsOf(EntryType.PartyInviteReceivedNotification).handle).toBe(
      "Testinviter",
    );
    expect(groupsOf(EntryType.PartyMemberJoinedNotification).handle).toBe(
      "Testmember",
    );
    expect(groupsOf(EntryType.PartyMemberLeftNotification).handle).toBe(
      "Testmember",
    );
    expect(groupsOf(EntryType.PartyLeaderChangedNotification).handle).toBe(
      "Testleader",
    );
  });

  test("reads the instance of an instance entry", () => {
    expect(groupsOf(EntryType.InstanceEntered)).toMatchObject({
      instance: "StreamingSOC_inst_dogleg_ht_a_siege_a",
      instanceId: "788400312747",
    });
  });

  test("reads the exception of a crash", () => {
    expect(groupsOf(EntryType.GameCrash).exception).toBe(
      "STATUS_CRYENGINE_OUT_OF_SYSMEM",
    );
  });

  test("gives the repeats of a zone notification the same collapse key", () => {
    const { collapseKey } = deriveEntryFields(
      EntryType.ArmisticeZoneNotification,
      groupsOf(EntryType.ArmisticeZoneNotification),
    );

    expect(collapseKey).toBe("Entering");
    expect(
      deriveEntryFields(EntryType.JoinPu, groupsOf(EntryType.JoinPu))
        .collapseKey,
    ).toBeNull();
  });
});

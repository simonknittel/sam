import {
  getNewerLogAnalyzerEntryVersions,
  getOldestLogAnalyzerEntryVersion,
  LOG_ANALYZER_ENTRY_PATTERNS,
  LogAnalyzerEntryType,
  matchLogAnalyzerEntryLine,
  takesTimeOfPrecedingLine,
} from "@sam-monorepo/domain";
import { describe, expect, test } from "vitest";
import { deriveEntryFields } from "./PATTERNS";
import { SAMPLE_LINES } from "./sampleLines";

const groupsOf = (type: LogAnalyzerEntryType) => {
  const groups = matchLogAnalyzerEntryLine(type, SAMPLE_LINES[type])?.groups;
  if (!groups) throw new Error(`The ${type} sample does not match`);
  return groups;
};

describe("PATTERNS", () => {
  test.each(Object.values(LogAnalyzerEntryType))(
    "matches the whole %s sample",
    (type) => {
      const match = matchLogAnalyzerEntryLine(type, SAMPLE_LINES[type]);

      expect(match?.index).toBe(0);
      expect(match?.[0]).toBe(SAMPLE_LINES[type]);
    },
  );

  test.each(Object.values(LogAnalyzerEntryType))(
    "the first line of every %s sample holds its marker",
    (type) => {
      const [firstLine] = SAMPLE_LINES[type].split("\n");

      expect(firstLine).toContain(LOG_ANALYZER_ENTRY_PATTERNS[type].marker);
    },
  );

  test.each(Object.values(LogAnalyzerEntryType))(
    "finds every %s sample once in a file",
    (type) => {
      /**
       * The other versions of the type can match the same lines (see
       * `LogAnalyzerEntryPattern.supersedes`), thus their samples stay out.
       */
      const sampleTypes = Object.values(LogAnalyzerEntryType).filter(
        (sampleType) =>
          sampleType === type ||
          getOldestLogAnalyzerEntryVersion(sampleType) !==
            getOldestLogAnalyzerEntryVersion(type),
      );
      const fileContent = `${sampleTypes.map((sampleType) => SAMPLE_LINES[sampleType]).join("\r\n")}\r\n`;

      const matches = Array.from(
        fileContent.matchAll(LOG_ANALYZER_ENTRY_PATTERNS[type].regex),
      );

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe(SAMPLE_LINES[type]);
    },
  );

  /**
   * Else a shared entry of the older version cannot move to the newer
   * version (see `LogAnalyzerEntryPattern.supersedes`).
   */
  test.each(
    Object.values(LogAnalyzerEntryType).flatMap((type) =>
      getNewerLogAnalyzerEntryVersions(type).map((version) => ({
        type,
        version,
      })),
    ),
  )("$version matches the whole $type sample", ({ type, version }) => {
    const match = matchLogAnalyzerEntryLine(version, SAMPLE_LINES[type]);

    expect(match?.[0]).toBe(SAMPLE_LINES[type]);
  });

  test("only the crash takes its time from the preceding line", () => {
    expect(
      Object.values(LogAnalyzerEntryType).filter(takesTimeOfPrecedingLine),
    ).toEqual([LogAnalyzerEntryType.GameCrash]);
  });

  test("reads the destroyed vehicle of a death", () => {
    expect(groupsOf(LogAnalyzerEntryType.OwnDeath)).toMatchObject({
      vehicle: "RSI_Zeus_CL_1",
      zone: "pyro4",
    });
  });

  test("reads the reason and the uptime of a disconnection", () => {
    expect(groupsOf(LogAnalyzerEntryType.Disconnection)).toMatchObject({
      reason: "Remote Disconnect - Player requested disconnect",
      uptimeSeconds: "3636.990234",
    });
  });

  test("a ship from a kiosk is a purchase", () => {
    const shipPurchase = SAMPLE_LINES[
      LogAnalyzerEntryType.ShopPurchase
    ].replace(
      "CEntityComponentShopUIProvider::SendShopBuyRequest",
      "CEntityComponentShoppingProvider::SendStandardItemBuyRequest",
    );

    expect(
      matchLogAnalyzerEntryLine(
        LogAnalyzerEntryType.ShopPurchase,
        shipPurchase,
      ),
    ).not.toBeNull();
  });

  test.each([
    {
      items: 'S-38 "SecondWind" Pistol',
      lineEnd: ': " [48] to queue.',
    },
    {
      items: "Perseus Alliance Aid Camo, ParaMed AA Support Device",
      lineEnd: "",
    },
  ])("reads the items of a reward: $items", ({ items, lineEnd }) => {
    const line = `<2026-09-17T15:43:21.192Z> [Notice] <SHUDEvent_OnNotification> Added notification "Orison Relief Rewards - Tier 1\r\n<2026-09-17T15:43:21.192Z> You have been awarded: ${items}${lineEnd}`;

    const match = matchLogAnalyzerEntryLine(
      LogAnalyzerEntryType.RewardNotification,
      line,
    );

    expect(match?.groups?.items).toBe(items);
  });

  test("reads a reward with quotes in its name", () => {
    expect(groupsOf(LogAnalyzerEntryType.EarnedNotificationV2).reward).toBe(
      `Falston Jumpsuit "People's Alliance Edition"`,
    );
  });

  test("an accepted contract gives the mission id of its abandon line", () => {
    const accepted = groupsOf(
      LogAnalyzerEntryType.ContractAcceptedNotification,
    );
    const abandoned = groupsOf(LogAnalyzerEntryType.ContractAbandoned);

    expect(accepted.missionId).toBe(abandoned.missionId);
  });

  test("a group is no party", () => {
    const groupLine = SAMPLE_LINES[
      LogAnalyzerEntryType.PartyJoinedNotification
    ].replace("party: ", "group 'Testgroup': ");

    expect(
      matchLogAnalyzerEntryLine(
        LogAnalyzerEntryType.PartyJoinedNotification,
        groupLine,
      ),
    ).toBeNull();
  });

  test("reads the severity, the body part and the tier of an injury", () => {
    expect(
      groupsOf(LogAnalyzerEntryType.InjuryDetectedNotification),
    ).toMatchObject({
      severity: "Minor",
      bodyPart: "Left arm",
      tier: "3",
    });
  });

  test("reads the treated body parts of a med bed line", () => {
    expect(groupsOf(LogAnalyzerEntryType.MedBedHeal)).toMatchObject({
      result: "Success",
      vehicle: "none",
      head: "true",
      torso: "false",
      leftArm: "true",
    });
  });

  test("reads the item, the quantity, the price and the shop of a purchase", () => {
    expect(groupsOf(LogAnalyzerEntryType.ShopPurchase)).toMatchObject({
      shop: "SCShop_Orison_KelTo",
      price: "18117.000000",
      item: "behr_smg_ballistic_01_mag",
      quantity: "61",
    });
  });

  test("reads the handle from the second line of a party notification", () => {
    expect(
      groupsOf(LogAnalyzerEntryType.PartyInviteReceivedNotification).handle,
    ).toBe("Testinviter");
    expect(
      groupsOf(LogAnalyzerEntryType.PartyMemberJoinedNotification).handle,
    ).toBe("Testmember");
    expect(
      groupsOf(LogAnalyzerEntryType.PartyMemberLeftNotification).handle,
    ).toBe("Testmember");
    expect(
      groupsOf(LogAnalyzerEntryType.PartyLeaderChangedNotification).handle,
    ).toBe("Testleader");
  });

  test("reads the instance of an instance entry", () => {
    expect(groupsOf(LogAnalyzerEntryType.InstanceEntered)).toMatchObject({
      instance: "StreamingSOC_inst_dogleg_ht_a_siege_a",
      instanceId: "788400312747",
    });
  });

  test("reads the exception of a crash", () => {
    expect(groupsOf(LogAnalyzerEntryType.GameCrash).exception).toBe(
      "STATUS_CRYENGINE_OUT_OF_SYSMEM",
    );
  });

  test("gives the repeats of a zone notification the same collapse key", () => {
    const { collapseKey } = deriveEntryFields(
      LogAnalyzerEntryType.ArmisticeZoneNotification,
      groupsOf(LogAnalyzerEntryType.ArmisticeZoneNotification),
    );

    expect(collapseKey).toBe("Entering");
    expect(
      deriveEntryFields(
        LogAnalyzerEntryType.JoinPu,
        groupsOf(LogAnalyzerEntryType.JoinPu),
      ).collapseKey,
    ).toBeNull();
  });
});

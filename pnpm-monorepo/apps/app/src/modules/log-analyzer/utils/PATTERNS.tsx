import type { Entity } from "@sam-monorepo/database/browser";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import {
  FaArrowRightFromBracket,
  FaArrowRightToBracket,
  FaBedPulse,
  FaBomb,
  FaCartShopping,
  FaCompassDrafting,
  FaCrown,
  FaEnvelope,
  FaFileCircleCheck,
  FaFileCircleMinus,
  FaFileCircleXmark,
  FaFileSignature,
  FaGavel,
  FaHouseLock,
  FaPeace,
  FaPlugCircleXmark,
  FaPowerOff,
  FaRightToBracket,
  FaSatelliteDish,
  FaShareFromSquare,
  FaSkull,
  FaUserInjured,
  FaUserMinus,
  FaUserPlus,
} from "react-icons/fa6";
import { TruncatedText } from "../components/TruncatedText";

/**
 * A new log pattern needs a value here and an entry in `PATTERNS` below.
 * Nothing else: the database keeps the value of this enum verbatim, thus a
 * new type needs no migration.
 */
export enum EntryType {
  JoinPu = "joinPu",
  OwnDeath = "ownDeath",
  BlueprintReceivedNotification = "blueprintReceivedNotification",
  ContractAcceptedNotification = "contractAcceptedNotification",
  ContractCompleteNotification = "contractCompleteNotification",
  ContractFailedNotification = "contractFailedNotification",
  ContractSharedNotification = "contractSharedNotification",
  ContractWithdrawnNotification = "contractWithdrawnNotification",
  Disconnection = "disconnection",
  InjuryDetectedNotification = "injuryDetectedNotification",
  MedBedHeal = "medBedHeal",
  ShopPurchase = "shopPurchase",
  ArmisticeZoneNotification = "armisticeZoneNotification",
  JurisdictionNotification = "jurisdictionNotification",
  MonitoredSpaceNotification = "monitoredSpaceNotification",
  PrivatePropertyNotification = "privatePropertyNotification",
  PartyInviteReceivedNotification = "partyInviteReceivedNotification",
  PartyMemberJoinedNotification = "partyMemberJoinedNotification",
  PartyMemberLeftNotification = "partyMemberLeftNotification",
  PartyLeaderChangedNotification = "partyLeaderChangedNotification",
  InstanceEntered = "instanceEntered",
  InstanceExited = "instanceExited",
  GameQuit = "gameQuit",
  GameCrash = "gameCrash",
}

/** The groups of the entry types, in the order the lists show them. */
export enum EntryCategory {
  Session = "session",
  Contracts = "contracts",
  Character = "character",
  Zones = "zones",
  Party = "party",
  Commerce = "commerce",
}

export const ENTRY_CATEGORY_TITLES: Record<EntryCategory, string> = {
  [EntryCategory.Session]: "Session",
  [EntryCategory.Contracts]: "Contracts",
  [EntryCategory.Character]: "Charakter",
  [EntryCategory.Zones]: "Zonen",
  [EntryCategory.Party]: "Party",
  [EntryCategory.Commerce]: "Handel",
};

export interface IEntry {
  readonly key: string;
  readonly type: EntryType;
  readonly isoDate: Date;
  readonly isNew?: boolean;
  readonly message: ReactNode;
  /** See `Pattern.collapseKey`. Null when the type has no such key. */
  readonly collapseKey: string | null;
  /**
   * The citizen the entry belongs to: the citizen who shared it, or the
   * current user for a local one. Null when the user has no linked citizen.
   */
  readonly citizen: Pick<Entity, "id" | "handle"> | null;
  /** True when another citizen shared the entry instead of the local parser. */
  readonly isShared: boolean;
  /**
   * True once the entry reached the server, whether this visit shared it or
   * an earlier one did. The upload learns the difference from the hashes the
   * server already holds.
   */
  readonly isUploaded: boolean;
}

const shardRegex = /^pub_(?<region>[a-z0-9]+)_\w+_(?<number>\d+)$/m;

/** The game wraps parts of a notification text in markup such as `<EM4>` */
const stripMarkup = (text: string) => text.replaceAll(/<.+?>/g, "").trim();

/**
 * The class of an entity without the numeric id the game appends to its
 * name, for example `RSI Zeus CL` for `RSI_Zeus_CL_261902385141`.
 */
const toEntityClass = (entityName: string) =>
  entityName.replace(/_\d+$/, "").replaceAll("_", " ");

const DIRECTION_LABELS: Record<string, string> = {
  Entering: "Betreten",
  Entered: "Betreten",
  Leaving: "Verlassen",
  Exited: "Verlassen",
};

const renderDirection = (groups: Record<string, string>) => (
  <TruncatedText>
    {DIRECTION_LABELS[groups.direction] ?? groups.direction}
  </TruncatedText>
);

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

const formatDuration = (seconds: number) => {
  const totalMinutes = Math.round(seconds / SECONDS_PER_MINUTE);
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
};

const DISCONNECTION_REASON_LABELS: Record<string, string> = {
  "Remote Disconnect - Player requested disconnect": "Vom Spieler getrennt",
  "DisconnectCmd: disconnect light ExitToMenu": "Zurück zum Hauptmenü",
  "Remote Disconnect - player inactive": "Inaktivität",
};

/** The body parts of a med bed line, in the order the game lists them */
const BODY_PART_LABELS: Record<string, string> = {
  head: "Kopf",
  torso: "Torso",
  leftArm: "Linker Arm",
  rightArm: "Rechter Arm",
  leftLeg: "Linkes Bein",
  rightLeg: "Rechtes Bein",
};

const CRASH_EXCEPTION_LABELS: Record<string, string> = {
  STATUS_CRYENGINE_OUT_OF_SYSMEM: "Arbeitsspeicher voll",
  STATUS_CRYENGINE_GPU_CRASH: "GPU-Absturz",
  STATUS_CRYENGINE_WATCH_DOG: "Watchdog-Timeout",
};

const priceFormat = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 0,
});

interface Pattern {
  title: string;
  icon: IconType;
  category: EntryCategory;
  /**
   * The expression scans whole log files, thus it carries the global and the
   * multiline flag. It has an `isoDate` group, which gives the time of the
   * event, unless `takesTimeOfPrecedingLine` is set.
   */
  regex: RegExp;
  /**
   * The game writes some blocks without a timestamp, for example the crash
   * report. The parser then takes the time of the last timestamped line
   * before the match. Such an entry cannot be shared: the server reads the
   * time of a shared entry from its raw line.
   */
  takesTimeOfPrecedingLine?: true;
  /**
   * The sharing setting of the type when the user has not set it. Off for
   * the types whose entries carry the handles of other players.
   */
  isSharedByDefault?: false;
  renderMessage?: (groups: Record<string, string>) => ReactNode;
  /**
   * The game repeats some lines: every zone notification on a shard change,
   * and the instance entry while the instance streams in and out. Entries of
   * one type and one citizen which follow each other with the same key show
   * as one entry.
   */
  collapseKey?: (groups: Record<string, string>) => string;
}

export const PATTERNS: Record<EntryType, Pattern> = {
  joinPu: {
    title: "Shard-Beitritt",
    icon: FaRightToBracket,
    category: EntryCategory.Session,
    // <2025-06-22T09:59:12.293Z> [Notice] <Join PU> address[35.187.166.216] port[64336] shard[pub_euw1b_9873572_100] locationId[-281470681677823] [Team_GameServices][GIM][Matchmaking]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.+<Join PU>.+shard\[(?<shard>[\d\w_]+)\].+$/gm,
    renderMessage: (groups) => {
      const match = shardRegex.exec(groups.shard);
      if (!match?.groups) return <TruncatedText>{groups.shard}</TruncatedText>;

      let region = match.groups.region;
      if (region.startsWith("eu")) region = "EU";
      if (region.startsWith("us")) region = "USA";
      if (region.startsWith("ape")) region = "ASIA";
      if (region.startsWith("apse")) region = "AUS";

      let number = match.groups.number;
      number = number.replace(/^0+/, "");

      return (
        <span
          className="truncate"
          title={`${region} ${number} (${groups.shard})`}
        >
          {region} {number}{" "}
          <span className="text-white/40">({groups.shard})</span>
        </span>
      );
    },
  },

  ownDeath: {
    title: "Gestorben",
    icon: FaSkull,
    category: EntryCategory.Character,
    /**
     * The game writes this line only for a death inside a vehicle which was
     * destroyed with a detached interior. A death on foot leaves no line.
     */
    // <2025-11-30T13:13:55.134Z> [Notice] <[ActorState] Dead> [ACTOR STATE][CSCActorControlStateDead::PrePhysicsUpdate] Actor '...' [...] ejected from zone 'RSI_Zeus_CL_...' [...] to zone 'pyro4' [7610665712799] due to previous zone being in a destroyed vehicle with detached interior. [Team_ActorFeatures][Actor]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<\[ActorState\] Dead\>.*ejected from zone '(?<vehicle>[^']+)' \[\d+\] to zone '(?<zone>[^']+)'.*$/gm,
    renderMessage: (groups) => (
      <TruncatedText>{toEntityClass(groups.vehicle)}</TruncatedText>
    ),
  },

  blueprintReceivedNotification: {
    title: "Blueprint erhalten",
    icon: FaCompassDrafting,
    category: EntryCategory.Contracts,
    // <2026-05-14T14:45:40.207Z> [Notice] <SHUDEvent_OnNotification> Added notification "Received Blueprint: Morozov-SH Helmet Thule: " [25] to queue. New queue size: 3, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    // <2026-05-25T17:28:05.820Z> [Notice] <SHUDEvent_OnNotification> Added notification "<EM4>Received Blueprint: Arbor MH1 Mining Laser [BP]</EM4>: " [15] to queue. New queue size: 2, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<SHUDEvent_OnNotification\> Added notification ".*Received Blueprint: (?<blueprint>.+): ".*$/gm,
    renderMessage: (groups) => (
      <TruncatedText>{stripMarkup(groups.blueprint)}</TruncatedText>
    ),
  },

  contractAcceptedNotification: {
    title: "Contract angenommen",
    icon: FaFileSignature,
    category: EntryCategory.Contracts,
    // <2026-05-25T07:45:33.982Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Accepted:  Wikelo Arrive to System: " [4] to queue. New queue size: 1, MissionId: [bf7d2465-cf1e-480b-ae5c-25040d716e5f], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<SHUDEvent_OnNotification\> Added notification ".*Contract Accepted: (?<contract>.+): ".*$/gm,
    renderMessage: (groups) => (
      <TruncatedText>{stripMarkup(groups.contract)}</TruncatedText>
    ),
  },

  contractCompleteNotification: {
    title: "Contract abgeschlossen",
    icon: FaFileCircleCheck,
    category: EntryCategory.Contracts,
    // <2026-06-01T10:15:20.123Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Complete:  Wikelo Arrive to System: " [5] to queue. New queue size: 2, MissionId: [bf7d2465-cf1e-480b-ae5c-25040d716e5f], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<SHUDEvent_OnNotification\> Added notification ".*Contract Complete: (?<contract>.+): ".*$/gm,
    renderMessage: (groups) => (
      <TruncatedText>{stripMarkup(groups.contract)}</TruncatedText>
    ),
  },

  contractFailedNotification: {
    title: "Contract fehlgeschlagen",
    icon: FaFileCircleXmark,
    category: EntryCategory.Contracts,
    // <2026-05-25T18:03:03.012Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Failed: CRITICAL REFUEL REQUEST: Crusader Ares Star Fighter Ion <EM4>[200 Rep] [BP]*</EM4>: " [189] to queue. New queue size: 2, MissionId: [c54aa278-06e1-4c83-86d2-9e795f7691f3], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<SHUDEvent_OnNotification\> Added notification ".*Contract Failed: (?<contract>.+): ".*$/gm,
    renderMessage: (groups) => (
      <TruncatedText>{stripMarkup(groups.contract)}</TruncatedText>
    ),
  },

  contractSharedNotification: {
    title: "Contract geteilt",
    icon: FaShareFromSquare,
    category: EntryCategory.Contracts,
    // <2026-05-21T18:32:20.325Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Shared: Tactical Strike Group Needed <EM4>[300 Rep] [BP]</EM4>: " [109] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<SHUDEvent_OnNotification\> Added notification ".*Contract Shared: (?<contract>.+): ".*$/gm,
    renderMessage: (groups) => (
      <TruncatedText>{stripMarkup(groups.contract)}</TruncatedText>
    ),
  },

  contractWithdrawnNotification: {
    title: "Contract zurückgezogen",
    icon: FaFileCircleMinus,
    category: EntryCategory.Contracts,
    // <2026-05-21T19:02:11.481Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Withdrawn:  A Call to Arms: " [231] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<SHUDEvent_OnNotification\> Added notification ".*Contract Withdrawn: (?<contract>.+): ".*$/gm,
    renderMessage: (groups) => (
      <TruncatedText>{stripMarkup(groups.contract)}</TruncatedText>
    ),
  },

  disconnection: {
    title: "Verbindung getrennt",
    icon: FaPlugCircleXmark,
    category: EntryCategory.Session,
    /**
     * The other reason the game writes is "Nub destroyed", an internal
     * teardown on every server change, which is no event of the player.
     */
    // <2026-05-25T08:40:17.864Z> [Notice] <Channel Disconnected> cause=30016 reason="Remote Disconnect - Player requested disconnect" frame=220001 isRemote=1 map="megamap" gamerules="SC_Default" hostType="Replicant" remoteAddr=... localAddr=0.0.0.0:64090 connection={4, 0} session=... node_id=bc4da5d3-3f05-e19e-4aa0-702432234095 nickname="..." playerGEID=... uptime_secs=3636.990234 [Team_Network][Network][Gateway][Disconnection]
    // <2026-08-27T12:22:18.548Z> [Notice] <Channel Disconnected> cause=30016 reason="DisconnectCmd: disconnect light ExitToMenu" frame=514507 isRemote=0 viewState=eCVS_InGame map="megamap" gamerules="SC_Default" hostType="Replicant" remoteAddr=... localAddr=0.0.0.0:64090 connection={3, 0} session=... node_id=f948a738-a221-5666-983e-234f5e500ebd nickname="..." playerGEID=... uptime_secs=9010.198242 [Team_Network][Network][Gateway][Disconnection]
    // <2026-05-21T08:14:17.230Z> [Notice] <Channel Disconnected> cause=30028 reason="Remote Disconnect - player inactive" frame=544285 isRemote=1 map="megamap" gamerules="SC_Default" hostType="Replicant" remoteAddr=... localAddr=0.0.0.0:64090 connection={3, 0} session=... node_id=cc47831e-36ce-e906-8355-3bba619e5182 nickname="..." playerGEID=... uptime_secs=6326.005371 [Team_Network][Network][Gateway][Disconnection]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)> \[Notice\] \<Channel Disconnected\> cause=\d+ reason="(?<reason>Remote Disconnect - Player requested disconnect|DisconnectCmd: disconnect light ExitToMenu|Remote Disconnect - player inactive)".*uptime_secs=(?<uptimeSeconds>[\d.]+).*$/gm,
    renderMessage: (groups) => (
      <TruncatedText>
        {`${DISCONNECTION_REASON_LABELS[groups.reason] ?? groups.reason} nach ${formatDuration(Number(groups.uptimeSeconds))}`}
      </TruncatedText>
    ),
  },

  injuryDetectedNotification: {
    title: "Verletzung",
    icon: FaUserInjured,
    category: EntryCategory.Character,
    // <2026-08-27T10:22:35.005Z> [Notice] <SHUDEvent_OnNotification> Added notification "Minor Injury Detected - Left arm - Tier 3 Treatment Required : " [20] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<SHUDEvent_OnNotification\> Added notification "(?<severity>\w+) Injury Detected - (?<bodyPart>[^-]+) - Tier (?<tier>\d+) Treatment Required ?: ".*$/gm,
    renderMessage: (groups) => (
      <TruncatedText>
        {`${groups.severity}: ${groups.bodyPart} (Tier ${groups.tier})`}
      </TruncatedText>
    ),
  },

  medBedHeal: {
    title: "Behandlung",
    icon: FaBedPulse,
    category: EntryCategory.Character,
    // <2026-08-27T11:08:44.651Z> [Notice] <MED BED HEAL> Actor: ... (Non-Authoritative CLIENT: ...) | [CEntityComponentMedBed::HandleComponentEvent:1101] | -> Perform surgery event Success, med bed name: Bed_Single_Medical_Instance_Hospital_SOO003, vehicle name: none, head: true torso: false leftArm: true rightArm: false leftLeg: false rightLeg: false [Team_ActorFeatures][Actor]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<MED BED HEAL\>.*-> Perform surgery event (?<result>\w+), med bed name: (?<medBed>[^,]+), vehicle name: (?<vehicle>[^,]+), head: (?<head>\w+) torso: (?<torso>\w+) leftArm: (?<leftArm>\w+) rightArm: (?<rightArm>\w+) leftLeg: (?<leftLeg>\w+) rightLeg: (?<rightLeg>\w+).*$/gm,
    renderMessage: (groups) => {
      const treatedBodyParts = Object.entries(BODY_PART_LABELS)
        .filter(([group]) => groups[group] === "true")
        .map(([, label]) => label);
      /** A bed of a station has no vehicle name */
      const vehicle =
        groups.vehicle === "none" ? "" : ` (${toEntityClass(groups.vehicle)})`;

      return (
        <TruncatedText>{`${treatedBodyParts.join(", ")}${vehicle}`}</TruncatedText>
      );
    },
  },

  shopPurchase: {
    title: "Einkauf",
    icon: FaCartShopping,
    category: EntryCategory.Commerce,
    /**
     * The line is the request of the client. The answer of the server,
     * `<CEntityComponentShopUIProvider::RmShopFlowResponse>`, names neither
     * the item nor the price, thus the request is the entry.
     */
    // <2026-08-26T19:26:18.919Z> [Notice] <CEntityComponentShopUIProvider::SendShopBuyRequest> Sending SShopBuyRequest - playerId[...] shopId[783648035105] shopName[SCShop_Orison_KelTo] kioskId[783648035110] client_price[18117.000000] itemClassGUID[90adb28a-049e-4357-8000-a4bb75bb7f6f] itemName[behr_smg_ballistic_01_mag] quantity[61]  [Team_CoreGameplayFeatures][Shops][UI]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<CEntityComponentShopUIProvider::SendShopBuyRequest\>.*shopName\[(?<shop>[^\]]+)\].*client_price\[(?<price>[\d.]+)\].*itemName\[(?<item>[^\]]+)\] quantity\[(?<quantity>\d+)\].*$/gm,
    renderMessage: (groups) => (
      <TruncatedText>
        {`${groups.quantity}× ${groups.item} für ${priceFormat.format(Number(groups.price))} aUEC (${groups.shop.replace(/^SCShop_/, "")})`}
      </TruncatedText>
    ),
  },

  armisticeZoneNotification: {
    title: "Armistice Zone",
    icon: FaPeace,
    category: EntryCategory.Zones,
    // <2026-08-26T18:59:25.029Z> [Notice] <SHUDEvent_OnNotification> Added notification "Entering Armistice Zone - Combat Prohibited: " [3] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    // <2026-08-26T19:34:51.380Z> [Notice] <SHUDEvent_OnNotification> Added notification "Leaving Armistice Zone - Caution Advised: " [6] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<SHUDEvent_OnNotification\> Added notification "(?<direction>Entering|Leaving) Armistice Zone[^"]*".*$/gm,
    renderMessage: renderDirection,
    collapseKey: (groups) => groups.direction,
  },

  jurisdictionNotification: {
    title: "Jurisdiktion",
    icon: FaGavel,
    category: EntryCategory.Zones,
    /** The game writes no line for leaving a jurisdiction */
    // <2026-08-26T18:50:32.801Z> [Notice] <SHUDEvent_OnNotification> Added notification "Entered Crusader Industries Jurisdiction: " [1] to queue. New queue size: 2, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<SHUDEvent_OnNotification\> Added notification "Entered (?<jurisdiction>.+) Jurisdiction: ".*$/gm,
    renderMessage: (groups) => (
      <TruncatedText>{groups.jurisdiction}</TruncatedText>
    ),
    collapseKey: (groups) => groups.jurisdiction,
  },

  monitoredSpaceNotification: {
    title: "Monitored Space",
    icon: FaSatelliteDish,
    category: EntryCategory.Zones,
    // <2026-08-27T10:07:25.302Z> [Notice] <SHUDEvent_OnNotification> Added notification "Exited Monitored Space: " [15] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<SHUDEvent_OnNotification\> Added notification "(?<direction>Entered|Exited) Monitored Space: ".*$/gm,
    renderMessage: renderDirection,
    collapseKey: (groups) => groups.direction,
  },

  privatePropertyNotification: {
    title: "Private Property",
    icon: FaHouseLock,
    category: EntryCategory.Zones,
    // <2026-08-26T19:06:02.117Z> [Notice] <SHUDEvent_OnNotification> Added notification "Entering Private Property: " [4] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<SHUDEvent_OnNotification\> Added notification "(?<direction>Entering|Leaving) Private Property: ".*$/gm,
    renderMessage: renderDirection,
    collapseKey: (groups) => groups.direction,
  },

  /**
   * The party notifications span two log lines: the headline of the
   * notification, then its text with the handle. The game writes the files
   * with CRLF line ends. The handle belongs to another player, thus the
   * user must turn the sharing of these types on.
   */
  partyInviteReceivedNotification: {
    title: "Party-Einladung",
    icon: FaEnvelope,
    category: EntryCategory.Party,
    // <2026-08-26T18:50:40.373Z> [Notice] <SHUDEvent_OnNotification> Added notification "SomeHandle
    // <2026-08-26T18:50:40.373Z> Party Invite Received: Accept Invitation?: " [2] to queue. New queue size: 2, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<SHUDEvent_OnNotification\> Added notification "(?<handle>[^"\r\n]+)\r?\n<[\d\-T:.Z]+> Party Invite Received: Accept Invitation\?: ".*$/gm,
    isSharedByDefault: false,
    renderMessage: (groups) => <TruncatedText>{groups.handle}</TruncatedText>,
  },

  partyMemberJoinedNotification: {
    title: "Party-Mitglied beigetreten",
    icon: FaUserPlus,
    category: EntryCategory.Party,
    // <2026-05-25T16:49:39.043Z> [Notice] <SHUDEvent_OnNotification> Added notification "New Member Joined
    // <2026-05-25T16:49:39.043Z> SomeHandle has joined the party.: " [4] to queue. New queue size: 2, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<SHUDEvent_OnNotification\> Added notification "New Member Joined\r?\n<[\d\-T:.Z]+> (?<handle>.+?) has joined the party\.: ".*$/gm,
    isSharedByDefault: false,
    renderMessage: (groups) => <TruncatedText>{groups.handle}</TruncatedText>,
  },

  partyMemberLeftNotification: {
    title: "Party-Mitglied gegangen",
    icon: FaUserMinus,
    category: EntryCategory.Party,
    // <2026-05-25T18:36:38.835Z> [Notice] <SHUDEvent_OnNotification> Added notification "Member Left
    // <2026-05-25T18:36:38.835Z> SomeHandle has left the party.: " [285] to queue. New queue size: 3, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<SHUDEvent_OnNotification\> Added notification "Member Left\r?\n<[\d\-T:.Z]+> (?<handle>.+?) has left the party\.: ".*$/gm,
    isSharedByDefault: false,
    renderMessage: (groups) => <TruncatedText>{groups.handle}</TruncatedText>,
  },

  partyLeaderChangedNotification: {
    title: "Party-Leader",
    icon: FaCrown,
    category: EntryCategory.Party,
    // <2026-05-25T18:39:22.607Z> [Notice] <SHUDEvent_OnNotification> Added notification "New Party Leader
    // <2026-05-25T18:39:22.607Z> SomeHandle is now party leader.: " [311] to queue. New queue size: 10, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<SHUDEvent_OnNotification\> Added notification "New Party Leader\r?\n<[\d\-T:.Z]+> (?<handle>.+?) is now party leader\.: ".*$/gm,
    isSharedByDefault: false,
    renderMessage: (groups) => <TruncatedText>{groups.handle}</TruncatedText>,
  },

  instanceEntered: {
    title: "Instanz betreten",
    icon: FaArrowRightToBracket,
    category: EntryCategory.Zones,
    // <2026-08-27T10:05:56.047Z> [Notice] <[Instancing] Player entered instance> [Instancing][CEntityComponentBrokeredInstance::OnPlayerEnterInstance] Player SomeHandle[...] entered instance StreamingSOC_inst_dogleg_ht_a_siege_a[788400312747], which is NOT authoritative [Team_CGP5][Code][Instancing]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<\[Instancing\] Player entered instance\> .*Player (?<handle>.+?)\[\d+\] entered instance (?<instance>[^\[]+)\[(?<instanceId>\d+)\].*$/gm,
    renderMessage: (groups) => (
      <TruncatedText>
        {groups.instance.replace(/^StreamingSOC_/, "")}
      </TruncatedText>
    ),
    collapseKey: (groups) => groups.instanceId,
  },

  instanceExited: {
    title: "Instanz verlassen",
    icon: FaArrowRightFromBracket,
    category: EntryCategory.Zones,
    // <2026-08-27T10:08:16.735Z> [Notice] <[Instancing] Player exited instance> [Instancing][CEntityComponentBrokeredInstance::OnPlayerExitInstance] Player SomeHandle[...] left instance StreamingSOC_inst_dogleg_ht_a_siege_a[788400312747], which is NOT authoritative [Team_CGP5][Code][Instancing]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<\[Instancing\] Player exited instance\> .*Player (?<handle>.+?)\[\d+\] left instance (?<instance>[^\[]+)\[(?<instanceId>\d+)\].*$/gm,
    renderMessage: (groups) => (
      <TruncatedText>
        {groups.instance.replace(/^StreamingSOC_/, "")}
      </TruncatedText>
    ),
    collapseKey: (groups) => groups.instanceId,
  },

  gameQuit: {
    title: "Spiel beendet",
    icon: FaPowerOff,
    category: EntryCategory.Session,
    /** A session which crashed has no such line, see `gameCrash` */
    // <2026-08-27T12:22:53.922Z> [Notice] <SystemQuit> CSystem::Quit invoked with - cause=30016, reason=Quit via console command, exitCode=0, thread id=2188, main thread id=2188 [Team_Unknown][System]
    regex: /^<(?<isoDate>[\d\-T:.Z]+)> \[Notice\] \<SystemQuit\>.*$/gm,
  },

  gameCrash: {
    title: "Spiel abgestürzt",
    icon: FaBomb,
    category: EntryCategory.Session,
    /**
     * The crash report at the end of a log file carries no timestamps. The
     * exception line names the kind of the crash.
     */
    // Cloud Imperium Games public crash handler taking over...
    // ...
    // Exception STATUS_CRYENGINE_OUT_OF_SYSMEM(0x2BADFF61) addr=0x00007FFE2CE13CFA digest=114a1cfe538433f07c4a87c536ae0528
    regex: /^Exception (?<exception>STATUS_\w+)\(0x[0-9A-Fa-f]+\).*$/gm,
    takesTimeOfPrecedingLine: true,
    renderMessage: (groups) => (
      <TruncatedText>
        {CRASH_EXCEPTION_LABELS[groups.exception] ?? groups.exception}
      </TruncatedText>
    ),
  },
};

/** The order in which every list of the entry types shows them. */
export const SORTED_ENTRY_TYPES = Object.values(EntryType).toSorted(
  (first, second) =>
    PATTERNS[first].title.localeCompare(PATTERNS[second].title),
);

/** The entry types of each category, in the order of `SORTED_ENTRY_TYPES`. */
export const ENTRY_TYPES_BY_CATEGORY = Object.fromEntries(
  Object.values(EntryCategory).map((category) => [
    category,
    SORTED_ENTRY_TYPES.filter((type) => PATTERNS[type].category === category),
  ]),
) as Record<EntryCategory, EntryType[]>;

/** See `Pattern.takesTimeOfPrecedingLine` */
export const isShareableEntryType = (type: EntryType) =>
  !PATTERNS[type].takesTimeOfPrecedingLine;

export const SHAREABLE_ENTRY_TYPES =
  SORTED_ENTRY_TYPES.filter(isShareableEntryType);

/** See `Pattern.isSharedByDefault` */
export const DEFAULT_SHARING_ENTRY_TYPES = Object.fromEntries(
  Object.values(EntryType).map((type) => [
    type,
    PATTERNS[type].isSharedByDefault ?? true,
  ]),
) as Record<EntryType, boolean>;

/** Every type shows until the user hides it */
export const DEFAULT_ENTRY_FILTERS = Object.fromEntries(
  Object.values(EntryType).map((type) => [type, false]),
) as Record<EntryType, boolean>;

const ENTRY_TYPES_BY_VALUE = new Map<string, EntryType>(
  Object.values(EntryType).map((type) => [type, type]),
);

/**
 * Reads a type back which the database keeps as text. Returns undefined for a
 * value which no longer belongs to a pattern, thus a removed pattern leaves
 * its shared entries in place without breaking the table.
 */
export const toEntryType = (value: string) => ENTRY_TYPES_BY_VALUE.get(value);

/**
 * The expressions of `PATTERNS` without the global flag and thus without a
 * `lastIndex`, so a single match never moves the state of a shared
 * expression. Compiled once: `matchEntryLine` runs for every shared entry of
 * a response.
 */
const SINGLE_LINE_REGEXES = Object.fromEntries(
  Object.values(EntryType).map((type) => {
    const { regex } = PATTERNS[type];
    return [type, new RegExp(regex.source, regex.flags.replaceAll("g", ""))];
  }),
) as Record<EntryType, RegExp>;

/**
 * Matches one raw line against the pattern of the given type. Returns null
 * when the line is not of that type.
 */
export const matchEntryLine = (type: EntryType, rawLine: string) =>
  SINGLE_LINE_REGEXES[type].exec(rawLine);

/** The parts of an entry which its pattern derives from the capture groups. */
export const deriveEntryFields = (
  type: EntryType,
  groups: Record<string, string>,
) => ({
  message: PATTERNS[type].renderMessage?.(groups) ?? null,
  collapseKey: PATTERNS[type].collapseKey?.(groups) ?? null,
});

/**
 * Identifies one entry in the entries map. The same line of the same type is
 * one entry, no matter whether the local parser or another citizen delivered
 * it.
 *
 * No value of `EntryType` holds an underscore, thus the separator cannot make
 * two different entries collide.
 */
export const createEntryKey = (type: EntryType, rawLine: string) =>
  `${type}_${rawLine}`;

import type { LogEntryUploadState } from "@/modules/remote-control-program/consumer/logEntryUploadState";
import type { Citizen } from "@sam-monorepo/database/browser";
import {
  getNewerLogAnalyzerEntryVersions,
  getOldestLogAnalyzerEntryVersion,
  LogAnalyzerEntryType,
} from "@sam-monorepo/domain";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import {
  FaArrowRightFromBracket,
  FaArrowRightToBracket,
  FaArrowTrendUp,
  FaBan,
  FaBedPulse,
  FaBomb,
  FaBoxesStacked,
  FaCartShopping,
  FaCoins,
  FaCompassDrafting,
  FaCrown,
  FaEnvelope,
  FaExplosion,
  FaFileCircleCheck,
  FaFileCircleExclamation,
  FaFileCircleMinus,
  FaFileCircleQuestion,
  FaFileCircleXmark,
  FaFileInvoiceDollar,
  FaFileSignature,
  FaGavel,
  FaGift,
  FaHandcuffs,
  FaHandshake,
  FaHouseLock,
  FaKey,
  FaPeace,
  FaPeopleGroup,
  FaPersonHarassing,
  FaPersonWalkingArrowRight,
  FaPlugCircleXmark,
  FaPowerOff,
  FaRightToBracket,
  FaSatelliteDish,
  FaShareFromSquare,
  FaShieldHalved,
  FaSkull,
  FaTowerBroadcast,
  FaTriangleExclamation,
  FaTrophy,
  FaUserInjured,
  FaUserMinus,
  FaUserPlus,
  FaUsers,
  FaUserSlash,
  FaUsersSlash,
} from "react-icons/fa6";
import { AbandonedContractName } from "../components/ContractNames";
import { muted, TruncatedText } from "../components/TruncatedText";
import {
  createLatestMessageSignal,
  LiveStatusKind,
  LiveStatusSignalType,
  SESSION_END_SIGNAL,
  toMissionKey,
  type LiveStatusSignal,
} from "./liveStatusSignals";

/** The groups of the entry types, in the order the lists show them. */
export enum EntryCategory {
  Session = "session",
  Contracts = "contracts",
  Character = "character",
  Vehicles = "vehicles",
  Crime = "crime",
  Zones = "zones",
  Party = "party",
  Commerce = "commerce",
}

export const ENTRY_CATEGORY_TITLES: Record<EntryCategory, string> = {
  [EntryCategory.Session]: "Session",
  [EntryCategory.Contracts]: "Contracts",
  [EntryCategory.Character]: "Charakter",
  [EntryCategory.Vehicles]: "Fahrzeuge",
  [EntryCategory.Crime]: "Verbrechen",
  [EntryCategory.Zones]: "Zonen",
  [EntryCategory.Party]: "Party",
  [EntryCategory.Commerce]: "Handel",
};

export interface IEntry {
  readonly key: string;
  readonly type: LogAnalyzerEntryType;
  readonly isoDate: Date;
  readonly isNew?: boolean;
  readonly message: ReactNode;
  /** Null when the type has no such key */
  readonly collapseKey: string | null;
  /** Null when the line names no mission */
  readonly missionId: string | null;
  /** Null when the line names no contract */
  readonly contractName: string | null;
  readonly citizen: Pick<Citizen, "id" | "handle" | "deletedAt">;
  /** True when a different citizen owns the entry and shares it */
  readonly isShared: boolean;
  readonly uploadState: LogEntryUploadState;
  /** Null when the type tells nothing */
  readonly liveStatusSignal: LiveStatusSignal | null;
  /**
   * Orders the lines of one instant (see `compareEntries`). Can be null for a
   * shared entry.
   */
  readonly lineNumber: number | null;
  /** The game channel of the log file of the entry, for example `LIVE`, or null */
  readonly gameChannel: string | null;
  /** The game version of the log file of the entry, or null */
  readonly gameVersion: string | null;
}

const shardRegex = /^pub_(?<region>[a-z0-9]+)_\w+_(?<number>\d+)$/m;

/**
 * The short name of a shard, for example `EU 100` for
 * `pub_euw1b_9873572_100`. Null when the name has an unknown form.
 */
export const formatShard = (shard: string) => {
  const match = shardRegex.exec(shard);
  if (!match?.groups) return null;

  let region = match.groups.region;
  if (region.startsWith("eu")) region = "EU";
  if (region.startsWith("us")) region = "USA";
  if (region.startsWith("ape")) region = "ASIA";
  if (region.startsWith("apse")) region = "AUS";

  const number = match.groups.number.replace(/^0+/, "");

  return `${region} ${number}`;
};

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

const toDirectionLabel = (direction: string) =>
  DIRECTION_LABELS[direction] ?? direction;

const toInstanceName = (instance: string) =>
  instance.replace(/^StreamingSOC_/, "");

const renderDirection = (groups: Record<string, string>) => (
  <TruncatedText>{toDirectionLabel(groups.direction)}</TruncatedText>
);

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

export const formatDuration = (seconds: number) => {
  const totalMinutes = Math.round(seconds / SECONDS_PER_MINUTE);
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
};

/** The body parts of a med bed line, as the game names them and in its order */
const BODY_PARTS = [
  "head",
  "torso",
  "leftArm",
  "rightArm",
  "leftLeg",
  "rightLeg",
];

const priceFormat = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 0,
});

const scuFormat = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 2,
});

const CENTI_SCU_PER_SCU = 100;

/** The shops of the game are all named `SCShop_<location>` */
const toShopName = (shop: string) => shop.replace(/^SCShop_/, "");

const formatShopPrice = (groups: Record<string, string>) => [
  muted("für"),
  `${priceFormat.format(Number(groups.price))} aUEC`,
  muted(`(${toShopName(groups.shop)})`),
];

enum RestrictedAreaEvent {
  Impoundment = "impoundment",
  Leaving = "leaving",
  Relocation = "relocation",
}

/** The two lines of a restricted area come from one alternative of the regex */
const toRestrictedAreaEvent = (event: string) => {
  if (event.startsWith("Leaving")) return RestrictedAreaEvent.Leaving;
  if (event.includes("relocated")) return RestrictedAreaEvent.Relocation;
  return RestrictedAreaEvent.Impoundment;
};

const RESTRICTED_AREA_LABELS: Record<RestrictedAreaEvent, string> = {
  [RestrictedAreaEvent.Impoundment]: "Fahrzeuge werden beschlagnahmt",
  [RestrictedAreaEvent.Leaving]: "Verlassen",
  [RestrictedAreaEvent.Relocation]: "Vom Spiel umgesetzt",
};

/**
 * A reason without a label, for example `GameRules` or an unknown reason, shows
 * as the game writes it.
 */
const VEHICLE_DESTRUCTION_REASON_LABELS: Record<string, string> = {
  Combat: "Kampf",
  Collision: "Kollision",
  SelfDestruct: "Selbstzerstörung",
};

/**
 * The killer of a vehicle destruction, or null when the line names none. Only
 * an entity has a numeric id at the end of its name: a handle can hold
 * underscores, which must stay.
 */
const toVehicleKiller = (groups: Record<string, string>) => {
  /** A self-destruction names the vehicle itself as the killer */
  if (groups.killer === "none" || groups.killer === groups.vehicle) return null;
  return /_\d+$/.test(groups.killer)
    ? toEntityClass(groups.killer)
    : groups.killer;
};

export const formatVehicleDestructionCause = (
  groups: Record<string, string>,
) => {
  const reason =
    VEHICLE_DESTRUCTION_REASON_LABELS[groups.reason] ?? groups.reason;
  const killer = toVehicleKiller(groups);
  return killer ? `${reason} mit ${killer}` : reason;
};

interface Pattern {
  title: string;
  icon: IconType;
  category: EntryCategory;
  renderMessage?: (groups: Record<string, string>) => ReactNode;
  /**
   * The game repeats some lines: a zone notification while the player stays
   * in the zone, and the instance entry while the instance streams in and
   * out. Entries of one type and one citizen which follow each other with the
   * same key show as one entry (see `collapseRepeatedEntries`).
   */
  collapseKey?: (groups: Record<string, string>) => string;
  /**
   * The entries of this type continue the repeats of another type, thus they
   * end a repeat of that type. By default, each type has its own repeats.
   */
  collapseSequenceOf?: LogAnalyzerEntryType;
  liveStatusSignal?: (groups: Record<string, string>) => LiveStatusSignal;
}

/** The first versions of an end line name only the contract */
const createContractEndSignal = (
  groups: Record<string, string>,
): LiveStatusSignal => ({
  type: LiveStatusSignalType.StateEnd,
  kind: LiveStatusKind.Contract,
  key: toMissionKey(groups.missionId),
  label: groups.contract ? stripMarkup(groups.contract) : null,
});

const createContractEndPattern = (title: string, icon: IconType): Pattern => ({
  title,
  icon,
  category: EntryCategory.Contracts,
  renderMessage: (groups) => (
    <TruncatedText>{stripMarkup(groups.contract)}</TruncatedText>
  ),
  liveStatusSignal: createContractEndSignal,
});

/** All versions of each type, see `LogAnalyzerEntryPattern.supersedes` */
const CONTRACT_COMPLETE_PATTERN = createContractEndPattern(
  "Contract abgeschlossen",
  FaFileCircleCheck,
);
const CONTRACT_FAILED_PATTERN = createContractEndPattern(
  "Contract fehlgeschlagen",
  FaFileCircleXmark,
);
const CONTRACT_WITHDRAWN_PATTERN = createContractEndPattern(
  "Contract zurückgezogen",
  FaFileCircleMinus,
);

const EARNED_PATTERN: Pattern = {
  title: "Belohnung erhalten",
  icon: FaTrophy,
  category: EntryCategory.Contracts,
  renderMessage: (groups) => (
    <TruncatedText>{stripMarkup(groups.reward)}</TruncatedText>
  ),
};

/**
 * The presentation of each entry type. The expressions are in
 * `LOG_ANALYZER_ENTRY_PATTERNS` of the domain package.
 */
export const PATTERNS: Record<LogAnalyzerEntryType, Pattern> = {
  joinPu: {
    title: "Shard-Beitritt",
    icon: FaRightToBracket,
    category: EntryCategory.Session,
    renderMessage: (groups) => {
      const shardName = formatShard(groups.shard);
      if (!shardName) return <TruncatedText>{groups.shard}</TruncatedText>;

      return (
        <TruncatedText>{[shardName, muted(`(${groups.shard})`)]}</TruncatedText>
      );
    },
    liveStatusSignal: (groups) => ({
      type: LiveStatusSignalType.SessionStart,
      shard: groups.shard,
    }),
  },

  ownDeath: {
    title: "Gestorben",
    icon: FaSkull,
    category: EntryCategory.Character,
    renderMessage: (groups) => (
      <TruncatedText>{toEntityClass(groups.vehicle)}</TruncatedText>
    ),
  },

  blueprintReceivedNotification: {
    title: "Blueprint erhalten",
    icon: FaCompassDrafting,
    category: EntryCategory.Contracts,
    renderMessage: (groups) => (
      <TruncatedText>{stripMarkup(groups.blueprint)}</TruncatedText>
    ),
  },

  contractAcceptedNotification: {
    title: "Contract angenommen",
    icon: FaFileSignature,
    category: EntryCategory.Contracts,
    renderMessage: (groups) => (
      <TruncatedText>{stripMarkup(groups.contract)}</TruncatedText>
    ),
    liveStatusSignal: (groups) => ({
      type: LiveStatusSignalType.StateStart,
      kind: LiveStatusKind.Contract,
      key: toMissionKey(groups.missionId),
      label: stripMarkup(groups.contract),
    }),
  },

  contractCompleteNotification: CONTRACT_COMPLETE_PATTERN,
  contractCompleteNotificationV2: CONTRACT_COMPLETE_PATTERN,

  contractFailedNotification: CONTRACT_FAILED_PATTERN,
  contractFailedNotificationV2: CONTRACT_FAILED_PATTERN,

  contractSharedNotification: {
    title: "Contract geteilt",
    icon: FaShareFromSquare,
    category: EntryCategory.Contracts,
    renderMessage: (groups) => (
      <TruncatedText>{stripMarkup(groups.contract)}</TruncatedText>
    ),
    collapseKey: (groups) => groups.contract,
  },

  contractWithdrawnNotification: CONTRACT_WITHDRAWN_PATTERN,
  contractWithdrawnNotificationV2: CONTRACT_WITHDRAWN_PATTERN,

  disconnection: {
    title: "Verbindung getrennt",
    icon: FaPlugCircleXmark,
    category: EntryCategory.Session,
    renderMessage: (groups) => (
      <TruncatedText>
        {`${groups.reason} nach ${formatDuration(Number(groups.uptimeSeconds))}`}
      </TruncatedText>
    ),
    liveStatusSignal: () => SESSION_END_SIGNAL,
  },

  injuryDetectedNotification: {
    title: "Verletzung",
    icon: FaUserInjured,
    category: EntryCategory.Character,
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
    renderMessage: (groups) => {
      const treatedBodyParts = BODY_PARTS.filter(
        (bodyPart) => groups[bodyPart] === "true",
      );
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
    renderMessage: (groups) => (
      <TruncatedText>
        {[`${groups.quantity}× ${groups.item}`, ...formatShopPrice(groups)]}
      </TruncatedText>
    ),
  },

  armisticeZoneNotification: {
    title: "Armistice Zone",
    icon: FaPeace,
    category: EntryCategory.Zones,
    renderMessage: renderDirection,
    collapseKey: (groups) => groups.direction,
    liveStatusSignal: (groups) =>
      createLatestMessageSignal(
        LiveStatusKind.ArmisticeZone,
        toDirectionLabel(groups.direction),
      ),
  },

  jurisdictionNotification: {
    title: "Jurisdiktion",
    icon: FaGavel,
    category: EntryCategory.Zones,
    renderMessage: (groups) => (
      <TruncatedText>{groups.jurisdiction}</TruncatedText>
    ),
    collapseKey: (groups) => groups.jurisdiction,
    liveStatusSignal: (groups) =>
      createLatestMessageSignal(
        LiveStatusKind.Jurisdiction,
        groups.jurisdiction,
      ),
  },

  monitoredSpaceNotification: {
    title: "Monitored Space",
    icon: FaSatelliteDish,
    category: EntryCategory.Zones,
    renderMessage: renderDirection,
    collapseKey: (groups) => groups.direction,
    liveStatusSignal: (groups) =>
      createLatestMessageSignal(
        LiveStatusKind.MonitoredSpace,
        toDirectionLabel(groups.direction),
      ),
  },

  privatePropertyNotification: {
    title: "Private Property",
    icon: FaHouseLock,
    category: EntryCategory.Zones,
    renderMessage: renderDirection,
    collapseKey: (groups) => groups.direction,
    liveStatusSignal: (groups) =>
      createLatestMessageSignal(
        LiveStatusKind.PrivateProperty,
        toDirectionLabel(groups.direction),
      ),
  },

  partyInviteReceivedNotification: {
    title: "Party-Einladung",
    icon: FaEnvelope,
    category: EntryCategory.Party,
    renderMessage: (groups) => <TruncatedText>{groups.handle}</TruncatedText>,
  },

  partyMemberJoinedNotification: {
    title: "Party-Mitglied beigetreten",
    icon: FaUserPlus,
    category: EntryCategory.Party,
    renderMessage: (groups) => <TruncatedText>{groups.handle}</TruncatedText>,
  },

  partyMemberLeftNotification: {
    title: "Party-Mitglied gegangen",
    icon: FaUserMinus,
    category: EntryCategory.Party,
    renderMessage: (groups) => <TruncatedText>{groups.handle}</TruncatedText>,
  },

  partyLeaderChangedNotification: {
    title: "Party-Leader",
    icon: FaCrown,
    category: EntryCategory.Party,
    renderMessage: (groups) => <TruncatedText>{groups.handle}</TruncatedText>,
  },

  instanceEntered: {
    title: "Instanz betreten",
    icon: FaArrowRightToBracket,
    category: EntryCategory.Zones,
    renderMessage: (groups) => (
      <TruncatedText>{toInstanceName(groups.instance)}</TruncatedText>
    ),
    collapseKey: (groups) => groups.instanceId,
    liveStatusSignal: (groups) => ({
      type: LiveStatusSignalType.StateStart,
      kind: LiveStatusKind.Instance,
      key: groups.instanceId,
      label: toInstanceName(groups.instance),
    }),
  },

  instanceExited: {
    title: "Instanz verlassen",
    icon: FaArrowRightFromBracket,
    category: EntryCategory.Zones,
    renderMessage: (groups) => (
      <TruncatedText>{toInstanceName(groups.instance)}</TruncatedText>
    ),
    collapseKey: (groups) => groups.instanceId,
    /** An entry of the instance after its exit is no repeat */
    collapseSequenceOf: LogAnalyzerEntryType.InstanceEntered,
    liveStatusSignal: (groups) => ({
      type: LiveStatusSignalType.StateEnd,
      kind: LiveStatusKind.Instance,
      key: groups.instanceId,
      label: null,
    }),
  },

  gameQuit: {
    title: "Spiel beendet",
    icon: FaPowerOff,
    category: EntryCategory.Session,
    liveStatusSignal: () => SESSION_END_SIGNAL,
  },

  gameCrash: {
    title: "Spiel abgestürzt",
    icon: FaBomb,
    category: EntryCategory.Session,
    renderMessage: (groups) => (
      <TruncatedText>{groups.exception}</TruncatedText>
    ),
    liveStatusSignal: () => SESSION_END_SIGNAL,
  },

  crimeCommittedNotification: {
    title: "Verbrechen begangen",
    icon: FaHandcuffs,
    category: EntryCategory.Crime,
    renderMessage: (groups) => (
      <TruncatedText>{`${groups.crime} gegen ${groups.handle}`}</TruncatedText>
    ),
  },

  crimeAgainstYouNotification: {
    title: "Verbrechen gegen dich",
    icon: FaPersonHarassing,
    category: EntryCategory.Crime,
    renderMessage: (groups) => (
      <TruncatedText>{`${groups.crime} von ${groups.handle}`}</TruncatedText>
    ),
  },

  crimeStatIncreasedNotification: {
    title: "CrimeStat erhöht",
    icon: FaArrowTrendUp,
    category: EntryCategory.Crime,
  },

  fineNotification: {
    title: "Strafe",
    icon: FaFileInvoiceDollar,
    category: EntryCategory.Crime,
    renderMessage: (groups) => (
      <TruncatedText>
        {`${priceFormat.format(Number(groups.amount))} UEC`}
      </TruncatedText>
    ),
  },

  contractAbandoned: {
    title: "Contract abgebrochen",
    icon: FaFileCircleExclamation,
    category: EntryCategory.Contracts,
    renderMessage: (groups) => (
      <AbandonedContractName missionId={groups.missionId} />
    ),
    liveStatusSignal: createContractEndSignal,
  },

  contractNotAcceptedNotification: {
    title: "Contract nicht angenommen",
    icon: FaFileCircleQuestion,
    category: EntryCategory.Contracts,
    renderMessage: (groups) => <TruncatedText>{groups.reason}</TruncatedText>,
  },

  rewardNotification: {
    title: "Belohnung",
    icon: FaGift,
    category: EntryCategory.Contracts,
    renderMessage: (groups) => (
      <TruncatedText>
        {`${stripMarkup(groups.reward)}: ${stripMarkup(groups.items)}`}
      </TruncatedText>
    ),
  },

  earnedNotification: EARNED_PATTERN,
  earnedNotificationV2: EARNED_PATTERN,

  fundsAwardedNotification: {
    title: "aUEC erhalten",
    icon: FaCoins,
    category: EntryCategory.Contracts,
    renderMessage: (groups) => (
      <TruncatedText>
        {`${priceFormat.format(Number(groups.amount))} aUEC`}
      </TruncatedText>
    ),
  },

  restrictedAreaNotification: {
    title: "Sperrgebiet",
    icon: FaBan,
    category: EntryCategory.Zones,
    renderMessage: (groups) => (
      <TruncatedText>
        {RESTRICTED_AREA_LABELS[toRestrictedAreaEvent(groups.event)]}
      </TruncatedText>
    ),
    collapseKey: (groups) => toRestrictedAreaEvent(groups.event),
    liveStatusSignal: (groups) =>
      createLatestMessageSignal(
        LiveStatusKind.RestrictedArea,
        RESTRICTED_AREA_LABELS[toRestrictedAreaEvent(groups.event)],
      ),
  },

  monitoredSpaceStatusNotification: {
    title: "Monitored Space Status",
    icon: FaTowerBroadcast,
    category: EntryCategory.Zones,
    renderMessage: (groups) => (
      <TruncatedText>
        {groups.status === "Down" ? "Ausgefallen" : "Wiederhergestellt"}
      </TruncatedText>
    ),
  },

  errorPopup: {
    title: "Fehlermeldung",
    icon: FaTriangleExclamation,
    category: EntryCategory.Session,
    renderMessage: (groups) => (
      <TruncatedText>{`Code ${groups.errorCode}`}</TruncatedText>
    ),
  },

  shipClaimFailed: {
    title: "Schiff-Claim fehlgeschlagen",
    icon: FaShieldHalved,
    category: EntryCategory.Commerce,
    renderMessage: (groups) => <TruncatedText>{groups.reason}</TruncatedText>,
  },

  shopRental: {
    title: "Miete",
    icon: FaKey,
    category: EntryCategory.Commerce,
    renderMessage: (groups) => (
      <TruncatedText>{[groups.item, ...formatShopPrice(groups)]}</TruncatedText>
    ),
  },

  commodityPurchase: {
    title: "Commodity-Einkauf",
    icon: FaBoxesStacked,
    category: EntryCategory.Commerce,
    renderMessage: (groups) => (
      <TruncatedText>
        {[
          `${scuFormat.format(Number(groups.centiScu) / CENTI_SCU_PER_SCU)} SCU`,
          ...formatShopPrice(groups),
        ]}
      </TruncatedText>
    ),
  },

  partyJoinedNotification: {
    title: "Party beigetreten",
    icon: FaPeopleGroup,
    category: EntryCategory.Party,
  },

  partyCreatedNotification: {
    title: "Party erstellt",
    icon: FaUsers,
    category: EntryCategory.Party,
  },

  partyLeftNotification: {
    title: "Party verlassen",
    icon: FaPersonWalkingArrowRight,
    category: EntryCategory.Party,
  },

  partyKickedNotification: {
    title: "Aus Party entfernt",
    icon: FaUserSlash,
    category: EntryCategory.Party,
  },

  partyDisbandedNotification: {
    title: "Party aufgelöst",
    icon: FaUsersSlash,
    category: EntryCategory.Party,
  },

  friendAddedNotification: {
    title: "Freund hinzugefügt",
    icon: FaHandshake,
    category: EntryCategory.Party,
    renderMessage: (groups) => <TruncatedText>{groups.handle}</TruncatedText>,
  },

  vehicleDestroyed: {
    title: "Fahrzeugzerstörung",
    icon: FaExplosion,
    category: EntryCategory.Vehicles,
    renderMessage: (groups) => (
      <TruncatedText>
        {[
          toEntityClass(groups.vehicleClass),
          muted(`(${formatVehicleDestructionCause(groups)})`),
        ]}
      </TruncatedText>
    ),
  },
};

/**
 * The order in which every list of the entry types shows them. A list shows
 * only the newest version of a type, because the settings of a version apply
 * to all versions (see `shareValueAcrossVersions`).
 */
export const SORTED_ENTRY_TYPES = Object.values(LogAnalyzerEntryType)
  .filter((type) => getNewerLogAnalyzerEntryVersions(type).length === 0)
  .toSorted((first, second) =>
    PATTERNS[first].title.localeCompare(PATTERNS[second].title),
  );

export const ENTRY_TYPES_BY_CATEGORY = Object.fromEntries(
  Object.values(EntryCategory).map((category) => [
    category,
    SORTED_ENTRY_TYPES.filter((type) => PATTERNS[type].category === category),
  ]),
) as Record<EntryCategory, LogAnalyzerEntryType[]>;

export const createEntryTypeRecord = (value: boolean) =>
  Object.fromEntries(
    Object.values(LogAnalyzerEntryType).map((type) => [type, value]),
  ) as Record<LogAnalyzerEntryType, boolean>;

/**
 * The settings keep one value for all versions of a type, under the oldest
 * version (see `getOldestLogAnalyzerEntryVersion`). This gives each version
 * the value of its oldest version.
 */
export const shareValueAcrossVersions = (
  record: Record<LogAnalyzerEntryType, boolean>,
) =>
  Object.fromEntries(
    Object.values(LogAnalyzerEntryType).map((type) => [
      type,
      record[getOldestLogAnalyzerEntryVersion(type)],
    ]),
  ) as Record<LogAnalyzerEntryType, boolean>;

export const deriveEntryFields = (
  type: LogAnalyzerEntryType,
  groups: Record<string, string>,
) => ({
  message: PATTERNS[type].renderMessage?.(groups) ?? null,
  collapseKey: PATTERNS[type].collapseKey?.(groups) ?? null,
  missionId: groups.missionId ?? null,
  contractName: groups.contract ? stripMarkup(groups.contract) : null,
  liveStatusSignal: PATTERNS[type].liveStatusSignal?.(groups) ?? null,
});

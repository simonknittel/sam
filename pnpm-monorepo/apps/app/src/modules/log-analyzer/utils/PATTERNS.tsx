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
import { TruncatedText } from "../components/TruncatedText";

/** The groups of the entry types, in the order the lists show them. */
export enum EntryCategory {
  Session = "session",
  Contracts = "contracts",
  Character = "character",
  Crime = "crime",
  Zones = "zones",
  Party = "party",
  Commerce = "commerce",
}

export const ENTRY_CATEGORY_TITLES: Record<EntryCategory, string> = {
  [EntryCategory.Session]: "Session",
  [EntryCategory.Contracts]: "Contracts",
  [EntryCategory.Character]: "Charakter",
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
  /** See `Pattern.collapseKey`. Null when the type has no such key. */
  readonly collapseKey: string | null;
  /** The mission of a contract. Null when the line names no mission. */
  readonly missionId: string | null;
  /** The name of a contract. Null when the line names no contract. */
  readonly contractName: string | null;
  /**
   * The citizen the entry belongs to: the citizen who shared it, or the
   * current user for a local one. Null when the user has no linked citizen.
   */
  readonly citizen: Pick<Citizen, "id" | "handle" | "deletedAt"> | null;
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

/** The two lines of a restricted area come from one alternative of the regex */
const getRestrictedAreaLabel = (event: string) => {
  if (event.startsWith("Leaving")) return "Verlassen";
  if (event.includes("relocated")) return "Vom Spiel umgesetzt";
  return "Fahrzeuge werden beschlagnahmt";
};

interface Pattern {
  title: string;
  icon: IconType;
  category: EntryCategory;
  renderMessage?: (groups: Record<string, string>) => ReactNode;
  /**
   * The game repeats some lines: every zone notification on a shard change,
   * and the instance entry while the instance streams in and out. Entries of
   * one type and one citizen which follow each other with the same key show
   * as one entry.
   */
  collapseKey?: (groups: Record<string, string>) => string;
}

/** All versions of the type, see `LogAnalyzerEntryPattern.supersedes` */
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
  },

  contractCompleteNotification: {
    title: "Contract abgeschlossen",
    icon: FaFileCircleCheck,
    category: EntryCategory.Contracts,
    renderMessage: (groups) => (
      <TruncatedText>{stripMarkup(groups.contract)}</TruncatedText>
    ),
  },

  contractFailedNotification: {
    title: "Contract fehlgeschlagen",
    icon: FaFileCircleXmark,
    category: EntryCategory.Contracts,
    renderMessage: (groups) => (
      <TruncatedText>{stripMarkup(groups.contract)}</TruncatedText>
    ),
  },

  contractSharedNotification: {
    title: "Contract geteilt",
    icon: FaShareFromSquare,
    category: EntryCategory.Contracts,
    renderMessage: (groups) => (
      <TruncatedText>{stripMarkup(groups.contract)}</TruncatedText>
    ),
    collapseKey: (groups) => groups.contract,
  },

  contractWithdrawnNotification: {
    title: "Contract zurückgezogen",
    icon: FaFileCircleMinus,
    category: EntryCategory.Contracts,
    renderMessage: (groups) => (
      <TruncatedText>{stripMarkup(groups.contract)}</TruncatedText>
    ),
  },

  disconnection: {
    title: "Verbindung getrennt",
    icon: FaPlugCircleXmark,
    category: EntryCategory.Session,
    renderMessage: (groups) => (
      <TruncatedText>
        {`${groups.reason} nach ${formatDuration(Number(groups.uptimeSeconds))}`}
      </TruncatedText>
    ),
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
        {`${groups.quantity}× ${groups.item} für ${priceFormat.format(Number(groups.price))} aUEC (${toShopName(groups.shop)})`}
      </TruncatedText>
    ),
  },

  armisticeZoneNotification: {
    title: "Armistice Zone",
    icon: FaPeace,
    category: EntryCategory.Zones,
    renderMessage: renderDirection,
    collapseKey: (groups) => groups.direction,
  },

  jurisdictionNotification: {
    title: "Jurisdiktion",
    icon: FaGavel,
    category: EntryCategory.Zones,
    renderMessage: (groups) => (
      <TruncatedText>{groups.jurisdiction}</TruncatedText>
    ),
    collapseKey: (groups) => groups.jurisdiction,
  },

  monitoredSpaceNotification: {
    title: "Monitored Space",
    icon: FaSatelliteDish,
    category: EntryCategory.Zones,
    renderMessage: renderDirection,
    collapseKey: (groups) => groups.direction,
  },

  privatePropertyNotification: {
    title: "Private Property",
    icon: FaHouseLock,
    category: EntryCategory.Zones,
    renderMessage: renderDirection,
    collapseKey: (groups) => groups.direction,
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
  },

  gameCrash: {
    title: "Spiel abgestürzt",
    icon: FaBomb,
    category: EntryCategory.Session,
    renderMessage: (groups) => (
      <TruncatedText>{groups.exception}</TruncatedText>
    ),
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
      <TruncatedText>{getRestrictedAreaLabel(groups.event)}</TruncatedText>
    ),
    collapseKey: (groups) => getRestrictedAreaLabel(groups.event),
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
      <TruncatedText>
        {`${groups.item} für ${priceFormat.format(Number(groups.price))} aUEC (${toShopName(groups.shop)})`}
      </TruncatedText>
    ),
  },

  commodityPurchase: {
    title: "Commodity-Einkauf",
    icon: FaBoxesStacked,
    category: EntryCategory.Commerce,
    renderMessage: (groups) => (
      <TruncatedText>
        {`${scuFormat.format(Number(groups.centiScu) / CENTI_SCU_PER_SCU)} SCU für ${priceFormat.format(Number(groups.price))} aUEC (${toShopName(groups.shop)})`}
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

/** The entry types of each category, in the order of `SORTED_ENTRY_TYPES`. */
export const ENTRY_TYPES_BY_CATEGORY = Object.fromEntries(
  Object.values(EntryCategory).map((category) => [
    category,
    SORTED_ENTRY_TYPES.filter((type) => PATTERNS[type].category === category),
  ]),
) as Record<EntryCategory, LogAnalyzerEntryType[]>;

/** A record with the given value for every entry type, for the settings. */
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

/** The parts of an entry which its pattern derives from the capture groups. */
export const deriveEntryFields = (
  type: LogAnalyzerEntryType,
  groups: Record<string, string>,
) => ({
  message: PATTERNS[type].renderMessage?.(groups) ?? null,
  collapseKey: PATTERNS[type].collapseKey?.(groups) ?? null,
  missionId: groups.missionId ?? null,
  contractName: groups.contract ? stripMarkup(groups.contract) : null,
});

/**
 * Identifies one entry in the entries map. The same line of the same type is
 * one entry, no matter whether the local parser or another citizen delivered
 * it.
 *
 * No value of `LogAnalyzerEntryType` holds an underscore, thus the separator
 * cannot make two different entries collide.
 */
export const createEntryKey = (type: LogAnalyzerEntryType, rawLine: string) =>
  `${type}_${rawLine}`;

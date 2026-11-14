import { CitizenLink } from "@/modules/common/components/CitizenLink";
import clsx from "clsx";
import { FaServer } from "react-icons/fa6";
import {
  LiveStatusPresence,
  type LiveStatusReporter as Reporter,
} from "../utils/liveStatus";
import { formatShard } from "../utils/PATTERNS";
import { LiveStatusPartyRow } from "./LiveStatusPartyRow";
import { LiveStatusSince } from "./LiveStatusSince";
import { LiveStatusStateRow } from "./LiveStatusStateRow";

const PRESENCE_LABELS: Record<LiveStatusPresence, string> = {
  [LiveStatusPresence.Online]: "online",
  [LiveStatusPresence.Uncertain]: "unsicher",
  [LiveStatusPresence.Offline]: "offline",
};

interface PresenceProps {
  readonly reporter: Reporter;
  readonly now: Date;
}

const Presence = ({ reporter, now }: PresenceProps) => {
  const { presence, offlineSince } = reporter;

  return (
    <span
      className={clsx("flex shrink-0 items-center gap-1 text-xs", {
        "text-green-500": presence === LiveStatusPresence.Online,
        "text-amber-300": presence === LiveStatusPresence.Uncertain,
        "text-white/60": presence === LiveStatusPresence.Offline,
      })}
    >
      <span
        aria-hidden
        className={clsx("size-2 rounded-full", {
          "bg-green-500": presence === LiveStatusPresence.Online,
          "bg-amber-300": presence === LiveStatusPresence.Uncertain,
          "bg-white/40": presence === LiveStatusPresence.Offline,
        })}
      />
      {PRESENCE_LABELS[presence]}
      {offlineSince && (
        <>
          {" "}
          <LiveStatusSince since={offlineSince} now={now} />
        </>
      )}
    </span>
  );
};

interface Props {
  readonly reporter: Reporter;
  readonly now: Date;
  readonly isLiveModeActive: boolean;
}

export const LiveStatusReporter = ({
  reporter,
  now,
  isLiveModeActive,
}: Props) => {
  const isOffline = reporter.presence === LiveStatusPresence.Offline;
  const shardName = reporter.shard
    ? (formatShard(reporter.shard) ?? reporter.shard)
    : null;

  return (
    <li
      className={clsx("rounded-secondary bg-tertiary p-2 text-sm", {
        "opacity-60": isOffline,
      })}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-bold">
          {/* The own entries of a user without a linked citizen */}
          {reporter.citizen ? <CitizenLink citizen={reporter.citizen} /> : "Du"}
        </span>
        <Presence reporter={reporter} now={now} />
      </div>

      {shardName && (
        <p className="mt-1 flex items-center gap-2 text-white/60">
          <FaServer className="shrink-0 text-white/40" aria-hidden />
          <span
            className="min-w-0 flex-1 truncate"
            title={`Shard ${shardName} (${reporter.shard})`}
          >
            Shard {shardName}
          </span>
          {reporter.shardSince && (
            <LiveStatusSince since={reporter.shardSince} now={now} />
          )}
        </p>
      )}

      {reporter.isOwn && !isLiveModeActive && !isOffline && (
        <p className="mt-1 text-xs text-white/40">
          Für einen genauen Status &bdquo;Automatisch aktualisieren&ldquo;
          einschalten.
        </p>
      )}

      {(reporter.states.length > 0 || reporter.party) && (
        <ul className="mt-2 flex flex-col gap-1">
          {reporter.states.map((state) => (
            <LiveStatusStateRow
              key={`${state.kind}_${state.key ?? state.label ?? ""}_${state.since.toISOString()}`}
              state={state}
              now={now}
            />
          ))}
          {reporter.party && (
            <LiveStatusPartyRow party={reporter.party} now={now} />
          )}
        </ul>
      )}
    </li>
  );
};

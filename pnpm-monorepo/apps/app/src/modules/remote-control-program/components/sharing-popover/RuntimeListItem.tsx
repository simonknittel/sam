import { formatDate } from "@/modules/common/utils/formatDate";
import type { OwnRuntime } from "@sam-monorepo/application";
import type { AnnounceContent } from "@sam-monorepo/domain";
import clsx from "clsx";
import {
  CAPABILITY_LABELS,
  CONNECTOR_LABELS,
  RUNTIME_KIND_LABELS,
} from "./catalogTexts";

interface Props {
  readonly runtime: OwnRuntime;
  /** The runtime of the browser that shows the popover */
  readonly isThisBrowser: boolean;
}

/** A runtime of the owner in the status section */
export const RuntimeListItem = ({ runtime, isThisBrowser }: Props) => {
  const versionText = `Version ${runtime.runtimeVersion}`;

  return (
    <li
      className={clsx(
        "flex flex-col gap-1 rounded-secondary border border-white/10 p-3 text-sm",
        { "text-neutral-500": !runtime.isOnline },
      )}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={clsx("size-2 flex-none rounded-full", {
            "bg-green-500": runtime.isOnline,
            "bg-neutral-600": !runtime.isOnline,
          })}
        />

        <span className="font-bold">
          {RUNTIME_KIND_LABELS[runtime.kind]}
          {runtime.isOnline ? " (online)" : " (offline)"}
        </span>

        {isThisBrowser && (
          <span className="flex-none rounded-secondary bg-white/10 px-1.5 text-xs text-neutral-300">
            dieser Browser
          </span>
        )}

        <span
          className="ml-auto min-w-0 truncate text-neutral-500"
          title={versionText}
        >
          {versionText}
        </span>
      </div>

      <p className="text-neutral-400">
        {runtime.isOnline
          ? `Verbunden seit ${formatDate(runtime.connectedAt)}`
          : `Letzte Verbindung am ${formatDate(runtime.connectedAt)}`}
      </p>

      {/* The announcement of an offline runtime can be old */}
      {runtime.isOnline && (
        <AnnouncementSummary announcement={runtime.announcement} />
      )}
    </li>
  );
};

interface AnnouncementSummaryProps {
  readonly announcement: AnnounceContent | null;
}

/** The connectors of the runtime and the summary of its local access layer */
const AnnouncementSummary = ({ announcement }: AnnouncementSummaryProps) => {
  if (!announcement)
    return (
      <p className="text-neutral-500">
        Die Laufzeit hat noch keine Quellen gemeldet.
      </p>
    );

  const connectorsText =
    announcement.connectors
      .map(
        (connector) =>
          `${CONNECTOR_LABELS[connector.id]} (${connector.capabilities.map((capability) => CAPABILITY_LABELS[capability.id]).join(", ")})`,
      )
      .join(", ") || "Keine Quelle verfügbar";

  const { local_access_layer: localAccessLayer } = announcement;
  const uploadText = localAccessLayer.is_stopped
    ? "Auf dem Gerät gestoppt"
    : localAccessLayer.capability_rules
        .map(
          (rule) =>
            `${CAPABILITY_LABELS[rule.capability_id]}: ${getRuleText(rule.is_on, rule.is_filtered)}`,
        )
        .join(", ") || "Nichts";

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-neutral-400">
      <dt className="text-neutral-500">Quellen</dt>
      <dd>{connectorsText}</dd>

      <dt className="text-neutral-500">Hochladen</dt>
      <dd>{uploadText}</dd>
    </dl>
  );
};

const getRuleText = (isOn: boolean, isFiltered: boolean) => {
  if (!isOn) return "aus";
  return isFiltered ? "teilweise" : "an";
};

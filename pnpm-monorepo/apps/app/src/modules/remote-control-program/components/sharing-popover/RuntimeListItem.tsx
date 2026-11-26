import type { OwnRuntime } from "@sam-monorepo/application";
import type { AnnounceContent } from "@sam-monorepo/domain";
import { CONNECTOR_LABELS, RUNTIME_KIND_LABELS } from "./catalogTexts";

interface Props {
  readonly runtime: OwnRuntime;
  /** The runtime of the browser that shows the popover */
  readonly isThisBrowser: boolean;
}

/** A connected runtime of the owner in the status section */
export const RuntimeListItem = ({ runtime, isThisBrowser }: Props) => {
  return (
    <li className="flex flex-col gap-1 rounded-secondary border border-white/10 p-3 text-sm">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-2 flex-none rounded-full bg-green-500"
        />

        <span className="font-bold">{RUNTIME_KIND_LABELS[runtime.kind]}</span>

        {isThisBrowser && (
          <span className="flex-none rounded-secondary bg-white/10 px-1.5 text-xs text-neutral-300">
            dieser Browser
          </span>
        )}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-neutral-400">
        <dt className="text-neutral-500">Aktive Connectors</dt>
        <dd>{getActiveConnectorsText(runtime.announcement)}</dd>
      </dl>
    </li>
  );
};

/** A connector is active when at least one of its capabilities leaves the machine */
const getActiveConnectorsText = (announcement: AnnounceContent | null) => {
  if (!announcement) return "Wird geladen …";

  const activeCapabilityIds = new Set(
    announcement.local_access_layer.capability_rules
      .filter((rule) => rule.is_on)
      .map((rule) => rule.capability_id),
  );

  return (
    announcement.connectors
      .filter((connector) =>
        connector.capabilities.some((capability) =>
          activeCapabilityIds.has(capability.id),
        ),
      )
      .map((connector) => CONNECTOR_LABELS[connector.id])
      .join(", ") || "Keine"
  );
};

import { formatDate } from "@/modules/common/utils/formatDate";
import type { OwnRuntime } from "@sam-monorepo/application";
import type { AnnounceContent } from "@sam-monorepo/domain";
import { CONNECTOR_LABELS } from "./catalogTexts";

interface Props {
  readonly runtime: OwnRuntime;
}

/** A connected desktop companion of the owner, from its presence */
export const ConnectedDesktopCompanionListItem = ({ runtime }: Props) => {
  return (
    <li className="flex flex-col gap-0.5 py-2 text-sm">
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-2 flex-none rounded-full bg-green-500"
        />
        Online seit {formatDate(runtime.connectedAt)}
      </span>

      <p className="text-xs text-neutral-500">
        Version {runtime.runtimeVersion} · Aktive Connectors:{" "}
        {getActiveConnectorsText(runtime.announcement)}
      </p>
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

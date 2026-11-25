import { CapabilityId, ConnectorId, RuntimeKind } from "@sam-monorepo/domain";

/** The German names of the capabilities of the catalog */
export const CAPABILITY_LABELS: Readonly<Record<CapabilityId, string>> = {
  [CapabilityId.LogEntries]: "Log-Einträge",
};

/** The German names of the connectors of the catalog */
export const CONNECTOR_LABELS: Readonly<Record<ConnectorId, string>> = {
  [ConnectorId.LogFile]: "Log-Datei",
};

export const RUNTIME_KIND_LABELS: Readonly<Record<RuntimeKind, string>> = {
  [RuntimeKind.browser]: "Browser",
};

export const formatCapabilityLabels = (
  capabilityIds: readonly CapabilityId[],
) =>
  capabilityIds
    .map((capabilityId) => CAPABILITY_LABELS[capabilityId])
    .join(", ");

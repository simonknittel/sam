import {
  CAPABILITY_CATALOG,
  CapabilityId,
  CapabilitySensitivity,
  ConnectorId,
  RuntimeKind,
} from "@sam-monorepo/domain";

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

/** What a grantee sees in the data of a capability with the sensitivity "high" */
const HIGH_SENSITIVITY_WARNINGS: Readonly<Record<CapabilityId, string>> = {
  [CapabilityId.LogEntries]:
    "Die Log-Einträge enthalten die Namen anderer Spieler und deinen Standort im Spiel. Wer Zugriff hat, sieht diese Angaben.",
};

/** The warning of the form for a new grant, or null */
export const getSensitivityWarning = (
  capabilityId: CapabilityId,
): string | null => {
  const { sensitivity } = CAPABILITY_CATALOG[capabilityId];

  switch (sensitivity) {
    case CapabilitySensitivity.Normal:
      return null;

    case CapabilitySensitivity.High:
      return HIGH_SENSITIVITY_WARNINGS[capabilityId];

    default:
      throw new Error(
        `Unknown capability sensitivity: ${sensitivity satisfies never}`,
      );
  }
};

export const formatCapabilityLabels = (
  capabilityIds: readonly CapabilityId[],
) =>
  capabilityIds
    .map((capabilityId) => CAPABILITY_LABELS[capabilityId])
    .join(", ");

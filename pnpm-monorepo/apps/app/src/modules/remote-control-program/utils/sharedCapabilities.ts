import type { AnnounceContent } from "@sam-monorepo/domain";

/**
 * The capabilities that leave the machine of a runtime: a connector of the
 * runtime supplies them, and the local access layer of the runtime lets them
 * leave the machine
 */
export const getSharedCapabilityIds = (announcement: AnnounceContent) => {
  const suppliedCapabilityIds = new Set(
    announcement.connectors.flatMap((connector) =>
      connector.capabilities.map((capability) => capability.id),
    ),
  );

  return new Set(
    announcement.local_access_layer.capability_rules
      .filter(
        (rule) => rule.is_on && suppliedCapabilityIds.has(rule.capability_id),
      )
      .map((rule) => rule.capability_id),
  );
};

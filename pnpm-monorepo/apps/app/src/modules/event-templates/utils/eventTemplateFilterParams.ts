import { parseAsString, parseAsStringEnum } from "nuqs/server";

/**
 * Deleted templates stay in the database so they can be restored, so the
 * list defaults to the live ones. The deleted filter doubles as the way to
 * find a template to restore (career flow precedent).
 */
export enum EventTemplateStatus {
  Active = "active",
  Deleted = "deleted",
  All = "all",
}

/** Whether a template is shared with roles at all, not with which ones */
export enum EventTemplateSharing {
  Personal = "personal",
  Shared = "shared",
  All = "all",
}

export const EVENT_TEMPLATE_STATUS_PARAM = "status";
export const EVENT_TEMPLATE_SHARING_PARAM = "sharing";
export const EVENT_TEMPLATE_OWNER_PARAM = "owner";
export const EVENT_TEMPLATE_QUERY_PARAM = "q";

export const eventTemplateStatusParser = parseAsStringEnum(
  Object.values(EventTemplateStatus),
).withDefault(EventTemplateStatus.Active);

export const eventTemplateSharingParser = parseAsStringEnum(
  Object.values(EventTemplateSharing),
).withDefault(EventTemplateSharing.All);

export const eventTemplateFilterParsers = {
  [EVENT_TEMPLATE_STATUS_PARAM]: eventTemplateStatusParser,
  [EVENT_TEMPLATE_SHARING_PARAM]: eventTemplateSharingParser,
  [EVENT_TEMPLATE_OWNER_PARAM]: parseAsString,
  [EVENT_TEMPLATE_QUERY_PARAM]: parseAsString,
};

export interface EventTemplateFilters {
  readonly status: EventTemplateStatus;
  readonly sharing: EventTemplateSharing;
  /** Only applied for `event;manage` holders, so it can never widen a view */
  readonly ownerId: string | null;
  readonly query: string | null;
}

import { parseAsString, parseAsStringEnum } from "nuqs/server";

/**
 * Deleted flows stay in the database so they can be restored, so the
 * management list defaults to the live ones. The deleted filter doubles as
 * the way to find a flow to restore.
 */
export enum FlowStatus {
  Active = "active",
  Deleted = "deleted",
  All = "all",
}

export const FLOW_STATUS_PARAM = "status";
export const FLOW_QUERY_PARAM = "q";

export const flowStatusParser = parseAsStringEnum(
  Object.values(FlowStatus),
).withDefault(FlowStatus.Active);

export const flowFilterParsers = {
  [FLOW_STATUS_PARAM]: flowStatusParser,
  [FLOW_QUERY_PARAM]: parseAsString,
};

import { AuditEventDefinitions, type AuditEventType } from "./AuditEventTypes";

/**
 * Every definition's `message` accepts only its own payload, so indexing the
 * lookup with a runtime string yields a union of functions TypeScript can't
 * call. Rows are read back from a `Json` column and are only as trustworthy
 * as whatever wrote them — including releases whose payload shape has since
 * changed — so the parameter is widened to `unknown` here and the call is
 * guarded below instead.
 */
const definitionsByType = AuditEventDefinitions as Record<
  string,
  { message: (data: unknown) => string } | undefined
>;

/**
 * Renders one audit event for the system log.
 *
 * The system log is the place you go when something has gone wrong, so it
 * must survive its own data: a type no longer in `AuditEventType`, a payload
 * written by an older release, or a `data` column that doesn't parse. Any of
 * those degrades to the raw payload for that single row rather than throwing
 * and taking the whole page down.
 */
export const getAuditEventMessage = (type: string, data: unknown): string => {
  /** `createAuditEvents` stores the payload JSON-encoded inside the column */
  const rawData = typeof data === "string" ? data : JSON.stringify(data);

  let parsedData: unknown;
  try {
    parsedData = typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    return rawData;
  }

  const definition = definitionsByType[type as AuditEventType];
  if (!definition) return rawData;

  try {
    return definition.message(parsedData);
  } catch {
    return rawData;
  }
};

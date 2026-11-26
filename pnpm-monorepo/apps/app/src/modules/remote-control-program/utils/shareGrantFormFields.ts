import type { GrantValidityPreset } from "@sam-monorepo/domain";

/**
 * The fields of the form for a new grant. The form in the browser writes
 * them, and the action `createShareGrant` maps them to the input of the use
 * case.
 */
export enum ShareGrantFormField {
  GranteeKind = "grantee_kind",
  CitizenId = "citizen_id",
  RoleIds = "role_ids",
  CapabilityIds = "capability_ids",
  /** A `ShareGrantValidityChoice` */
  Validity = "validity",
  /** A wall time in the time zone of the organization */
  StartsAt = "starts_at",
  /** A wall time in the time zone of the organization. Empty: no end. */
  EndsAt = "ends_at",
}

/** The value of `ShareGrantFormField.Validity` in addition to the presets */
export enum CustomValidityChoice {
  /** A start and an end of the owner */
  Custom = "custom",
}

/** A value of `ShareGrantFormField.Validity` */
export type ShareGrantValidityChoice =
  GrantValidityPreset | CustomValidityChoice;

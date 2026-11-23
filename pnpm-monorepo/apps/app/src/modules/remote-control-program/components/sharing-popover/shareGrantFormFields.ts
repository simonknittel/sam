/**
 * The fields of the form for a new grant. The form in the browser writes
 * them, and the action `createShareGrant` maps them to the input of the use
 * case.
 */
export enum ShareGrantFormField {
  GranteeKind = "grantee_kind",
  CitizenId = "citizen_id",
  RoleId = "role_id",
  CapabilityIds = "capability_ids",
  /** A `GrantValidityPreset`, or `CUSTOM_VALIDITY_CHOICE` */
  Validity = "validity",
  /** A wall time in the time zone of the organization */
  StartsAt = "starts_at",
  /** A wall time in the time zone of the organization. Empty: no end. */
  EndsAt = "ends_at",
}

/** The value of `ShareGrantFormField.Validity` for a start and an end of the owner */
export const CUSTOM_VALIDITY_CHOICE = "custom";

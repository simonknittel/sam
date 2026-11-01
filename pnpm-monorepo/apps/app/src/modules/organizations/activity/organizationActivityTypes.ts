export enum OrganizationActivitySourceKey {
  Created = "organization-created",
  Renamed = "organization-renamed",
  Membership = "organization-membership",
}

/** The labels of the activity type filter and of the type column. */
export const ORGANIZATION_ACTIVITY_TYPE_LABELS: Record<
  OrganizationActivitySourceKey,
  string
> = {
  [OrganizationActivitySourceKey.Created]: "Organisation erstellt",
  [OrganizationActivitySourceKey.Renamed]: "Organisation umbenannt",
  [OrganizationActivitySourceKey.Membership]: "Mitgliedschaft",
};

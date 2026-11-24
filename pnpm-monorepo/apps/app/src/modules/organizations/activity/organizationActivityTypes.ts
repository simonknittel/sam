export enum OrganizationActivitySourceKey {
  Created = "organization-created",
  Renamed = "organization-renamed",
  Membership = "organization-membership",
}

export const ORGANIZATION_ACTIVITY_TYPE_LABELS: Record<
  OrganizationActivitySourceKey,
  string
> = {
  [OrganizationActivitySourceKey.Created]: "Organisation erstellt",
  [OrganizationActivitySourceKey.Renamed]: "Organisation umbenannt",
  [OrganizationActivitySourceKey.Membership]: "Mitgliedschaft",
};

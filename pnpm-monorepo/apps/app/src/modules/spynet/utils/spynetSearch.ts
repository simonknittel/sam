import type { Entity, Organization } from "@sam-monorepo/database/browser";

export const SPYNET_SEARCH_QUERY_MINIMUM_LENGTH = 2;

/** The longest stored name has 53 characters (an organization) */
export const SPYNET_SEARCH_QUERY_MAXIMUM_LENGTH = 60;

export const SPYNET_SEARCH_DEFAULT_LIMIT = 10;

export const SPYNET_SEARCH_MAXIMUM_LIMIT = 20;

export enum SpynetSearchHitType {
  Citizen = "citizen",
  Organization = "organization",
}

export type CitizenSearchHit = Readonly<
  Pick<
    Entity,
    "id" | "handle" | "communityMoniker" | "citizenId" | "spectrumId"
  >
> & { readonly type: SpynetSearchHitType.Citizen };

export type OrganizationSearchHit = Readonly<
  Pick<Organization, "id" | "name" | "spectrumId">
> & { readonly type: SpynetSearchHitType.Organization };

export type SpynetSearchHit = CitizenSearchHit | OrganizationSearchHit;

export const getSpynetSearchHitHref = (hit: SpynetSearchHit) => {
  switch (hit.type) {
    case SpynetSearchHitType.Citizen:
      return `/app/spynet/citizen/${hit.id}`;

    case SpynetSearchHitType.Organization:
      return `/app/spynet/organization/${hit.id}`;

    default:
      throw new Error(`Unknown hit type: ${hit satisfies never}`);
  }
};

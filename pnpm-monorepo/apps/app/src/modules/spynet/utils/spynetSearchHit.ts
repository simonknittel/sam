export enum SpynetSearchHitType {
  Citizen = "citizen",
  Organization = "organization",
}

export interface CitizenSearchHit {
  readonly type: SpynetSearchHitType.Citizen;
  readonly id: string;
  readonly handle: string | null;
  readonly communityMoniker: string | null;
  readonly citizenId: string | null;
  readonly spectrumId: string | null;
}

export interface OrganizationSearchHit {
  readonly type: SpynetSearchHitType.Organization;
  readonly id: string;
  readonly name: string;
  readonly spectrumId: string;
}

export type SpynetSearchHit = CitizenSearchHit | OrganizationSearchHit;

export const getSpynetSearchHitHref = (hit: SpynetSearchHit) => {
  switch (hit.type) {
    case SpynetSearchHitType.Citizen:
      return `/app/spynet/citizen/${hit.id}` as const;

    case SpynetSearchHitType.Organization:
      return `/app/spynet/organization/${hit.id}` as const;

    default:
      throw new Error(`Unknown hit type: ${hit satisfies never}`);
  }
};

import {
  SpynetSearchHitType,
  type CitizenSearchHit,
  type OrganizationSearchHit,
  type SpynetSearchHit,
} from "../utils/spynetSearch";

interface Props {
  readonly hit: SpynetSearchHit;
}

/**
 * The content of one hit of the Spynet search. The tile and the Cmd+K search
 * put it into their own interactive element.
 */
export const SpynetSearchHitContent = ({ hit }: Props) => {
  switch (hit.type) {
    case SpynetSearchHitType.Citizen:
      return <CitizenHitContent hit={hit} />;

    case SpynetSearchHitType.Organization:
      return <OrganizationHitContent hit={hit} />;

    default:
      throw new Error(`Unknown hit type: ${hit satisfies never}`);
  }
};

interface CitizenHitContentProps {
  readonly hit: CitizenSearchHit;
}

const CitizenHitContent = ({ hit }: CitizenHitContentProps) => {
  return (
    <span className="flex flex-col w-full min-w-0">
      {hit.handle ? (
        <span className="truncate" title={hit.handle}>
          {hit.handle}
        </span>
      ) : (
        <span className="italic text-neutral-500">Unbekannt</span>
      )}

      <span className="text-sm text-neutral-500">
        {hit.communityMoniker && (
          <HitDetail label="Community Moniker" value={hit.communityMoniker} />
        )}
        {hit.spectrumId && (
          <HitDetail label="Spectrum ID" value={hit.spectrumId} />
        )}
        {hit.citizenId && (
          <HitDetail label="Citizen ID" value={hit.citizenId} />
        )}
        <HitDetail label="Internal ID" value={hit.id} />
      </span>
    </span>
  );
};

interface OrganizationHitContentProps {
  readonly hit: OrganizationSearchHit;
}

const OrganizationHitContent = ({ hit }: OrganizationHitContentProps) => {
  return (
    <span className="flex flex-col w-full min-w-0">
      <span className="truncate" title={hit.name}>
        {hit.name}
      </span>

      <span className="text-sm text-neutral-500">
        <HitDetail label="Spectrum ID" value={hit.spectrumId} />
        <HitDetail label="Internal ID" value={hit.id} />
      </span>
    </span>
  );
};

interface HitDetailProps {
  readonly label: string;
  readonly value: string;
}

const HitDetail = ({ label, value }: HitDetailProps) => {
  const text = `${label}: ${value}`;

  return (
    <span className="block truncate" title={text}>
      {text}
    </span>
  );
};

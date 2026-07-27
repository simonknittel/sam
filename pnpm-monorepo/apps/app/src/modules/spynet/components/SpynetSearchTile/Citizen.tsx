import { Link } from "@/modules/common/components/Link";
import { type CitizenHit } from "./Search";

interface Props {
  readonly hit: CitizenHit;
}

export const Citizen = ({ hit }: Props) => {
  return (
    <Link href={`/app/spynet/citizen/${hit.objectID}`}>
      {hit.handles && hit.handles.length > 0 ? (
        <span className="flex gap-2 items-baseline">
          <p>{hit.handles[0]}</p>

          {hit.handles.length > 1 && (
            <p className="text-neutral-500 text-sm">
              {hit.handles.slice(1).join(", ")}
            </p>
          )}
        </span>
      ) : (
        <p className="italic text-neutral-500">Unbekannt</p>
      )}

      <span className="block text-sm text-neutral-500 mt-2">
        {hit.communityMonikers && hit.communityMonikers.length > 0 && (
          <p>Community Monikers: {hit.communityMonikers.join(", ")}</p>
        )}

        <p>Spectrum ID: {hit.spectrumId}</p>

        {hit.citizenIds && hit.citizenIds.length > 0 && (
          <p>Citizen IDs: {hit.citizenIds.join(", ")}</p>
        )}

        <p>Internal ID: {hit.objectID}</p>
      </span>
    </Link>
  );
};

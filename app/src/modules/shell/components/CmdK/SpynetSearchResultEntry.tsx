import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { type Hit } from "../../../spynet/components/SpynetSearchTile/Search";

interface Props {
  readonly hit: Hit;
  readonly onSelect?: () => void;
}

export const SpynetSearchResultEntry = ({ hit, onSelect }: Props) => {
  const router = useRouter();

  if (hit.type === "citizen") {
    return (
      <Command.Item
        onSelect={() => {
          router.push(`/app/spynet/citizen/${hit.objectID}`);
          onSelect?.();
        }}
        className="flex flex-col !gap-0"
      >
        {hit.handles && hit.handles.length > 0 ? (
          <span className="flex gap-2 items-baseline w-full">
            <p>{hit.handles[0]}</p>

            {hit.handles.length > 1 && (
              <p className="text-neutral-500 text-sm">
                {hit.handles.slice(1).join(", ")}
              </p>
            )}
          </span>
        ) : (
          <p className="italic text-neutral-500 w-full">Unbekannt</p>
        )}

        <span className="block text-sm text-neutral-500 w-full">
          {hit.communityMonikers && hit.communityMonikers.length > 0 && (
            <p>Community Monikers: {hit.communityMonikers.join(", ")}</p>
          )}

          <p>Spectrum ID: {hit.spectrumId}</p>

          {hit.citizenIds && hit.citizenIds.length > 0 && (
            <p>Citizen IDs: {hit.citizenIds.join(", ")}</p>
          )}

          <p>Internal ID: {hit.objectID}</p>
        </span>
      </Command.Item>
    );
  } else if (hit.type === "organization") {
    return (
      <Command.Item
        onSelect={() => {
          router.push(`/app/spynet/organization/${hit.objectID}`);
          onSelect?.();
        }}
        className="flex flex-col !gap-0"
      >
        <span className="flex gap-2 items-baseline w-full">
          <p>{hit.names[0]}</p>

          {hit.names.length > 1 && (
            <p className="text-neutral-500 text-sm">
              {hit.names.slice(1).join(", ")}
            </p>
          )}
        </span>

        <span className="block text-sm text-neutral-500 w-full">
          <p>Spectrum ID: {hit.spectrumId}</p>

          <p>Internal ID: {hit.objectID}</p>
        </span>
      </Command.Item>
    );
  }
};

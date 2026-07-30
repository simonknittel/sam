import { Link } from "@/modules/common/components/Link";
import { type OrganizationHit } from "./Search";

interface Props {
  hit: OrganizationHit;
}

export const Organization = ({ hit }: Readonly<Props>) => {
  return (
    <Link href={`/app/spynet/organization/${hit.objectID}`}>
      <span className="flex gap-2 items-baseline w-full">
        <p>{hit.names[0]}</p>

        {hit.names.length > 1 && (
          <p className="text-neutral-500 text-sm">
            {hit.names.slice(1).join(", ")}
          </p>
        )}
      </span>

      <span className="block text-sm text-neutral-500 mt-2">
        <p>Spectrum ID: {hit.spectrumId}</p>

        <p>Internal ID: {hit.objectID}</p>
      </span>
    </Link>
  );
};

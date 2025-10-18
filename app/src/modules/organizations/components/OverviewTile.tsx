import { RSIButton } from "@/modules/common/components/RSIButton";
import { getOrganizationById } from "@/modules/organizations/queries";
import clsx from "clsx";
import Image from "next/image";

interface Props {
  readonly className?: string;
  readonly id: string;
}

export const OverviewTile = async ({ className, id }: Props) => {
  const organization = await getOrganizationById(id);
  if (!organization) throw new Error("Organization not found");

  return (
    <section className={clsx(className, "rounded-primary overflow-hidden")}>
      {organization.logo && (
        <div className="bg-black flex items-center justify-center p-2">
          <Image
            src={`https://robertsspaceindustries.com${organization.logo}`}
            alt=""
            width={128}
            height={128}
          />
        </div>
      )}

      <div className={clsx("p-4 lg:p-8 bg-neutral-800/50")}>
        <h2 className="font-bold">Übersicht</h2>

        <dl className="mt-4">
          <dt className="text-neutral-500">Name</dt>
          <dd>{organization.name}</dd>

          <dt className="text-neutral-500 mt-4">Spectrum ID</dt>
          <dd>{organization.spectrumId}</dd>

          <dt className="text-neutral-500 mt-4">Internal ID</dt>
          <dd>{organization.id}</dd>
        </dl>

        <RSIButton
          className="mt-4"
          href={`https://robertsspaceindustries.com/orgs/${organization.spectrumId}`}
        />
      </div>
    </section>
  );
};

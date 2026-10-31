import { Link } from "@/modules/common/components/Link";
import type { Organization } from "@sam-monorepo/database/client";
import { getOrganizationLogoUrl } from "@sam-monorepo/domain";
import clsx from "clsx";
import Image from "next/image";

interface Props {
  readonly className?: string;
  readonly organization: Pick<Organization, "id" | "name" | "logo">;
}

export const OrganizationLink = ({ className, organization }: Props) => {
  const logoUrl = getOrganizationLogoUrl(organization.logo);

  return (
    <Link
      href={`/app/spynet/organization/${organization.id}`}
      className={clsx(
        "inline-flex items-center gap-1 align-bottom text-interaction-500 hover:text-interaction-300 hover:underline",
        className,
      )}
      prefetch={false}
    >
      {logoUrl && (
        /**
         * The logo (24 px) is higher than a line of text. The negative
         * margins keep the link one line high, thus the name stays on the
         * baseline of the surrounding text.
         */
        <span className="my-[calc((1lh_-_24px)/2)] rounded-secondary bg-black">
          <Image src={logoUrl} alt="" width={24} height={24} />
        </span>
      )}

      <span className="truncate" title={organization.name}>
        {organization.name}
      </span>
    </Link>
  );
};

import { Link } from "@/modules/common/components/Link";
import type { Organization } from "@sam-monorepo/database/client";
import clsx from "clsx";
import Image from "next/image";

/** Organization logos are hotlinked from where the orgs are scraped from. */
const LOGO_BASE_URL = "https://robertsspaceindustries.com";

interface Props {
  readonly className?: string;
  readonly organization: Pick<Organization, "id" | "name" | "logo">;
}

export const OrganizationLink = ({ className, organization }: Props) => {
  return (
    <Link
      href={`/app/spynet/organization/${organization.id}`}
      className={clsx(
        "inline-flex gap-1 items-center align-bottom text-interaction-500 hover:text-interaction-300 hover:underline",
        className,
      )}
      prefetch={false}
    >
      {organization.logo && (
        <span className="inline-block rounded-secondary bg-black">
          <Image
            src={`${LOGO_BASE_URL}${organization.logo}`}
            alt=""
            width={24}
            height={24}
          />
        </span>
      )}

      <span className="truncate">{organization.name}</span>
    </Link>
  );
};

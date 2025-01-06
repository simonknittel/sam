import { requireAuthentication } from "@/auth/server";
import { Link } from "@/common/components/Link";
import { type Organization } from "@prisma/client";
import Image from "next/image";

export const mapOrganizationEntries = async (
  entries: Array<Pick<Organization, "id" | "createdAt" | "name" | "logo">>,
) => {
  const authentication = await requireAuthentication();
  if (!(await authentication.authorize("organization", "read"))) return [];

  return entries.map((entry) => ({
    key: `${entry.id}-${entry.createdAt.getTime()}`,
    date: entry.createdAt,
    message: (
      <p>
        Organisation{" "}
        <Link
          href={`/app/spynet/organization/${entry.id}`}
          className="text-sinister-red-500 hover:text-sinister-red-300"
        >
          {entry.logo && (
            <span className="inline-block rounded bg-black mr-1 align-bottom">
              <Image
                src={`https://robertsspaceindustries.com${entry.logo}`}
                alt=""
                width={24}
                height={24}
              />
            </span>
          )}
          {entry.name}
        </Link>{" "}
        erstellt
      </p>
    ),
  }));
};

import { requireAuthentication } from "@/auth/server";
import { Link } from "@/common/components/Link";
import { type OrganizationAttributeHistoryEntry } from "@prisma/client";

export const mapOrganizationAttributeHistoryEntries = async (
  entries: Pick<
    OrganizationAttributeHistoryEntry,
    | "id"
    | "organizationId"
    | "createdAt"
    | "attributeKey"
    | "oldValue"
    | "newValue"
  >[],
) => {
  const authentication = await requireAuthentication();
  if (!(await authentication.authorize("organization", "read"))) return [];

  return entries
    .filter((entry) => !(entry.attributeKey === "name" && !entry.oldValue)) // Filter out initial name
    .map((entry) => {
      switch (entry.attributeKey) {
        case "name":
          return {
            key: entry.id,
            date: entry.createdAt,
            message: (
              <p>
                Organisation unbenannt in{" "}
                <Link
                  href={`/app/spynet/organization/${entry.organizationId}`}
                  className=" text-sinister-red-500 hover:text-sinister-red-300"
                >
                  {entry.newValue}{" "}
                </Link>
              </p>
            ),
          };

        default:
          throw new Error(`Unknown attribute key: ${entry.attributeKey}`);
      }
    });
};

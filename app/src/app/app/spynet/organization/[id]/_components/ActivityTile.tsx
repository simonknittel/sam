import { requireAuthentication } from "@/auth/server";
import styles from "@/common/components/ConfirmationGradient.module.css";
import { prisma } from "@/db";
import {
  ConfirmationStatus,
  OrganizationMembershipType,
  OrganizationMembershipVisibility,
} from "@prisma/client";
import clsx from "clsx";
import Link from "next/link";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { FaInfoCircle, FaListAlt } from "react-icons/fa";
import { TbCircleDot } from "react-icons/tb";
import { ConfirmMembership } from "./ConfirmMembership";

type Props = Readonly<{
  className?: string;
  id: string;
}>;

export const ActivityTile = async ({ className, id }: Props) => {
  const authentication = await requireAuthentication();
  if (!(await authentication.authorize("organization", "read")))
    throw new Error("Forbidden");

  const alsoVisibilityRedacted = await authentication.authorize(
    "organizationMembership",
    "read",
    [
      {
        key: "alsoVisibilityRedacted",
        value: true,
      },
    ],
  );

  const canConfirm = await authentication.authorize(
    "organizationMembership",
    "confirm",
  );

  const organization = await prisma.organization.findUnique({
    where: {
      id,
    },
    select: {
      createdAt: true,
      attributeHistoryEntries: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          attributeKey: true,
          createdAt: true,
          oldValue: true,
          newValue: true,
        },
      },
      membershipHistoryEntries: {
        where: {
          visibility: {
            in: alsoVisibilityRedacted
              ? [
                  OrganizationMembershipVisibility.PUBLIC,
                  OrganizationMembershipVisibility.REDACTED,
                ]
              : [OrganizationMembershipVisibility.PUBLIC],
          },
          confirmed: canConfirm ? undefined : ConfirmationStatus.CONFIRMED,
        },
        orderBy: {
          createdAt: "asc",
        },
        include: {
          citizen: true,
        },
      },
    },
  });
  if (!organization) throw new Error("Organization not found");

  const entries = [
    {
      key: "created",
      date: organization.createdAt,
      confirmed: true,
      /**
       * We can use `!` here since it's guaranteed that the first entry exists because it will always get created with the creation of the organization.
       */
      message: (
        <p>
          Erstellt unter dem Namen{" "}
          <em>{organization.attributeHistoryEntries[0].newValue}</em>
        </p>
      ),
    },
    ...organization.attributeHistoryEntries
      .filter((entry) => !(entry.attributeKey === "name" && !entry.oldValue)) // Filter out initial name
      .map((entry) => {
        switch (entry.attributeKey) {
          case "name":
            return {
              key: entry.id,
              date: entry.createdAt,
              confirmed: true, // TODO: Here is no mechanism to even change the name yet
              message: (
                <p>
                  Unbenannt in <em>{entry.newValue}</em>
                </p>
              ),
            };

          default:
            throw new Error(`Unknown attribute key: ${entry.attributeKey}`);
        }
      }),
    ...organization.membershipHistoryEntries.map((entry) => {
      switch (entry.type) {
        case OrganizationMembershipType.MAIN:
          return {
            key: entry.id,
            date: entry.createdAt,
            confirmed: canConfirm ? entry.confirmed : true,
            originalEntry: entry,
            message: (
              <p>
                <Link
                  href={`/app/spynet/entity/${entry.citizen.id}`}
                  className="text-sinister-red-500 hover:text-sinister-red-300"
                >
                  {entry.citizen.handle}
                </Link>{" "}
                wurde als <em>Main</em> hinzugefügt
              </p>
            ),
          };

        case OrganizationMembershipType.AFFILIATE:
          return {
            key: entry.id,
            date: entry.createdAt,
            confirmed: canConfirm ? entry.confirmed : true,
            originalEntry: entry,
            message: (
              <p>
                <Link
                  href={`/app/spynet/entity/${entry.citizen.id}`}
                  className="text-sinister-red-500 hover:text-sinister-red-300 mr-1"
                >
                  {entry.citizen.handle}
                </Link>{" "}
                wurde als <em>Affiliate</em> hinzugefügt
              </p>
            ),
          };

        case OrganizationMembershipType.LEFT:
          return {
            key: entry.id,
            date: entry.createdAt,
            confirmed: canConfirm ? entry.confirmed : true,
            originalEntry: entry,
            message: (
              <p>
                <Link
                  href={`/app/spynet/entity/${entry.citizen.id}`}
                  className="text-sinister-red-500 hover:text-sinister-red-300"
                >
                  {entry.citizen.handle}
                </Link>{" "}
                wurde entfernt
              </p>
            ),
          };
      }
    }),
  ];

  // Sort entries by date in descending order
  const sortedEntries = entries.toSorted(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );

  return (
    <section
      className={clsx(className, "rounded-2xl p-4 lg:p-8 bg-neutral-800/50")}
    >
      <h2 className="font-bold flex gap-2 items-center">
        <FaListAlt /> Aktivität
      </h2>

      {sortedEntries.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-8">
          {sortedEntries.map((entry) => (
            <li key={entry.key} className="relative rounded overflow-hidden">
              <div
                className={clsx({
                  "absolute w-full h-24 border-t-2 border-x-2 bg-gradient-to-t from-neutral-900/0":
                    !entry.confirmed ||
                    entry.confirmed === ConfirmationStatus.FALSE_REPORT,
                  [`${styles.blueBorder} to-blue-500/10`]: !entry.confirmed,
                  [`${styles.redBorder} to-red-500/10`]:
                    entry.confirmed === ConfirmationStatus.FALSE_REPORT,
                })}
              />

              {!entry.confirmed && (
                <div className="px-4 pt-4 flex gap-2 relative z-10 items-start">
                  <FaInfoCircle className="text-blue-500 grow-1 shrink-0 mt-[2px]" />
                  <div className="flex gap-2 lg:gap-4 flex-wrap">
                    <p className="font-bold text-sm">Unbestätigt</p>
                    {"originalEntry" in entry && (
                      <ConfirmMembership entry={entry.originalEntry} />
                    )}
                  </div>
                </div>
              )}

              {entry.confirmed === ConfirmationStatus.FALSE_REPORT && (
                <div className="px-4 pt-4 flex items-start gap-2 relative z-10">
                  <BsExclamationOctagonFill className="text-red-500 grow-1 shrink-0 mt-1" />
                  <p className="font-bold">Falschmeldung</p>
                </div>
              )}

              <div
                className={clsx("flex gap-2 relative z-10", {
                  "px-4 pt-4 opacity-20 hover:opacity-100 transition-opacity":
                    !entry.confirmed ||
                    entry.confirmed === ConfirmationStatus.FALSE_REPORT,
                })}
              >
                <div className="h-[20px] flex items-center">
                  <TbCircleDot />
                </div>

                <div className="flex-1">
                  <div className="text-sm flex gap-2 border-b pb-2 mb-2 items-center border-neutral-800/50 flex-wrap text-neutral-500">
                    <p>
                      <time dateTime={entry.date.toISOString()}>
                        {entry.date.toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          timeZone: "Europe/Berlin",
                        })}
                      </time>
                    </p>
                  </div>

                  <div>{entry.message}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-neutral-500 mt-4">Keine Aktivität</p>
      )}
    </section>
  );
};

import { prisma } from "@/db";
import { type PermissionSet } from "@/modules/auth/PermissionSet";
import { requireAuthentication } from "@/modules/auth/server";
import styles from "@/modules/common/components/ConfirmationGradient.module.css";
import { Link } from "@/modules/common/components/Link";
import { formatDate } from "@/modules/common/utils/formatDate";
import getLatestNoteAttributes from "@/modules/common/utils/getLatestNoteAttributes";
import {
  type Entity,
  type EntityLog,
  type EntityLogAttribute,
  type Organization,
} from "@prisma/client";
import clsx from "clsx";
import Image from "next/image";
import { Suspense, type ReactNode } from "react";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { FaInfoCircle } from "react-icons/fa";
import { TbCircleDot } from "react-icons/tb";
import ConfirmLog from "../ConfirmLog";
import { DeleteLog } from "../DeleteLog";
import { ClassificationLevel } from "./ClassificationLevel";
import ClassificationLevelSkeleton from "./ClassificationLevelSkeleton";
import { UpdateNote } from "./UpdateNote";

interface Props {
  readonly note: EntityLog & {
    attributes: EntityLogAttribute[];
  };
}

export const SingleNote = async ({ note }: Props) => {
  const authentication = await requireAuthentication();

  const { noteTypeId, classificationLevelId, confirmed } =
    getLatestNoteAttributes(note);

  // @ts-expect-error The authorization types need to get overhauled
  const authorizationAttributes: PermissionSet["attributes"] = [
    ...(noteTypeId ? [{ key: "noteTypeId", value: noteTypeId.value }] : []),
    ...(classificationLevelId
      ? [{ key: "classificationLevelId", value: classificationLevelId.value }]
      : []),
    ...(!confirmed || confirmed.value !== "confirmed"
      ? [{ key: "alsoUnconfirmed", value: true }]
      : []),
  ];

  let content: ReactNode = note.content;
  const matches = note.content?.match(/@citizen:(\d+)|@org:([a-zA-Z]+)/g);
  if (matches) {
    const uniqueCitizenSpectrumIds = new Set<string>(
      matches
        .filter((match) => match.startsWith("@citizen:"))
        .map((match) => match.slice(9)),
    );

    const uniqueOrganizationSpectrumIds = new Set<Organization["spectrumId"]>(
      matches
        .filter((match) => match.startsWith("@org:"))
        .map((match) => match.slice(5)),
    );

    let citizens: Pick<Entity, "handle" | "spectrumId" | "id">[] = [];
    let organizations: Pick<
      Organization,
      "name" | "spectrumId" | "id" | "logo"
    >[] = [];

    if (uniqueCitizenSpectrumIds.size > 0) {
      const result = await prisma.$transaction([
        prisma.entity.findMany({
          where: {
            spectrumId: {
              in: Array.from(uniqueCitizenSpectrumIds),
            },
          },
          select: {
            handle: true,
            spectrumId: true,
            id: true,
          },
        }),

        prisma.organization.findMany({
          where: {
            spectrumId: {
              in: Array.from(uniqueOrganizationSpectrumIds),
            },
          },
          select: {
            name: true,
            spectrumId: true,
            id: true,
            logo: true,
          },
        }),
      ]);

      citizens = result[0];
      organizations = result[1];
    }

    content = note.content
      ?.split(/(@citizen:\d+)|(@org:[a-zA-Z]+)/g)
      .filter((part) => part !== undefined)
      .map((part, index) => {
        const citizenMatch = /@citizen:(\d+)/.exec(part);
        const organizationMatch = /@org:([a-zA-Z]+)/.exec(part);

        if (citizenMatch?.[1]) {
          const citizen = citizens.find(
            (citizen) => citizen.spectrumId === citizenMatch[1],
          );
          if (!citizen) return part;

          return (
            <Link
              href={`/app/spynet/citizen/${citizen.id}`}
              className="text-brand-red-500 hover:text-brand-red-300"
              key={index}
            >
              {citizen.handle || citizen.spectrumId}
            </Link>
          );
        } else if (organizationMatch?.[1]) {
          const organization = organizations.find(
            (organization) => organization.spectrumId === organizationMatch[1],
          );
          if (!organization) return part;

          return (
            <Link
              href={`/app/spynet/organization/${organization.id}`}
              className="text-brand-red-500 hover:text-brand-red-300"
              key={index}
            >
              {organization.logo && (
                <span className="inline-block rounded-secondary bg-black mr-1 align-bottom">
                  <Image
                    src={`https://robertsspaceindustries.com${organization.logo}`}
                    alt=""
                    width={24}
                    height={24}
                    loading="lazy"
                  />
                </span>
              )}
              {organization.name || organization.spectrumId}
            </Link>
          );
        } else {
          return part;
        }
      });
  }

  const showConfirm = await authentication.authorize(
    "note",
    "confirm",
    authorizationAttributes,
  );
  const showUpdate = await authentication.authorize(
    "note",
    "update",
    authorizationAttributes,
  );
  const showDelete = await authentication.authorize(
    "note",
    "delete",
    authorizationAttributes,
  );

  return (
    <article className="mt-4 lg:mt-8 relative rounded-secondary overflow-hidden">
      <div
        className={clsx({
          "absolute w-full h-24 border-t-2 border-x-2 bg-gradient-to-t from-neutral-900/0":
            !confirmed || confirmed?.value === "false-report",
          [`${styles.blueBorder} to-blue-500/10`]: !confirmed,
          [`${styles.redBorder} to-red-500/10`]:
            confirmed?.value === "false-report",
        })}
      />

      {!confirmed && (
        <div className="px-4 pt-4 flex gap-2 relative z-10 items-start">
          <FaInfoCircle className="text-blue-500 grow-1 shrink-0 mt-[2px]" />
          <div className="flex gap-2 lg:gap-4 flex-wrap">
            <p className="font-bold text-sm">Unbestätigt</p>

            {showConfirm && <ConfirmLog log={note} />}
          </div>
        </div>
      )}

      {confirmed?.value === "false-report" && (
        <div className="px-4 pt-4 flex items-start gap-2 relative z-10">
          <BsExclamationOctagonFill className="text-red-500 grow-1 shrink-0 mt-1" />
          <p className="font-bold">Falschmeldung</p>
        </div>
      )}

      <div
        className={clsx("flex gap-2 relative z-10", {
          "px-4 pt-4 opacity-20 hover:opacity-100 transition-opacity":
            !confirmed || confirmed.value === "false-report",
        })}
      >
        <div className="h-[20px] flex items-center">
          <TbCircleDot />
        </div>

        <div className="flex-1">
          <div className="text-sm flex gap-2 border-b pb-2 items-center border-neutral-800/50 flex-wrap text-neutral-500">
            <p>
              <time dateTime={note.createdAt.toISOString()}>
                {formatDate(note.createdAt)}
              </time>
            </p>

            <span>&bull;</span>

            <Suspense fallback={<ClassificationLevelSkeleton />}>
              <ClassificationLevel note={note} />
            </Suspense>

            {/* TODO: Introduce permission to see submittedBy and confirmedBy */}
            {/* <span>&bull;</span>
            <p>Eingereicht von {note.submittedBy.name}</p>

            {confirmed && (
              <>
                <span>&bull;</span>
                <p>Bestätigt von {confirmed.createdBy.name}</p>
              </>
            )} */}

            {showUpdate && (
              <Suspense>
                <UpdateNote note={note} />
              </Suspense>
            )}

            {showDelete && (
              <>
                <span>&bull;</span>
                <DeleteLog log={note} />
              </>
            )}
          </div>

          <div className="mt-2">
            <pre className="font-sans whitespace-pre-wrap">{content}</pre>
          </div>
        </div>
      </div>
    </article>
  );
};

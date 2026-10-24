import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { Link } from "@/modules/common/components/Link";
import { formatDate } from "@/modules/common/utils/formatDate";
import {
  findNoteMentionTargets,
  getNotePermissionAttributes,
  type CitizenNoteRow,
  type NoteMentionTargets,
} from "@sam-monorepo/application";
import { ConfirmationStatus } from "@sam-monorepo/database/client";
import {
  CITIZEN_MENTION_PATTERN,
  DELETED_CITIZEN_LABEL,
  getOrganizationLogoUrl,
  NOTE_MENTION_PATTERN,
  ORGANIZATION_MENTION_PATTERN,
} from "@sam-monorepo/domain";
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
  readonly note: CitizenNoteRow;
}

export const SingleNote = async ({ note }: Props) => {
  const authentication = await requireAuthenticationPage();

  const isUnconfirmed = note.confirmed === null;
  const isFalseReport = note.confirmed === ConfirmationStatus.FALSE_REPORT;
  const authorizationAttributes = getNotePermissionAttributes(note);
  /** The client components get only the fields that they read */
  const log = { id: note.id, citizenId: note.citizenId };

  let content: ReactNode = note.content;
  if (note.content?.match(NOTE_MENTION_PATTERN)) {
    let mentionTargets: NoteMentionTargets;
    try {
      mentionTargets = await findNoteMentionTargets(
        getApplicationContext(),
        await getRequestActor(),
        { content: note.content },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
    const { citizens, organizations } = mentionTargets;

    content = note.content
      .split(NOTE_MENTION_PATTERN)
      .filter((part) => part !== undefined)
      .map((part, index) => {
        const citizenMatch = CITIZEN_MENTION_PATTERN.exec(part);
        const organizationMatch = ORGANIZATION_MENTION_PATTERN.exec(part);

        if (citizenMatch?.[1]) {
          const citizen = citizens.find(
            (citizen) => citizen.spectrumId === citizenMatch[1],
          );
          if (!citizen) return part;

          if (citizen.deletedAt)
            return (
              <span className="text-neutral-500" key={index}>
                {DELETED_CITIZEN_LABEL}
              </span>
            );

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

          const logoUrl = getOrganizationLogoUrl(organization.logo);

          return (
            <Link
              href={`/app/spynet/organization/${organization.id}`}
              className="text-brand-red-500 hover:text-brand-red-300"
              key={index}
            >
              {logoUrl && (
                <span className="mr-1 inline-block rounded-secondary bg-black align-bottom">
                  <Image
                    src={logoUrl}
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
    <article className="relative mt-4 overflow-hidden rounded-secondary lg:mt-8">
      <div
        className={clsx({
          "absolute h-24 w-full border-x-2 border-t-2 bg-linear-to-t from-neutral-900/0":
            isUnconfirmed || isFalseReport,
          "to-blue-500/10 border-fade-blue-500": isUnconfirmed,
          "to-red-500/10 border-fade-red-500": isFalseReport,
        })}
      />

      {isUnconfirmed && (
        <div className="relative z-10 flex items-start gap-2 px-4 pt-4">
          <FaInfoCircle className="mt-0.5 shrink-0 text-blue-500" />
          <div className="flex flex-wrap gap-2 lg:gap-4">
            <p className="text-sm font-bold">Unbestätigt</p>

            {showConfirm && <ConfirmLog log={log} />}
          </div>
        </div>
      )}

      {isFalseReport && (
        <div className="relative z-10 flex items-start gap-2 px-4 pt-4">
          <BsExclamationOctagonFill className="mt-1 shrink-0 text-red-500" />
          <p className="font-bold">Falschmeldung</p>
        </div>
      )}

      <div
        className={clsx("relative z-10 flex gap-2", {
          "px-4 pt-4 opacity-20 transition-opacity hover:opacity-100":
            isUnconfirmed || isFalseReport,
        })}
      >
        <div className="flex h-5 items-center">
          <TbCircleDot />
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800/50 pb-2 text-sm text-neutral-500">
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

            {showUpdate && (
              <Suspense>
                <UpdateNote note={note} withBullet />
              </Suspense>
            )}

            {showDelete && (
              <>
                <span>&bull;</span>
                <DeleteLog log={log} />
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

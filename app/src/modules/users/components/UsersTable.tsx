"use client";

import { type Entity, type User } from "@/generated/prisma/browser";
import { CitizenPopover } from "@/modules/citizen/components/CitizenPopover";
import Avatar from "@/modules/common/components/Avatar";
import { Link } from "@/modules/common/components/Link";
import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import { VerifyEmailButton } from "@/modules/users/components/VerifyEmailButton";
import clsx from "clsx";
import { FaExternalLinkAlt } from "react-icons/fa";

const TABLE_MIN_WIDTH = "min-w-200";
const GRID_COLS =
  "grid-cols-[240px_240px_150px_200px_150px_24px] sm:grid-cols-[240px_240px_150px_200px_150px_128px]";

interface Props {
  readonly className?: string;
  readonly users: {
    readonly user: User;
    readonly discordId: string;
    readonly entity?: Entity;
  }[];
}

export const UsersTable = ({ className, users }: Props) => {
  return (
    <Table className={className} tableClassName={TABLE_MIN_WIDTH}>
      <THead className={GRID_COLS}>
        <th>Discord ID</th>
        <th>User ID</th>
        <th>Registriert am</th>
        <th>Datenschutzerklärung</th>
        <th>Handle</th>
        <th>
          <span className="sr-only">Spynet</span>
        </th>
      </THead>

      <TBody>
        {users.map(({ user, discordId, entity }) => (
          <TRow key={user.id} className={clsx("h-14", GRID_COLS)}>
            <td className="overflow-hidden">
              <div className="flex gap-2 items-center">
                <Avatar
                  name={discordId}
                  image={user.image}
                  size={32}
                  className="shrink-0"
                />
                <span
                  title={discordId}
                  className="text-ellipsis overflow-hidden whitespace-nowrap"
                >
                  {discordId}
                </span>
              </div>
            </td>

            <td className="overflow-hidden">
              <span
                title={user.id}
                className="text-ellipsis block overflow-hidden whitespace-nowrap"
              >
                {user.id}
              </span>
            </td>

            <td className="overflow-hidden">
              <span
                title={formatDate(user.createdAt) || undefined}
                className="text-ellipsis block overflow-hidden whitespace-nowrap"
              >
                {formatDate(user.createdAt)}
              </span>
            </td>

            <td className="overflow-hidden">
              {user.emailVerified ? (
                <span
                  title={formatDate(user.emailVerified) || undefined}
                  className="text-ellipsis block overflow-hidden whitespace-nowrap"
                >
                  {formatDate(user.emailVerified)}
                </span>
              ) : (
                <VerifyEmailButton userId={user.id} />
              )}
            </td>

            <td className="overflow-hidden">
              {user.name ? (
                <span
                  title={user.name || undefined}
                  className="block text-ellipsis overflow-hidden whitespace-nowrap"
                >
                  {user.name}
                </span>
              ) : (
                <span className="italic text-neutral-500">-</span>
              )}
            </td>

            <td className="overflow-hidden">
              {entity?.id ? (
                <CitizenPopover citizenId={entity.id}>
                  <Link
                    href={`/app/spynet/citizen/${entity.id}`}
                    className="text-brand-red-500 hover:text-brand-red-300 flex gap-2 items-center"
                  >
                    <span className="hidden sm:inline">Spynet</span>{" "}
                    <FaExternalLinkAlt />
                  </Link>
                </CitizenPopover>
              ) : null}
            </td>
          </TRow>
        ))}
      </TBody>
    </Table>
  );
};

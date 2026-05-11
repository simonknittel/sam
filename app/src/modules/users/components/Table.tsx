"use client";

import { CitizenPopover } from "@/modules/citizen/components/CitizenPopover";
import Avatar from "@/modules/common/components/Avatar";
import { Link } from "@/modules/common/components/Link";
import { formatDate } from "@/modules/common/utils/formatDate";
import { VerifyEmailButton } from "@/modules/users/components/VerifyEmailButton";
import { type Entity, type User } from "@prisma/client";
import clsx from "clsx";
import { FaExternalLinkAlt } from "react-icons/fa";

interface Props {
  readonly users: {
    readonly user: User;
    readonly discordId: string;
    readonly entity?: Entity;
  }[];
}

const GRID_COLS =
  "grid-cols-[200px_240px_150px_200px_150px_24px] sm:grid-cols-[200px_240px_150px_200px_150px_128px]";

export const Table = ({ users }: Props) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-200">
        <thead>
          <tr
            className={clsx(
              "grid items-center gap-4 text-left [&>th]:text-white/40 [&>th]:font-mono [&>th]:uppercase",
              GRID_COLS,
            )}
          >
            <th>Discord ID</th>
            <th>User ID</th>
            <th>Registriert am</th>
            <th>Datenschutzerklärung</th>
            <th>Handle</th>
            <th />
          </tr>
        </thead>

        <tbody>
          {users.map(({ user, discordId, entity }) => (
            <tr
              key={user.id}
              className={clsx(
                "grid items-center gap-4 px-2 h-14 rounded-secondary -mx-2 first:mt-2",
                GRID_COLS,
              )}
            >
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

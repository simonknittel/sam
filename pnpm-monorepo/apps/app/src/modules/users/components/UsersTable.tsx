"use client";

import { CitizenPopover } from "@/modules/citizen/components/CitizenPopover";
import Avatar from "@/modules/common/components/Avatar";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { Link } from "@/modules/common/components/Link";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import { BanUser } from "@/modules/users/components/BanUser";
import { UnbanUser } from "@/modules/users/components/UnbanUser";
import { VerifyEmailButton } from "@/modules/users/components/VerifyEmailButton";
import { type Entity, type User } from "@sam-monorepo/database/browser";
import { FaExternalLinkAlt } from "react-icons/fa";
import { FaCircleXmark } from "react-icons/fa6";

const COLUMNS = "240px 240px 150px 200px 150px 150px 24px";
/** The actions column only fits its labels from `sm` upwards */
const SM_COLUMNS =
  "sm:[--table-columns:240px_240px_150px_200px_150px_150px_110px]";

interface Props {
  readonly className?: string;
  readonly users: {
    readonly user: Pick<
      User,
      | "id"
      | "name"
      | "image"
      | "createdAt"
      | "emailVerified"
      | "bannedAt"
      | "bannedReason"
      | "role"
    > & {
      readonly bannedBy: Pick<Entity, "id" | "handle"> | null;
    };
    readonly discordId: string;
    readonly entity?: Entity;
  }[];
  readonly showBanActions?: boolean;
  readonly ownUserId?: string;
}

export const UsersTable = ({
  className,
  users,
  showBanActions,
  ownUserId,
}: Props) => {
  return (
    <Table
      className={className}
      columns={COLUMNS}
      tableClassName={SM_COLUMNS}
      minWidth={800}
    >
      <THead>
        <th>Discord ID</th>
        <th>User ID</th>
        <th>Registriert am</th>
        <th>Datenschutzerklärung</th>
        <th>Handle</th>
        <th>Gesperrt</th>
        <th>
          <span className="sr-only">Spynet</span>
        </th>
      </THead>

      <TBody>
        {users.map(({ user, discordId, entity }) => (
          <TRow key={user.id} className="h-14">
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

            <td className="overflow-hidden flex items-center gap-2">
              {user.bannedAt && (
                <PopoverBaseUI
                  title="Details zur Sperre"
                  trigger={
                    <span className="flex items-center gap-1 ml-2">
                      <FaCircleXmark className="text-red-500" /> Gesperrt
                    </span>
                  }
                  childrenClassName="text-sm"
                  hoverOnly
                >
                  <div className="flex flex-col gap-1">
                    <p>Gesperrt am: {formatDate(user.bannedAt)}</p>

                    <p>
                      Gesperrt von: <CitizenLink citizen={user.bannedBy} />
                    </p>

                    {user.bannedReason && <p>Grund: {user.bannedReason}</p>}
                  </div>
                </PopoverBaseUI>
              )}

              {showBanActions &&
              user.id !== ownUserId &&
              user.role !== "admin" ? (
                user.bannedAt ? (
                  <UnbanUser userId={user.id} />
                ) : (
                  <BanUser userId={user.id} />
                )
              ) : null}
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

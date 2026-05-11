"use client";

import { CitizenPopover } from "@/modules/citizen/components/CitizenPopover";
import { Link } from "@/modules/common/components/Link";
import { THead, TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import type { Entity, SilcTransaction } from "@prisma/client";
import clsx from "clsx";
import { CreateOrUpdateSilcTransaction } from "./CreateOrUpdateSilcTransaction";
import { DeleteSilcTransaction } from "./DeleteSilcTransaction";

type Row = SilcTransaction & {
  receiver: Pick<Entity, "id" | "handle">;
  createdBy: Pick<Entity, "id" | "handle"> | null;
  updatedBy: Pick<Entity, "id" | "handle"> | null;
};

const TABLE_MIN_WIDTH = "min-w-200";
const GRID_COLS = "grid-cols-[144px_160px_88px_minmax(100px,1fr)_160px_64px]";

interface Props {
  readonly className?: string;
  readonly rows: Row[];
  readonly showEdit?: boolean;
  readonly showDelete?: boolean;
}

export const SilcTransactionsTableClient = ({
  className,
  rows,
  showEdit,
  showDelete,
}: Props) => {
  return (
    <div className={clsx("w-full overflow-x-auto", className)}>
      <table className={clsx("w-full", TABLE_MIN_WIDTH)}>
        <THead className={GRID_COLS}>
          <th>Datum</th>
          <th>Empfaenger</th>
          <th>Wert</th>
          <th>Beschreibung</th>
          <th>Von</th>
          <th>
            <span className="sr-only">Aktionen</span>
          </th>
        </THead>

        <tbody>
          {rows.map((transaction) => {
            const citizen = transaction.updatedBy || transaction.createdBy;

            return (
              <TRow key={transaction.id} className={GRID_COLS}>
                <td className="overflow-hidden flex items-center h-8">
                  <span className="whitespace-nowrap">
                    {formatDate(transaction.createdAt)}
                  </span>
                </td>

                <td className="overflow-hidden flex items-center h-8">
                  <Link
                    href={`/app/spynet/citizen/${transaction.receiver.id}/silc`}
                    className="hover:bg-white/10 flex items-center rounded-secondary px-2 h-full text-brand-red-500 truncate"
                    prefetch={false}
                    title={
                      transaction.receiver.handle || transaction.receiver.id
                    }
                  >
                    {transaction.receiver.handle || transaction.receiver.id}
                  </Link>
                </td>

                <td className="overflow-hidden flex items-center h-8">
                  <span
                    className={clsx("font-bold", {
                      "text-green-500": transaction.value > 0,
                      "text-red-500": transaction.value < 0,
                    })}
                  >
                    {transaction.value}
                  </span>
                </td>

                <td className="overflow-hidden flex items-center h-8">
                  <span
                    title={transaction.description || undefined}
                    className="truncate"
                  >
                    {transaction.description}
                  </span>
                </td>

                <td className="overflow-hidden flex items-center h-8">
                  {citizen && (
                    <CitizenPopover citizenId={citizen.id}>
                      <Link
                        href={`/app/spynet/citizen/${citizen.id}`}
                        className="hover:bg-white/10 flex items-center rounded-secondary px-2 h-full text-brand-red-500 truncate"
                        prefetch={false}
                        title={citizen.handle || citizen.id}
                      >
                        {citizen.handle || citizen.id}
                      </Link>
                    </CitizenPopover>
                  )}
                </td>

                <td className="overflow-hidden flex items-center h-8">
                  <span className="flex items-center gap-1 h-full">
                    {showEdit && !transaction.deletedAt && (
                      <CreateOrUpdateSilcTransaction
                        transaction={transaction}
                        className="flex-none"
                      />
                    )}
                    {showDelete && !transaction.deletedAt && (
                      <DeleteSilcTransaction
                        id={transaction.id}
                        className="flex-none"
                      />
                    )}
                  </span>
                </td>
              </TRow>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

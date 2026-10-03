"use client";

import { CitizenCellLink } from "@/modules/common/components/CitizenCellLink";
import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import type { SilcTransactionTableRow } from "@/modules/silc/queries/silcTransactionTableSelect";
import clsx from "clsx";
import { CreateOrUpdateSilcTransaction } from "./CreateOrUpdateSilcTransaction";
import { DeleteSilcTransaction } from "./DeleteSilcTransaction";

type Row = SilcTransactionTableRow;

const COLUMNS = "144px 160px 88px minmax(100px,1fr) 160px 64px";

interface Props {
  readonly className?: string;
  readonly rows: Row[];
  readonly showEdit?: boolean;
  readonly showDelete?: boolean;
}

export const SilcTransactionsTable = ({
  className,
  rows,
  showEdit,
  showDelete,
}: Props) => {
  return (
    <Table className={className} columns={COLUMNS} minWidth={800}>
      <THead>
        <th>Datum</th>
        <th>Empfänger</th>
        <th>Wert</th>
        <th>Beschreibung</th>
        <th>Von</th>
        <th className="sr-only">Aktionen</th>
      </THead>

      <TBody>
        {rows.map((transaction) => {
          const citizen = transaction.updatedBy || transaction.createdBy;

          return (
            <TRow key={transaction.id}>
              <td>{formatDate(transaction.createdAt)}</td>

              <td className="flex h-8 items-center overflow-hidden">
                <CitizenCellLink
                  citizen={transaction.receiver}
                  page="/silc"
                  className="h-full"
                />
              </td>

              <td
                className={clsx("font-bold", {
                  "text-green-500": transaction.value > 0,
                  "text-red-500": transaction.value < 0,
                })}
              >
                {transaction.value}
              </td>

              <td
                title={transaction.description || undefined}
                className="truncate"
              >
                {transaction.description}
              </td>

              <td className="flex h-8 items-center overflow-hidden">
                {citizen && (
                  <CitizenCellLink citizen={citizen} className="h-full" />
                )}
              </td>

              <td className="flex h-8 items-center overflow-hidden">
                <span className="flex h-full items-center gap-1">
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
      </TBody>
    </Table>
  );
};

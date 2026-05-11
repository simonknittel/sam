import { requireAuthentication } from "@/modules/auth/server";
import { Tile } from "@/modules/common/components/Tile";
import type { Entity } from "@prisma/client";
import clsx from "clsx";
import { getSilcTransactionsOfCitizen } from "../queries";
import { SilcTransactionsTable } from "./SilcTransactionsTable";

interface Props {
  readonly className?: string;
  readonly citizenId: Entity["id"];
}

export const SilcTransactions = async ({ className, citizenId }: Props) => {
  const authentication = await requireAuthentication();

  const entries = await getSilcTransactionsOfCitizen(citizenId);
  const hasEntries = entries.length > 0;

  const [showEdit, showDelete] = await Promise.all([
    authentication.authorize("silcTransactionOfOtherCitizen", "update"),
    authentication.authorize("silcTransactionOfOtherCitizen", "delete"),
  ]);

  return (
    <Tile heading="Transaktionen" className={clsx(className)}>
      {hasEntries ? (
        <SilcTransactionsTable
          rows={entries}
          showEdit={showEdit}
          showDelete={showDelete}
        />
      ) : (
        <p className="italic">Bisher wurden keine SILC verteilt.</p>
      )}
    </Tile>
  );
};

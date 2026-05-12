import type { Entity } from "@/generated/prisma/client";
import { requireAuthentication } from "@/modules/auth/server";
import { Tile } from "@/modules/common/components/Tile";
import clsx from "clsx";
import {
  createLoader,
  parseAsStringLiteral,
  type SearchParams,
} from "nuqs/server";
import { getEntriesOfCitizen } from "../queries";
import { CreatePenaltyEntryButton } from "./CreatePenaltyEntry/CreatePenaltyEntryButton";
import { PenaltyEntriesTable } from "./PenaltyEntriesTable";

const loadSearchParams = createLoader({
  expired: parseAsStringLiteral(["active", "all"]).withDefault("active"),
});

interface Props {
  readonly className?: string;
  readonly citizenId: Entity["id"];
  readonly searchParams: Promise<SearchParams>;
}

export const EntriesOfCitizenTable = async ({
  className,
  citizenId,
  searchParams,
}: Props) => {
  const authentication = await requireAuthentication();
  const { expired } = await loadSearchParams(searchParams);
  const [showCreate, showDelete] = await Promise.all([
    authentication.authorize("penaltyEntry", "create"),
    authentication.authorize("penaltyEntry", "delete"),
  ]);

  const entries = await getEntriesOfCitizen(citizenId, expired);
  const hasEntries = entries.length > 0;

  return (
    <Tile
      heading="Strafpunkte"
      cta={showCreate ? <CreatePenaltyEntryButton /> : null}
      className={clsx(className)}
    >
      {hasEntries ? (
        <PenaltyEntriesTable
          rows={entries}
          showDelete={showDelete}
          hideCitizenColumn
        />
      ) : (
        <p className="italic">Keine Strafpunkte vorhanden.</p>
      )}
    </Tile>
  );
};

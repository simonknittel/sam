import { prisma } from "@/db";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { Link } from "@/modules/common/components/Link";
import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import { WikiPageSnapshotKind } from "@sam-monorepo/database/client";
import clsx from "clsx";
import { FaArrowLeft } from "react-icons/fa";
import type { WikiSharedContextPage } from "../queries/getWikiContext";
import { getWikiPageRouteHref } from "../utils/wikiPageHref";
import { WikiPageIcon } from "./WikiPageIcon";
import { WikiSnapshotRestoreButton } from "./WikiSnapshotRestoreButton";

const COLUMNS = "minmax(200px,1fr) 120px 160px 160px 180px";

interface Props {
  readonly className?: string;
  readonly page: WikiSharedContextPage;
  /** Route of the page, e.g. its event root route; defaults to the id-URL */
  readonly pageHref?: string;
  /** Restoring is a mutation — frozen event pages only view their history */
  readonly canRestore: boolean;
}

/**
 * Snapshot list of a page (page admins only): automatic snapshots created
 * while the page is edited plus safety snapshots taken before restores and
 * imports, newest first, each with a restore action.
 */
export const WikiSnapshotsTable = async ({
  className,
  page,
  pageHref,
  canRestore,
}: Props) => {
  const snapshots = await prisma.wikiPageSnapshot.findMany({
    where: { pageId: page.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      kind: true,
      name: true,
      createdAt: true,
      createdBy: { select: { id: true, handle: true } },
    },
  });

  return (
    <section className={clsx("p-4 bg-secondary rounded-primary", className)}>
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="font-bold text-2xl">Snapshots</h1>

        <Link
          href={pageHref ?? getWikiPageRouteHref(page)}
          className="flex items-center gap-1 text-sm text-interaction-500 hover:text-interaction-300"
        >
          <FaArrowLeft className="text-xs" />
          {page.iconId && <WikiPageIcon iconId={page.iconId} />}
          {page.title}
        </Link>
      </div>

      <p className="mt-2 mb-4 text-sm text-neutral-400">
        Snapshots entstehen automatisch, während die Seite bearbeitet wird
        (höchstens alle 5 Minuten); die letzten 50 werden aufbewahrt. Vor dem
        Wiederherstellen und Importieren wird der aktuelle Stand zusätzlich als
        dauerhafte Sicherung festgehalten.
      </p>

      <Table columns={COLUMNS} minWidth={760}>
        <THead>
          <th>Name</th>

          <th>Typ</th>

          <th>Erstellt</th>

          <th>Erstellt von</th>

          <th className="sr-only">Aktionen</th>
        </THead>

        <TBody>
          {snapshots.map((snapshot) => (
            <SnapshotRow
              key={snapshot.id}
              snapshot={snapshot}
              canRestore={canRestore}
            />
          ))}
        </TBody>
      </Table>

      {snapshots.length <= 0 && (
        <p className="text-neutral-500 italic">Noch keine Snapshots</p>
      )}
    </section>
  );
};

interface SnapshotRowProps {
  readonly snapshot: {
    readonly id: string;
    readonly kind: WikiPageSnapshotKind;
    readonly name: string | null;
    readonly createdAt: Date;
    readonly createdBy: {
      readonly id: string;
      readonly handle: string | null;
    } | null;
  };
  readonly canRestore: boolean;
}

const SnapshotRow = ({ snapshot, canRestore }: SnapshotRowProps) => {
  const name = snapshot.name || "Automatischer Snapshot";

  return (
    <TRow className="h-10">
      <td className="overflow-hidden">
        <p className="truncate px-2" title={name}>
          {name}
        </p>
      </td>

      <td>
        {snapshot.kind === WikiPageSnapshotKind.MANUAL
          ? "Sicherung"
          : "Automatisch"}
      </td>

      <td>
        <p className="truncate" title={formatDate(snapshot.createdAt) ?? ""}>
          {formatDate(snapshot.createdAt)}
        </p>
      </td>

      <td className="truncate">
        <CitizenLink citizen={snapshot.createdBy} />
      </td>

      <td>
        {canRestore && (
          <WikiSnapshotRestoreButton snapshotId={snapshot.id} name={name} />
        )}
      </td>
    </TRow>
  );
};

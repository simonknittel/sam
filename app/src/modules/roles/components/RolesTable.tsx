import { env } from "@/env";
import { Link } from "@/modules/common/components/Link";
import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import clsx from "clsx";
import Image from "next/image";
import {
  createLoader,
  parseAsStringLiteral,
  type SearchParams,
} from "nuqs/server";
import { getRoles } from "../queries";

const TABLE_MIN_WIDTH = "min-w-210";
const GRID_COLS = "grid-cols-[1fr_128px_128px_128px_80px_80px]";

const loadSearchParams = createLoader({
  filter: parseAsStringLiteral([
    "all",
    "has-inheritance",
    "has-level",
    "has-citizen",
    "no-citizen",
  ]).withDefault("all"),
  sort: parseAsStringLiteral([
    "name-asc",
    "name-desc",
    "inherits-desc",
    "inherits-asc",
    "citizen-desc",
    "citizen-asc",
  ]).withDefault("name-asc"),
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const RolesTable = async ({ className, searchParams }: Props) => {
  const { filter, sort } = await loadSearchParams(searchParams);

  const roles = await getRoles(true);

  const filteredRoles = roles.filter((role) => {
    switch (filter) {
      case "has-inheritance":
        return role.inherits.length > 0;
      case "has-level":
        return role.maxLevel != null;
      case "has-citizen":
        return role.assignments.length > 0;
      case "no-citizen":
        return role.assignments.length === 0;
      default:
        return true;
    }
  });

  const sortedRoles = filteredRoles.toSorted((a, b) => {
    switch (sort) {
      case "name-asc":
        return sortAscWithAndNullLast(a.name, b.name);
      case "name-desc":
        return sortDescAndNullLast(a.name, b.name);
      case "inherits-desc":
        return sortDescAndNullLast(a.inherits.length, b.inherits.length);
      case "inherits-asc":
        return sortAscWithAndNullLast(a.inherits.length, b.inherits.length);
      case "citizen-desc":
        return sortDescAndNullLast(a.assignments.length, b.assignments.length);
      case "citizen-asc":
        return sortAscWithAndNullLast(
          a.assignments.length,
          b.assignments.length,
        );
      default:
        throw new Error(`Unknown sort: ${sort satisfies never}`);
    }
  });

  return (
    <section className={clsx("p-4 bg-secondary rounded-primary", className)}>
      <Table className={clsx(TABLE_MIN_WIDTH)}>
        <THead className={GRID_COLS}>
          <th>Rolle</th>
          <th className="text-center">Vererbungen</th>
          <th className="text-center">
            Entfernung
            <br />
            nach
          </th>
          <th className="text-center">
            Zuweisung
            <br />
            nach
          </th>
          <th className="text-center">Level</th>
          <th className="text-center">Citizen</th>
        </THead>

        <TBody>
          {sortedRoles.map((role) => (
            <TRow key={role.id} className={clsx("h-10", GRID_COLS)}>
              <td className="overflow-hidden">
                <Link
                  href={`/app/roles/${role.id}`}
                  className="flex items-center gap-2 hover:bg-white/10 px-2 rounded-secondary h-8"
                  prefetch={false}
                >
                  {role.icon ? (
                    <div className="aspect-square size-6 flex items-center justify-center rounded-secondary overflow-hidden flex-none">
                      <Image
                        src={`https://${env.NEXT_PUBLIC_S3_PUBLIC_URL}/${role.icon.id}`}
                        alt=""
                        width={24}
                        height={24}
                        className="max-w-full max-h-full"
                        unoptimized={["image/svg+xml", "image/gif"].includes(
                          role.icon.mimeType,
                        )}
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="size-6 flex-none" />
                  )}

                  <p className="font-bold truncate">{role.name}</p>
                </Link>
              </td>

              <td>
                <Link
                  href={`/app/roles/${role.id}/inheritance`}
                  className="flex items-center justify-center gap-2 hover:bg-white/10 px-2 rounded-secondary h-8"
                  prefetch={false}
                >
                  {role.inherits.length > 0 ? role.inherits.length : null}
                </Link>
              </td>

              <td className="text-center">{role.maxAgeDays}</td>

              <td className="text-center">{role.assignAfterInactiveDays}</td>

              <td className="text-center">{role.maxLevel}</td>

              <td>
                <Link
                  href={`/app/spynet/citizen?filters=role-${role.id}`}
                  className="flex items-center justify-center gap-2 hover:bg-white/10 px-2 rounded-secondary h-8"
                  prefetch={false}
                >
                  {role.assignments.length > 0 ? role.assignments.length : null}
                </Link>
              </td>
            </TRow>
          ))}
        </TBody>
      </Table>

      {sortedRoles.length <= 0 && (
        <p className="text-neutral-500 italic">Keine Rollen vorhanden</p>
      )}
    </section>
  );
};

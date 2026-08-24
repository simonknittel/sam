import { Link } from "@/modules/common/components/Link";
import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import clsx from "clsx";
import Image from "next/image";
import {
  createLoader,
  parseAsString,
  parseAsStringLiteral,
  type SearchParams,
} from "nuqs/server";
import { getRolesForTable } from "../queries/getRoles";

const COLUMNS = "300px minmax(200px,1fr) 128px 128px 128px 80px 80px";

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
  q: parseAsString,
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const RolesTable = async ({ className, searchParams }: Props) => {
  const { filter, sort, q } = await loadSearchParams(searchParams);

  const roles = await getRolesForTable();

  const filteredRoles = roles.filter((role) => {
    if (q) {
      const searchQuery = q.toLowerCase();
      if (!role.name.toLowerCase().includes(searchQuery)) {
        return false;
      }
    }
    switch (filter) {
      case "has-inheritance":
        return role._count.inherits > 0;
      case "has-level":
        return role.maxLevel != null;
      case "has-citizen":
        return role._count.assignments > 0;
      case "no-citizen":
        return role._count.assignments === 0;
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
        return sortDescAndNullLast(a._count.inherits, b._count.inherits);
      case "inherits-asc":
        return sortAscWithAndNullLast(a._count.inherits, b._count.inherits);
      case "citizen-desc":
        return sortDescAndNullLast(a._count.assignments, b._count.assignments);
      case "citizen-asc":
        return sortAscWithAndNullLast(
          a._count.assignments,
          b._count.assignments,
        );
      default:
        throw new Error(`Unknown sort: ${sort satisfies never}`);
    }
  });

  return (
    <section className={clsx("p-4 bg-secondary rounded-primary", className)}>
      <Table columns={COLUMNS} minWidth={840}>
        <THead>
          <th>Rolle</th>

          <th>Beschreibung</th>

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
            <TRow key={role.id} className="h-10">
              <td className="overflow-hidden">
                <Link
                  href={`/app/roles/${role.id}`}
                  className="flex items-center gap-2 hover:bg-white/10 px-2 rounded-secondary h-8"
                  prefetch={false}
                >
                  {role.icon ? (
                    <div className="aspect-square size-6 flex items-center justify-center rounded-secondary overflow-hidden flex-none">
                      <Image
                        src={getPublicUploadUrl(role.icon.id)}
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

              <td
                title={role.description || ""}
                className="text-sm truncate text-white/40"
              >
                {role.description || null}
              </td>

              <td>
                <Link
                  href={`/app/roles/${role.id}/inheritance`}
                  className="flex items-center justify-center gap-2 hover:bg-white/10 px-2 rounded-secondary h-8"
                  prefetch={false}
                >
                  {role._count.inherits > 0 ? role._count.inherits : null}
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
                  {role._count.assignments > 0 ? role._count.assignments : null}
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

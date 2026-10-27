import { Link } from "@/modules/common/components/Link";
import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
import {
  UploadedIcon,
  UploadedIconSize,
} from "@/modules/common/components/UploadedIcon";
import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import type { ManagedRoleTag } from "@sam-monorepo/application";
import clsx from "clsx";
import {
  createLoader,
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  type SearchParams,
} from "nuqs/server";
import { getRolesForTable } from "../queries/getRoles";
import { getManagedRoleTags } from "../queries/getRoleTags";
import { RoleTagBadge } from "./tags/RoleTagBadge";

const COLUMNS =
  "300px minmax(200px,1fr) minmax(160px,1fr) 128px 128px 128px 80px 80px";

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
  /** The ids of the tags. A role with one of these tags passes. */
  tags: parseAsArrayOf(parseAsString),
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const RolesTable = async ({ className, searchParams }: Props) => {
  const { filter, sort, q, tags } = await loadSearchParams(searchParams);

  const [roles, allTags] = await Promise.all([
    getRolesForTable(),
    getManagedRoleTags(),
  ]);

  /** The tags of each role, sorted by name like `allTags` */
  const tagsByRoleId = new Map<string, ManagedRoleTag[]>();
  for (const tag of allTags) {
    for (const roleId of tag.roleIds) {
      tagsByRoleId.set(roleId, [...(tagsByRoleId.get(roleId) ?? []), tag]);
    }
  }

  const filterTagIds = new Set(tags);

  const filteredRoles = roles.filter((role) => {
    if (q) {
      const searchQuery = q.toLowerCase();
      if (!role.name.toLowerCase().includes(searchQuery)) {
        return false;
      }
    }
    if (
      filterTagIds.size > 0 &&
      !tagsByRoleId.get(role.id)?.some((tag) => filterTagIds.has(tag.id))
    ) {
      return false;
    }
    switch (filter) {
      case "has-inheritance":
        return role.inheritanceCount > 0;
      case "has-level":
        return role.maxLevel != null;
      case "has-citizen":
        return role.citizenCount > 0;
      case "no-citizen":
        return role.citizenCount === 0;
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
        return sortDescAndNullLast(a.inheritanceCount, b.inheritanceCount);
      case "inherits-asc":
        return sortAscWithAndNullLast(a.inheritanceCount, b.inheritanceCount);
      case "citizen-desc":
        return sortDescAndNullLast(a.citizenCount, b.citizenCount);
      case "citizen-asc":
        return sortAscWithAndNullLast(a.citizenCount, b.citizenCount);
      default:
        throw new Error(`Unknown sort: ${sort satisfies never}`);
    }
  });

  return (
    <section className={clsx("rounded-primary bg-secondary p-4", className)}>
      <Table columns={COLUMNS} minWidth={1000}>
        <THead>
          <th>Rolle</th>

          <th>Beschreibung</th>

          <th>Tags</th>

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
                  className="flex h-8 items-center gap-2 rounded-secondary px-2 hover:bg-white/10"
                  prefetch={false}
                >
                  {role.icon ? (
                    <div className="flex aspect-square size-6 flex-none items-center justify-center overflow-hidden rounded-secondary">
                      <UploadedIcon
                        upload={role.icon}
                        size={UploadedIconSize.Medium}
                      />
                    </div>
                  ) : (
                    <div className="size-6 flex-none" />
                  )}

                  <p className="truncate font-bold" title={role.name}>
                    {role.name}
                  </p>
                </Link>
              </td>

              <td
                title={role.description || ""}
                className="truncate text-sm text-white/40"
              >
                {role.description || null}
              </td>

              <RoleTagsCell tags={tagsByRoleId.get(role.id) ?? []} />

              <td>
                <Link
                  href={`/app/roles/${role.id}/inheritance`}
                  className="flex h-8 items-center justify-center gap-2 rounded-secondary px-2 hover:bg-white/10"
                  prefetch={false}
                >
                  {role.inheritanceCount > 0 ? role.inheritanceCount : null}
                </Link>
              </td>

              <td className="text-center">{role.maxAgeDays}</td>

              <td className="text-center">{role.assignAfterInactiveDays}</td>

              <td className="text-center">{role.maxLevel}</td>

              <td>
                <Link
                  href={`/app/spynet/citizen?filters=role-${role.id}`}
                  className="flex h-8 items-center justify-center gap-2 rounded-secondary px-2 hover:bg-white/10"
                  prefetch={false}
                >
                  {role.citizenCount > 0 ? role.citizenCount : null}
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

interface RoleTagsCellProps {
  /** Sorted by name */
  readonly tags: readonly Pick<
    ManagedRoleTag,
    "id" | "name" | "description" | "icon"
  >[];
}

/** The row has one line: tags that do not fit are cut off, the title lists all */
const RoleTagsCell = ({ tags }: RoleTagsCellProps) => {
  return (
    <td
      title={
        tags.length > 0 ? tags.map((tag) => tag.name).join(", ") : undefined
      }
      className="flex gap-1 overflow-hidden"
    >
      {tags.map((tag) => (
        <RoleTagBadge key={tag.id} tag={tag} className="flex-none" />
      ))}
    </td>
  );
};

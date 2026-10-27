import {
  TableTile,
  type TableColumn,
} from "@/modules/common/components/TableTile";
import { getRoles } from "@/modules/roles/queries/getRoles";
import { getManagedRoleTags } from "@/modules/roles/queries/getRoleTags";
import { createLoader, parseAsString, type SearchParams } from "nuqs/server";
import { CreateRoleTagButton } from "./CreateRoleTagButton";
import { RoleTagRow } from "./RoleTagRow";

const COLUMNS: TableColumn[] = [
  { key: "tag", label: "Tag", track: "minmax(180px,1fr)", minWidth: 180 },
  {
    key: "description",
    label: "Beschreibung",
    track: "minmax(200px,2fr)",
    minWidth: 200,
  },
  {
    key: "roles",
    label: "Rollen",
    track: "minmax(250px,3fr)",
    minWidth: 250,
  },
];

const loadSearchParams = createLoader({
  q: parseAsString,
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

/** All tags with their roles. Requires `role;manage`. */
export const RoleTagsTable = async ({ className, searchParams }: Props) => {
  const { q } = await loadSearchParams(searchParams);

  const [tags, roles] = await Promise.all([getManagedRoleTags(), getRoles()]);

  const roleById = new Map(
    roles.map((role) => [
      role.id,
      { id: role.id, name: role.name, icon: role.icon },
    ]),
  );

  const searchQuery = q?.trim().toLowerCase();
  const filteredTags = searchQuery
    ? tags.filter((tag) => tag.name.toLowerCase().includes(searchQuery))
    : tags;

  return (
    <TableTile
      className={className}
      heading="Tags"
      cta={<CreateRoleTagButton />}
      columns={COLUMNS}
      isEmpty={filteredTags.length === 0}
      emptyMessage={
        searchQuery ? "Kein Tag passt zu dieser Suche." : "Keine Tags vorhanden"
      }
    >
      {filteredTags.map((tag) => (
        <RoleTagRow
          key={tag.id}
          tag={tag}
          roles={tag.roleIds.flatMap((roleId) => {
            const role = roleById.get(roleId);
            return role ? [role] : [];
          })}
        />
      ))}
    </TableTile>
  );
};

import { Tile } from "@/modules/common/components/Tile";
import { getRoles } from "@/modules/roles/queries/getRoles";
import { getManagedRoleTags } from "@/modules/roles/queries/getRoleTags";
import { CreateRoleTagButton } from "./CreateRoleTagButton";
import { RoleTagListItem } from "./RoleTagListItem";

/** All tags with their roles. Requires `role;manage`. */
export const RoleTagListTile = async () => {
  const [tags, roles] = await Promise.all([getManagedRoleTags(), getRoles()]);
  const roleById = new Map(
    roles.map((role) => [
      role.id,
      { id: role.id, name: role.name, icon: role.icon },
    ]),
  );

  return (
    <Tile heading="Tags" cta={<CreateRoleTagButton />}>
      {tags.length > 0 ? (
        <ul>
          {tags.map((tag) => (
            <RoleTagListItem
              key={tag.id}
              tag={tag}
              roles={tag.roleIds.flatMap((roleId) => {
                const role = roleById.get(roleId);
                return role ? [role] : [];
              })}
            />
          ))}
        </ul>
      ) : (
        <p className="text-neutral-500 italic">Keine Tags vorhanden</p>
      )}
    </Tile>
  );
};

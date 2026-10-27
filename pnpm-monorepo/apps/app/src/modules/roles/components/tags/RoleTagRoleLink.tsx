import { Link } from "@/modules/common/components/Link";
import type { RolePickerRole } from "../RolePicker/RolePanel";
import { UploadedIcon, UploadedIconSize } from "../RolePicker/UploadedIcon";

interface Props {
  readonly role: RolePickerRole;
}

/**
 * A role of a tag in the tag list, with the look of the role badge. The tag
 * list shows all roles, also the roles that the roles context does not have,
 * thus it does not use the role badge.
 */
export const RoleTagRoleLink = ({ role }: Props) => {
  return (
    <Link
      href={`/app/roles/${role.id}`}
      className="inline-flex h-8 max-w-full items-center gap-2 rounded-secondary bg-neutral-700/50 px-2 outline-offset-2 outline-interaction-700 hover:bg-neutral-700/80 focus-visible:bg-neutral-700/80 focus-visible:outline-2 active:bg-neutral-700/30"
    >
      {role.icon && (
        <span className="flex size-6 flex-none items-center justify-center">
          <UploadedIcon upload={role.icon} size={UploadedIconSize.Medium} />
        </span>
      )}

      <span className="truncate font-mono text-sm" title={role.name}>
        {role.name}
      </span>
    </Link>
  );
};

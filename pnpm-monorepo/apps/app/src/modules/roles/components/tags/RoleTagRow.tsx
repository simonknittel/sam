import { Link } from "@/modules/common/components/Link";
import { TableRowAlignment, TRow } from "@/modules/common/components/Table";
import {
  UploadedIcon,
  UploadedIconSize,
} from "@/modules/common/components/UploadedIcon";
import type { ManagedRoleTag } from "@sam-monorepo/application";
import type { RolePickerRole } from "../RolePicker/RolePanel";
import { RoleTagRoleLink } from "./RoleTagRoleLink";

interface Props {
  readonly tag: ManagedRoleTag;
  /** The roles of the tag, sorted by name */
  readonly roles: readonly RolePickerRole[];
}

export const RoleTagRow = ({ tag, roles }: Props) => {
  return (
    <TRow alignment={TableRowAlignment.Top}>
      <td className="min-w-0">
        <Link
          href={`/app/iam/tags/${tag.id}`}
          className="flex h-8 w-fit max-w-full items-center gap-2 rounded-secondary px-2 outline-offset-2 outline-interaction-700 hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-2 active:bg-white/5"
        >
          <span className="flex size-6 flex-none items-center justify-center">
            {tag.icon && (
              <UploadedIcon upload={tag.icon} size={UploadedIconSize.Medium} />
            )}
          </span>

          <span className="truncate font-bold" title={tag.name}>
            {tag.name}
          </span>
        </Link>
      </td>

      <td
        title={tag.description || undefined}
        className="truncate text-sm leading-8 text-white/60"
      >
        {tag.description}
      </td>

      <td className="min-w-0">
        {roles.length > 0 ? (
          <ul aria-label="Rollen" className="flex flex-wrap gap-1">
            {roles.map((role) => (
              <li key={role.id} className="max-w-full">
                <RoleTagRoleLink role={role} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-8 text-neutral-500 italic">
            Keine Rollen
          </p>
        )}
      </td>
    </TRow>
  );
};

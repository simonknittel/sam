import { Link } from "@/modules/common/components/Link";
import type { ManagedRoleTag } from "@sam-monorepo/application";
import type { RolePickerRole } from "../RolePicker/RolePanel";
import { UploadedIcon, UploadedIconSize } from "../RolePicker/UploadedIcon";
import { RoleTagRoleLink } from "./RoleTagRoleLink";

interface Props {
  readonly tag: ManagedRoleTag;
  /** The roles of the tag, sorted by name */
  readonly roles: readonly RolePickerRole[];
}

export const RoleTagListItem = ({ tag, roles }: Props) => {
  return (
    <li className="border-t border-white/5 py-4 first:border-t-0 first:pt-0 last:pb-0">
      <Link
        href={`/app/iam/tags/${tag.id}`}
        className="-ml-2 inline-flex h-8 max-w-full items-center gap-2 rounded-secondary px-2 outline-offset-2 outline-interaction-700 hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-2 active:bg-white/5"
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

      {tag.description && (
        <p className="mt-1 text-sm whitespace-pre-line text-white/60">
          {tag.description}
        </p>
      )}

      {roles.length > 0 ? (
        <ul aria-label="Rollen" className="mt-2 flex flex-wrap gap-1">
          {roles.map((role) => (
            <li key={role.id} className="max-w-full">
              <RoleTagRoleLink role={role} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-neutral-500 italic">Keine Rollen</p>
      )}
    </li>
  );
};

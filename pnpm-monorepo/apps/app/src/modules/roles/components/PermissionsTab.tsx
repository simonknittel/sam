"use client";

import { Tile } from "@/modules/common/components/Tile";
import type { ManagedRole } from "@sam-monorepo/application";
import type {
  ClassificationLevel,
  NoteType,
} from "@sam-monorepo/database/browser";
import { Permissions } from "./Permissions";
import { PermissionsProvider } from "./PermissionsContext";
import type { RolePickerRole } from "./RolePicker/RolePanel";

interface Props {
  readonly className?: string;
  readonly role: Pick<ManagedRole, "id" | "permissionStrings">;
  readonly noteTypes: NoteType[];
  readonly classificationLevels: ClassificationLevel[];
  readonly allRoles: readonly RolePickerRole[];
}

export const PermissionsTab = ({
  className,
  role,
  noteTypes,
  classificationLevels,
  allRoles,
}: Props) => {
  return (
    <Tile heading="Berechtigungen" className={className}>
      <PermissionsProvider role={role}>
        <Permissions
          role={role}
          noteTypes={noteTypes}
          classificationLevels={classificationLevels}
          allRoles={allRoles}
        />
      </PermissionsProvider>
    </Tile>
  );
};

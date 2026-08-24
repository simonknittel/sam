"use client";

import { Tile } from "@/modules/common/components/Tile";
import type {
  ClassificationLevel,
  NoteType,
  PermissionString,
  Role,
} from "@sam-monorepo/database/browser";
import { Permissions } from "./Permissions";
import { PermissionsProvider } from "./PermissionsContext";

interface Props {
  readonly className?: string;
  readonly role: Role & {
    readonly permissionStrings: readonly Pick<
      PermissionString,
      "permissionString"
    >[];
  };
  readonly noteTypes: NoteType[];
  readonly classificationLevels: ClassificationLevel[];
  readonly allRoles: readonly Pick<Role, "id" | "name">[];
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

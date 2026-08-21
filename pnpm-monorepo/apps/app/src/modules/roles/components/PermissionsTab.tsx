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
    permissionStrings: PermissionString[];
  };
  readonly noteTypes: NoteType[];
  readonly classificationLevels: ClassificationLevel[];
  readonly allRoles: Role[];
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

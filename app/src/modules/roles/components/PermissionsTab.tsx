"use client";

import { Tile } from "@/modules/common/components/Tile";
import type {
  ClassificationLevel,
  Flow,
  NoteType,
  PermissionString,
  Role,
} from "@prisma/client";
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
  readonly enableOperations: boolean;
  readonly flows: Flow[];
}

export const PermissionsTab = ({
  className,
  role,
  noteTypes,
  classificationLevels,
  allRoles,
  enableOperations,
  flows,
}: Props) => {
  return (
    <Tile heading="Berechtigungen" className={className}>
      <PermissionsProvider role={role}>
        <Permissions
          role={role}
          noteTypes={noteTypes}
          classificationLevels={classificationLevels}
          allRoles={allRoles}
          enableOperations={Boolean(enableOperations)}
          flows={flows}
        />
      </PermissionsProvider>
    </Tile>
  );
};

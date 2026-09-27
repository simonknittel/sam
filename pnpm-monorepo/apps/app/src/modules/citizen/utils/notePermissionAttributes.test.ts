import { ConfirmationStatus } from "@sam-monorepo/database/browser";
import {
  comparePermissionSets,
  transformPermissionStringToPermissionSet,
} from "@sam-monorepo/permissions";
import { describe, expect, test } from "vitest";
import { getNotePermissionAttributes } from "./notePermissionAttributes";

const NOTE_TYPE_ID = "cm0notetype00000000000001";
const CLASSIFICATION_LEVEL_ID = "cm0classification00000001";

const canRead = (
  note: Parameters<typeof getNotePermissionAttributes>[0],
  permissionStrings: readonly string[],
) =>
  comparePermissionSets(
    {
      resource: "note",
      operation: "read",
      attributes: getNotePermissionAttributes(note),
    },
    permissionStrings.map(transformPermissionStringToPermissionSet),
  );

describe("getNotePermissionAttributes", () => {
  const restrictedPermission = `note;read;noteTypeId=${NOTE_TYPE_ID};classificationLevelId=${CLASSIFICATION_LEVEL_ID}`;

  test("a permission for the classification of a note reads the note", () => {
    expect(
      canRead(
        {
          noteTypeId: NOTE_TYPE_ID,
          classificationLevelId: CLASSIFICATION_LEVEL_ID,
          confirmed: ConfirmationStatus.CONFIRMED,
        },
        [restrictedPermission],
      ),
    ).toBe(true);
  });

  test("a permission for one classification does not read a note whose note type or classification level was deleted", () => {
    for (const note of [
      {
        noteTypeId: null,
        classificationLevelId: CLASSIFICATION_LEVEL_ID,
        confirmed: ConfirmationStatus.CONFIRMED,
      },
      {
        noteTypeId: NOTE_TYPE_ID,
        classificationLevelId: null,
        confirmed: ConfirmationStatus.CONFIRMED,
      },
    ])
      expect(canRead(note, [restrictedPermission])).toBe(false);
  });

  test("the wildcard reads a note whose note type and classification level were deleted", () => {
    expect(
      canRead(
        {
          noteTypeId: null,
          classificationLevelId: null,
          confirmed: ConfirmationStatus.CONFIRMED,
        },
        ["note;read;noteTypeId=*;classificationLevelId=*"],
      ),
    ).toBe(true);
  });
});

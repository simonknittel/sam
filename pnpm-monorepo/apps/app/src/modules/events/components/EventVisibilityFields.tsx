"use client";

import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import { ItemPickerMode } from "@/modules/common/components/ItemPicker/ItemPickerMode";
import { RolePicker } from "@/modules/roles/components/RolePicker/RolePicker";
import { EventVisibility } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { FaGlobe, FaLock } from "react-icons/fa";

interface Props {
  readonly className?: string;
  /** The accessible name of the radio group */
  readonly label: string;
  readonly visibility: string;
  readonly onVisibilityChange: (visibility: string) => void;
  readonly defaultRoleIds: readonly string[];
}

/**
 * The visibility of an event and its roles, in the forms of an event and of
 * a template. The roles show only for a restricted event.
 */
export const EventVisibilityFields = ({
  className,
  label,
  visibility,
  onVisibilityChange,
  defaultRoleIds,
}: Props) => {
  return (
    <div className={clsx(className)}>
      <RadioGroup
        label={label}
        name="visibility"
        items={[
          {
            value: EventVisibility.PUBLIC,
            label: "Öffentlich",
            icon: <FaGlobe />,
            hint: "Alle mit Events-Berechtigung können das Event sehen.",
          },
          {
            value: EventVisibility.RESTRICTED,
            label: "Eingeschränkt",
            icon: <FaLock />,
            hint: "Nur ausgewählte Rollen sowie die Organisatoren können das Event sehen.",
          },
        ]}
        value={visibility}
        onChange={onVisibilityChange}
      />

      {visibility === EventVisibility.RESTRICTED && (
        <RolePicker
          mode={ItemPickerMode.Multiple}
          name="visibilityRole[]"
          defaultValue={defaultRoleIds}
          className="mt-2"
        />
      )}
    </div>
  );
};

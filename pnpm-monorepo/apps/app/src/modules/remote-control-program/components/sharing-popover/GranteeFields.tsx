"use client";

import { CitizenInput } from "@/modules/citizen/components/CitizenInput";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import { ItemPickerMode } from "@/modules/common/components/ItemPicker/ItemPickerMode";
import { RolePicker } from "@/modules/roles/components/RolePicker/RolePicker";
import { GranteeKind, MAXIMUM_GRANTEE_ROLES } from "@sam-monorepo/domain";
import { useState, type ReactNode } from "react";
import { FaGlobe, FaUser, FaUsers } from "react-icons/fa";
import { ShareGrantFormField } from "../../utils/shareGrantFormFields";

interface GranteeKindItem {
  readonly value: GranteeKind;
  readonly label: string;
  readonly icon: ReactNode;
  readonly hint: string;
}

const GRANTEE_KIND_ITEMS: GranteeKindItem[] = [
  {
    value: GranteeKind.citizen,
    label: "Citizen",
    icon: <FaUser aria-hidden />,
    hint: "Nur ein bestimmter Citizen.",
  },
  {
    value: GranteeKind.role,
    label: "Rollen",
    icon: <FaUsers aria-hidden />,
    hint: "Alle Citizens mit mindestens einer dieser Rollen.",
  },
  {
    value: GranteeKind.everyone,
    label: "Alle",
    icon: <FaGlobe aria-hidden />,
    hint: "Alle, die das Remote Control Program nutzen dürfen.",
  },
];

const GRANTEE_KIND_LABEL = "Mit wem möchtest du deine Live-Daten teilen?";

interface Props {
  /** The citizen picker reads all citizens, which needs `citizen;read` */
  readonly canChooseCitizen: boolean;
  /** The owner can see at least one role */
  readonly canChooseRole: boolean;
  /** When the form has no citizen for the kind "citizen" */
  readonly citizenError: string | null;
  /** When the form has no role for the kind "role" */
  readonly rolesError: string | null;
  readonly onRolesChange: () => void;
}

/** The grantee kind and the grantee of a new grant */
export const GranteeFields = ({
  canChooseCitizen,
  canChooseRole,
  citizenError,
  rolesError,
  onRolesChange,
}: Props) => {
  const items = GRANTEE_KIND_ITEMS.filter(
    (item) =>
      (item.value !== GranteeKind.citizen || canChooseCitizen) &&
      (item.value !== GranteeKind.role || canChooseRole),
  );
  // "Everyone" is always in the list. The most narrow kind is the default.
  const [granteeKind, setGranteeKind] = useState<GranteeKind>(
    items[0]?.value ?? GranteeKind.everyone,
  );

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="mb-1">{GRANTEE_KIND_LABEL}</p>

        <RadioGroup
          name={ShareGrantFormField.GranteeKind}
          label={GRANTEE_KIND_LABEL}
          items={items}
          value={granteeKind}
          onChange={(value) => setGranteeKind(value as GranteeKind)}
          equalWidth
        />
      </div>

      {granteeKind === GranteeKind.citizen && (
        <div>
          <CitizenInput name={ShareGrantFormField.CitizenId} />
          <FieldError message={citizenError} />
        </div>
      )}

      {granteeKind === GranteeKind.role && (
        <div>
          <RolePicker
            mode={ItemPickerMode.Multiple}
            name={ShareGrantFormField.RoleIds}
            label="Rollen"
            max={MAXIMUM_GRANTEE_ROLES}
            onChange={onRolesChange}
          />
          <FieldError message={rolesError} />
        </div>
      )}
    </div>
  );
};

interface FieldErrorProps {
  readonly message: string | null;
}

const FieldError = ({ message }: FieldErrorProps) => {
  if (!message) return null;

  return (
    <p role="alert" className="mt-1 text-sm text-brand-red-300">
      {message}
    </p>
  );
};

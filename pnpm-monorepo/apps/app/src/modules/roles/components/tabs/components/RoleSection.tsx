import Button from "@/modules/common/components/Button";
import { ItemPickerMode } from "@/modules/common/components/ItemPicker/ItemPickerMode";
import type {
  RolePickerExtraEntry,
  RolePickerRole,
} from "@/modules/roles/components/RolePicker/RolePanel";
import { RolePicker } from "@/modules/roles/components/RolePicker/RolePicker";
import clsx from "clsx";
import { useState } from "react";
import { FaPlus, FaTrash } from "react-icons/fa";
import { usePermissionsContext } from "../../PermissionsContext";

/** The rule target `*` stands for all roles */
const ALL_ROLES_ENTRIES: readonly RolePickerExtraEntry[] = [
  { id: "*", name: "Alle" },
];

interface Props {
  readonly className?: string;
  readonly roles: readonly RolePickerRole[];
}

export const RoleSection = ({ className, roles }: Props) => {
  const { permissionStrings } = usePermissionsContext();

  const [rules, setRules] = useState<string[]>(
    permissionStrings.filter((permissionString) =>
      permissionString.startsWith("otherRole;"),
    ),
  );

  const handleCreate = () => {
    setRules((rules) => [...rules, `otherRole`]);
  };

  const handleDelete = (ruleToRemove: string) => {
    setRules((rules) => rules.filter((rule) => rule !== ruleToRemove));
  };

  return (
    <div className={clsx(className)}>
      <h4 className="font-bold">Diese Rolle kann folgende Rollen ...</h4>

      <div className="mt-2 rounded-secondary border border-neutral-700 p-4">
        <div className="grid grid-cols-3 gap-2 font-bold">
          <span>Rolle</span>
          <span>Aktion</span>
        </div>

        {rules.length > 0 ? (
          rules.map((rule) => (
            <Rule
              key={rule}
              ruleString={rule}
              roles={roles}
              handleDelete={() => handleDelete(rule)}
            />
          ))
        ) : (
          <p className="mt-2 text-neutral-500 italic">
            Bisher gibt es keine Regeln.
          </p>
        )}

        <Button variant="tertiary" onClick={handleCreate} type="button">
          <FaPlus /> Regel erstellen
        </Button>
      </div>
    </div>
  );
};

type RuleProps = Readonly<{
  ruleString: string;
  roles: readonly RolePickerRole[];
  handleDelete: () => void;
}>;

const Rule = ({ ruleString, roles, handleDelete }: RuleProps) => {
  const [resource, _operation = "", ...attributeStrings] =
    ruleString.split(";");
  if (!resource) throw new Error("Invalid rule");
  const attributes = attributeStrings.map((attributeString) => {
    const [key, value] = attributeString.split("=");
    if (!key || !value) throw new Error("Invalid attribute");
    return { key, value };
  });

  const [operation, setOperation] = useState<string>(_operation || "");

  const [roleId, setRoleId] = useState<string>(
    attributes.find((attribute) => attribute.key === "roleId")?.value || "",
  );

  let inputName = `otherRole;${operation}`;
  if (roleId) inputName += `;roleId=${roleId}`;

  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      {operation && <input type="hidden" name={inputName} />}

      <RolePicker
        mode={ItemPickerMode.Single}
        required
        roles={roles}
        extraEntries={ALL_ROLES_ENTRIES}
        value={roleId || null}
        onChange={(nextRoleId) => setRoleId(nextRoleId ?? "")}
      />

      <select
        required
        className="h-11 rounded-secondary bg-neutral-900 px-4"
        defaultValue={operation}
        onChange={(event) => setOperation(event.target.value)}
      >
        <option disabled hidden value=""></option>
        <option value="manage">Alle</option>
        <option value="read">Sehen</option>
        <option value="assign">Vergeben</option>
        <option value="dismiss">Nehmen</option>
      </select>

      <div className="flex items-center justify-end">
        <Button variant="tertiary" onClick={() => handleDelete()} type="button">
          <FaTrash /> Löschen
        </Button>
      </div>
    </div>
  );
};

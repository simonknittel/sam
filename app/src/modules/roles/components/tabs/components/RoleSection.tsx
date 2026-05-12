import { type Role } from "@/generated/prisma/client";
import Button from "@/modules/common/components/Button";
import clsx from "clsx";
import { useState } from "react";
import { FaPlus, FaTrash } from "react-icons/fa";
import { usePermissionsContext } from "../../PermissionsContext";

interface Props {
  readonly className?: string;
  readonly roles: Role[];
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

      <div className="border border-neutral-700 p-4 rounded-secondary mt-2">
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
          <p className="text-neutral-500 italic mt-2">
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
  roles: Role[];
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
    <div className="grid grid-cols-3 gap-2 mt-2">
      {operation && <input type="hidden" name={inputName} />}

      <select
        defaultValue={roleId}
        required
        className="bg-neutral-900 rounded-secondary px-4 h-11"
        onChange={(event) => setRoleId(event.target.value)}
      >
        <option disabled hidden value=""></option>
        <option value="*">Alle</option>

        {roles
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
      </select>

      <select
        required
        className="bg-neutral-900 rounded-secondary px-4 h-11"
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

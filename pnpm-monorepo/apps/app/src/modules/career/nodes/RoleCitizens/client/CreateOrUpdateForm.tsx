import { Button2 } from "@/modules/common/components/Button2";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import { Select } from "@/modules/common/components/form/Select";
import { createId } from "@paralleldrive/cuid2";
import {
  FlowNodeRoleCitizensAlignment,
  FlowNodeType,
  type Role,
} from "@sam-monorepo/database/browser";
import { useReactFlow } from "@xyflow/react";
import { useId, useState, type FormEventHandler } from "react";
import toast from "react-hot-toast";
import { useFlowContext } from "../../../components/FlowContext";
import { isUnlocked } from "../../shared/isUnlocked";
import type { AdditionalDataType } from "./additionalDataType";
import type { RoleNode } from "./Node";
import { schema } from "./schema";

interface Props {
  /** Without it, the form adds a new node */
  readonly initialData?: {
    id: string;
    backgroundColor: string;
    backgroundTransparency: number;
    roleId: Role["id"];
    roleCitizensAlignment: FlowNodeRoleCitizensAlignment;
    roleCitizensHideRole: boolean;
    showUnlocked: boolean;
  };
  readonly onDone: () => void;
}

export const CreateOrUpdateForm = ({ initialData, onDone }: Props) => {
  const { additionalData } = useFlowContext();
  const { roles, assignedRoles } = additionalData as AdditionalDataType;
  const { addNodes, updateNodeData } = useReactFlow<RoleNode>();
  const [roleId, setRoleId] = useState<Role["id"]>(
    initialData?.roleId ?? roles.at(0)?.id ?? "",
  );
  const [alignment, setAlignment] = useState<FlowNodeRoleCitizensAlignment>(
    initialData?.roleCitizensAlignment || FlowNodeRoleCitizensAlignment.CENTER,
  );
  const [hideRole, setHideRole] = useState<boolean>(
    initialData?.roleCitizensHideRole || false,
  );
  const [showUnlocked, setShowUnlocked] = useState<boolean>(
    initialData?.showUnlocked || false,
  );
  const roleInputId = useId();
  const backgroundColorInputId = useId();
  const backgroundTransparencyInputId = useId();

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const result = schema.safeParse({
      roleCitizensAlignment: formData.get("roleCitizensAlignment"),
      roleCitizensHideRole: formData.get("roleCitizensHideRole"),
      backgroundColor: formData.get("backgroundColor"),
      backgroundTransparency: formData.get("backgroundTransparency"),
      showUnlocked: formData.get("showUnlocked"),
    });

    if (!result.success) {
      toast.error(
        "Beim Speichern ist ein unerwarteter Fehler aufgetreten. Bitte versuche es später erneut.",
      );
      console.error(result.error);
      return;
    }

    const role = roles.find((candidate) => candidate.id === roleId);
    if (!role) {
      toast.error("Bitte wähle eine Rolle aus.");
      return;
    }

    const data = {
      ...result.data,
      role,
      unlocked: isUnlocked(role, assignedRoles),
    };
    if (initialData) {
      updateNodeData(initialData.id, data, { replace: true });
    } else {
      addNodes({
        id: createId(),
        type: FlowNodeType.ROLE_CITIZENS,
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
        data,
      });
    }
    onDone();
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor={roleInputId} className="mt-6 block">
        Rolle
      </label>
      <Select
        id={roleInputId}
        className="mt-2"
        value={roleId}
        onChange={(event) => setRoleId(event.target.value)}
      >
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </Select>

      <p className="mt-6">Ausrichtung</p>
      <RadioGroup
        label="Ausrichtung"
        name="roleCitizensAlignment"
        items={[
          {
            value: FlowNodeRoleCitizensAlignment.LEFT,
            label: "linksbündig",
          },
          {
            value: FlowNodeRoleCitizensAlignment.CENTER,
            label: "zentriert",
          },
          {
            value: FlowNodeRoleCitizensAlignment.RIGHT,
            label: "rechtsbündig",
          },
        ]}
        value={alignment}
        // @ts-expect-error Don't know how to fix this
        onChange={setAlignment}
        className="mt-2"
      />

      <p className="mt-6">Badge verstecken</p>
      <RadioGroup
        label="Badge verstecken"
        name="roleCitizensHideRole"
        items={[
          {
            value: "false",
            label: "nein",
          },
          {
            value: "true",
            label: "ja",
          },
        ]}
        value={hideRole ? "true" : "false"}
        onChange={(value) => setHideRole(value === "true")}
        className="mt-2"
      />

      <p className="mt-6">Dauerhaft farbig anzeigen</p>
      <RadioGroup
        label="Dauerhaft farbig anzeigen"
        name="showUnlocked"
        items={[
          {
            value: "false",
            label: "nein",
          },
          {
            value: "true",
            label: "ja",
          },
        ]}
        value={showUnlocked ? "true" : "false"}
        onChange={(value) => setShowUnlocked(value === "true")}
        className="mt-2"
      />

      <label htmlFor={backgroundColorInputId} className="mt-6 block">
        Hintergrundfarbe
      </label>
      <div className="mt-2 flex items-center gap-4">
        <input
          type="color"
          name="backgroundColor"
          id={backgroundColorInputId}
          defaultValue={initialData?.backgroundColor || "#262626"}
        />

        <div className="flex items-baseline gap-1">
          <Select
            name="backgroundTransparency"
            id={backgroundTransparencyInputId}
            defaultValue={initialData?.backgroundTransparency.toString() || "0"}
          >
            <option value="0">0%</option>
            <option value="0.25">25%</option>
            <option value="0.5">50%</option>
            <option value="0.75">75%</option>
            <option value="1">100%</option>
          </Select>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button2 type="submit">Speichern</Button2>
      </div>
    </form>
  );
};

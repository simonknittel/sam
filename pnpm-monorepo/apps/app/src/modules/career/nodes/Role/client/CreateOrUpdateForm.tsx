import { Button2 } from "@/modules/common/components/Button2";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import { Select } from "@/modules/common/components/form/Select";
import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
import { createId } from "@paralleldrive/cuid2";
import {
  FlowNodeRoleImage,
  FlowNodeType,
  type Role,
} from "@sam-monorepo/database/browser";
import { useReactFlow } from "@xyflow/react";
import Image from "next/image";
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
    roleImage: FlowNodeRoleImage;
    showUnlocked?: boolean;
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
  const [roleImage, setRoleImage] = useState<keyof typeof FlowNodeRoleImage>(
    initialData?.roleImage || FlowNodeRoleImage.ICON,
  );
  const [showUnlocked, setShowUnlocked] = useState<boolean>(
    initialData?.showUnlocked || false,
  );
  const roleInputId = useId();
  const backgroundColorInputId = useId();
  const backgroundTransparencyInputId = useId();

  const role = roles.find((candidate) => candidate.id === roleId);

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const result = schema.safeParse({
      roleImage: formData.get("roleImage"),
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
        type: FlowNodeType.ROLE,
        position: { x: 0, y: 0 },
        width: data.roleImage === FlowNodeRoleImage.THUMBNAIL ? 178 : 100,
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

      <p className="mt-6">Bild</p>
      <RadioGroup
        label="Bild"
        name="roleImage"
        items={[
          {
            value: FlowNodeRoleImage.ICON,
            label: "Icon",
          },
          {
            value: FlowNodeRoleImage.THUMBNAIL,
            label: "Thumbnail",
          },
        ]}
        value={roleImage}
        // @ts-expect-error Don't know how to fix this
        onChange={setRoleImage}
        className="mt-2"
      />
      {roleImage === FlowNodeRoleImage.ICON && role?.icon && (
        <Image
          src={getPublicUploadUrl(role.icon.id)}
          alt=""
          width={128}
          height={128}
          className="mt-2 size-32 rounded-secondary border border-neutral-700 object-contain object-center"
          unoptimized={["image/svg+xml", "image/gif"].includes(
            role.icon.mimeType,
          )}
        />
      )}
      {roleImage === FlowNodeRoleImage.THUMBNAIL && role?.thumbnail && (
        <Image
          src={getPublicUploadUrl(role.thumbnail.id)}
          alt=""
          width={228}
          height={128}
          className="mt-2 h-32 w-57 rounded-secondary border border-neutral-700 object-contain object-center"
          unoptimized={["image/svg+xml", "image/gif"].includes(
            role.thumbnail.mimeType,
          )}
        />
      )}

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
            defaultValue={initialData?.backgroundTransparency.toString() || "1"}
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

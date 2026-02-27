import { env } from "@/env";
import { Button2 } from "@/modules/common/components/Button2";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import { Select } from "@/modules/common/components/form/Select";
import { createId } from "@paralleldrive/cuid2";
import { FlowNodeRoleImage, FlowNodeType, type Role } from "@prisma/client";
import { applyNodeChanges } from "@xyflow/react";
import Image from "next/image";
import { useId, useState, type FormEventHandler } from "react";
import toast from "react-hot-toast";
import { useFlowContext } from "../../../components/FlowContext";
import type { AdditionalDataType } from "./additionalDataType";
import { schema } from "./schema";

interface Props {
  readonly initialData?: {
    id: string;
    backgroundColor: string;
    backgroundTransparency: number;
    roleId: Role["id"];
    roleImage: FlowNodeRoleImage;
    showUnlocked?: boolean;
  };
  onUpdate?: FormEventHandler<HTMLFormElement>;
}

export const CreateOrUpdateForm = ({ initialData, onUpdate }: Props) => {
  const { setIsCreateNodeModalOpen, setUnsaved, setNodes, additionalData } =
    useFlowContext();
  const [roleId, setRoleId] = useState<Role["id"]>(
    initialData?.roleId || (additionalData as AdditionalDataType).roles[0].id,
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

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    setIsCreateNodeModalOpen(false);

    const formData = new FormData(event.currentTarget);
    const result = schema.safeParse({
      id: formData.get("id"),
      roleId: formData.get("roleId"),
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

    setUnsaved(true);

    setNodes((nds) => {
      const data = result.data;
      const role = (additionalData as AdditionalDataType).roles.find(
        (role) => role.id === data.roleId,
      );

      return applyNodeChanges(
        [
          {
            type: "add",
            item: {
              id: data.id,
              type: FlowNodeType.ROLE,
              position: {
                x: 0,
                y: 0,
              },
              width: data.roleImage === FlowNodeRoleImage.THUMBNAIL ? 178 : 100,
              height: 100,
              data: {
                role,
                roleImage: data.roleImage,
                backgroundColor: data.backgroundColor,
                backgroundTransparency: data.backgroundTransparency,
                showUnlocked: data.showUnlocked,
              },
            },
          },
        ],
        nds,
      );
    });
  };

  const role = (additionalData as AdditionalDataType).roles.find(
    (role) => role.id === roleId,
  );

  return (
    <form onSubmit={initialData ? onUpdate : handleSubmit}>
      <input
        name="id"
        type="hidden"
        defaultValue={initialData?.id || createId()}
      />
      <input name="nodeType" type="hidden" value={FlowNodeType.ROLE} />

      <label htmlFor={roleInputId} className="mt-6 block">
        Rolle
      </label>
      <Select
        name="roleId"
        className="mt-2"
        value={roleId}
        onChange={(e) => setRoleId(e.target.value)}
      >
        {(additionalData as AdditionalDataType).roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </Select>

      <p className="mt-6">Bild</p>
      <RadioGroup
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
          src={`https://${env.NEXT_PUBLIC_S3_PUBLIC_URL}/${role.icon.id}`}
          alt=""
          width={128}
          height={128}
          className="mt-2 size-32 border border-neutral-700 rounded-secondary object-contain object-center"
          unoptimized={["image/svg+xml", "image/gif"].includes(
            role.icon.mimeType,
          )}
        />
      )}
      {roleImage === FlowNodeRoleImage.THUMBNAIL && role?.thumbnail && (
        <Image
          src={`https://${env.NEXT_PUBLIC_S3_PUBLIC_URL}/${role.thumbnail.id}`}
          alt=""
          width={228}
          height={128}
          className="mt-2 w-[228px] h-32 border border-neutral-700 rounded-secondary object-contain object-center"
          unoptimized={["image/svg+xml", "image/gif"].includes(
            role.thumbnail.mimeType,
          )}
        />
      )}

      <p className="mt-6">Dauerhaft farbig anzeigen</p>
      <RadioGroup
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
      <div className="flex gap-4 items-center mt-2">
        <input
          type="color"
          name="backgroundColor"
          id={backgroundColorInputId}
          defaultValue={initialData?.backgroundColor || "#262626"}
        />

        <div className="flex gap-1 items-baseline">
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

      <div className="flex justify-end mt-8">
        <Button2 type="submit">Speichern</Button2>
      </div>
    </form>
  );
};

import {
  FlowNodeMarkdownPosition,
  FlowNodeType,
} from "@/generated/prisma/browser";
import { Button2 } from "@/modules/common/components/Button2";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import { Select } from "@/modules/common/components/form/Select";
import { createId } from "@paralleldrive/cuid2";
import { applyNodeChanges } from "@xyflow/react";
import { useId, useState, type FormEventHandler } from "react";
import toast from "react-hot-toast";
import { useFlowContext } from "../../../components/FlowContext";
import { schema } from "./schema";

interface Props {
  readonly initialData?: {
    id: string;
    backgroundColor: string;
    backgroundTransparency: number;
    markdown: string;
    markdownPosition: FlowNodeMarkdownPosition;
  };
  onUpdate?: FormEventHandler<HTMLFormElement>;
}

export const CreateOrUpdateForm = ({ initialData, onUpdate }: Props) => {
  const { setIsCreateNodeModalOpen, setUnsaved, setNodes } = useFlowContext();
  const [markdownPosition, setMarkdownPosition] = useState<
    keyof typeof FlowNodeMarkdownPosition
  >(initialData?.markdownPosition || FlowNodeMarkdownPosition.LEFT);
  const markdownInputId = useId();
  const backgroundColorInputId = useId();
  const backgroundTransparencyInputId = useId();

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    setIsCreateNodeModalOpen(false);

    const formData = new FormData(event.currentTarget);
    const result = schema.safeParse({
      id: formData.get("id"),
      markdown: formData.get("markdown"),
      markdownPosition: formData.get("markdownPosition"),
      backgroundColor: formData.get("backgroundColor"),
      backgroundTransparency: formData.get("backgroundTransparency"),
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

      return applyNodeChanges(
        [
          {
            type: "add",
            item: {
              id: data.id,
              type: FlowNodeType.MARKDOWN,
              position: {
                x: 0,
                y: 0,
              },
              width: 178,
              height: 316,
              data: {
                markdown: data.markdown,
                markdownPosition: data.markdownPosition,
                backgroundColor: data.backgroundColor,
                backgroundTransparency: data.backgroundTransparency,
              },
            },
          },
        ],
        nds,
      );
    });
  };

  return (
    <form onSubmit={initialData ? onUpdate : handleSubmit}>
      <input
        name="id"
        type="hidden"
        defaultValue={initialData?.id || createId()}
      />
      <input name="nodeType" type="hidden" value={FlowNodeType.MARKDOWN} />

      <label htmlFor={markdownInputId} className="mt-6 block">
        Markdown
      </label>
      <textarea
        id={markdownInputId}
        name="markdown"
        className="mt-2 w-full h-64 p-2 rounded-l bg-neutral-900"
        defaultValue={initialData?.markdown}
      ></textarea>

      <p className="mt-6">Position</p>
      <RadioGroup
        name="markdownPosition"
        items={[
          {
            value: FlowNodeMarkdownPosition.LEFT,
            label: "linksbündig",
          },
          {
            value: FlowNodeMarkdownPosition.CENTER,
            label: "zentriert",
          },
          {
            value: FlowNodeMarkdownPosition.RIGHT,
            label: "rechtsbündig",
          },
        ]}
        value={markdownPosition}
        // @ts-expect-error Don't know how to fix this
        onChange={setMarkdownPosition}
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

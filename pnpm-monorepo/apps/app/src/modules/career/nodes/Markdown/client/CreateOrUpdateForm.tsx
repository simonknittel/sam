import { Button2 } from "@/modules/common/components/Button2";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import { Select } from "@/modules/common/components/form/Select";
import { createId } from "@paralleldrive/cuid2";
import {
  FlowNodeMarkdownPosition,
  FlowNodeType,
} from "@sam-monorepo/database/browser";
import { useReactFlow } from "@xyflow/react";
import { useId, useState, type FormEventHandler } from "react";
import toast from "react-hot-toast";
import type { Markdown } from "./Node";
import { schema } from "./schema";

interface Props {
  /** Without it, the form adds a new node */
  readonly initialData?: {
    id: string;
    backgroundColor: string;
    backgroundTransparency: number;
    markdown: string;
    markdownPosition: FlowNodeMarkdownPosition;
  };
  readonly onDone: () => void;
}

export const CreateOrUpdateForm = ({ initialData, onDone }: Props) => {
  const { addNodes, updateNodeData } = useReactFlow<Markdown>();
  const [markdownPosition, setMarkdownPosition] = useState<
    keyof typeof FlowNodeMarkdownPosition
  >(initialData?.markdownPosition || FlowNodeMarkdownPosition.LEFT);
  const markdownInputId = useId();
  const backgroundColorInputId = useId();
  const backgroundTransparencyInputId = useId();

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const result = schema.safeParse({
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

    if (initialData) {
      updateNodeData(initialData.id, result.data, { replace: true });
    } else {
      addNodes({
        id: createId(),
        type: FlowNodeType.MARKDOWN,
        position: { x: 0, y: 0 },
        width: 178,
        height: 316,
        data: result.data,
      });
    }
    onDone();
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor={markdownInputId} className="mt-6 block">
        Markdown
      </label>
      <textarea
        id={markdownInputId}
        name="markdown"
        className="mt-2 h-64 w-full rounded-l bg-neutral-900 p-2"
        defaultValue={initialData?.markdown}
      ></textarea>

      <p className="mt-6">Position</p>
      <RadioGroup
        label="Position"
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

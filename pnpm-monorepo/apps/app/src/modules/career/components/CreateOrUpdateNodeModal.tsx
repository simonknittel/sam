import Modal from "@/modules/common/components/Modal";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import { FlowNodeType } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useState, type FormEventHandler } from "react";
import { nodeDefinitions } from "../nodes/client";

interface Props {
  readonly className?: string;
  readonly onRequestClose: () => void;
  readonly initialData?: {
    id?: string;
    type?: FlowNodeType;
    [key: string]: unknown;
  };
  readonly onUpdate?: FormEventHandler<HTMLFormElement>;
}

export const CreateOrUpdateNodeModal = ({
  className,
  onRequestClose,
  initialData,
  onUpdate,
}: Props) => {
  const [nodeType, setNodeType] = useState<string>(
    initialData?.type || FlowNodeType.ROLE,
  );

  const matchingNodeDefinition = nodeDefinitions.find(
    (nodeDefinition) => nodeDefinition.enum === nodeType,
  );

  return (
    <Modal
      isOpen={true}
      onRequestClose={onRequestClose}
      className={clsx("w-120", className)}
      heading={<h2>Element {initialData ? "bearbeiten" : "hinzufügen"}</h2>}
    >
      <p>Typ</p>
      <RadioGroup
        name="nodeType"
        items={[
          {
            value: FlowNodeType.ROLE,
            label: "Rolle",
          },
          {
            value: FlowNodeType.ROLE_CITIZENS,
            label: "Citizen einer Rolle",
          },
          {
            value: FlowNodeType.MARKDOWN,
            label: "Markdown",
          },
        ]}
        value={nodeType}
        onChange={setNodeType}
        className="mt-2"
      />

      {matchingNodeDefinition && (
        <matchingNodeDefinition.CreateOrUpdateForm
          // @ts-expect-error The career node definitions are too heterogeneous for TypeScript to unify
          initialData={initialData}
          onUpdate={onUpdate}
        />
      )}
    </Modal>
  );
};

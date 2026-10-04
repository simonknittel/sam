import Modal from "@/modules/common/components/Modal";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import { FlowNodeType } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useState } from "react";
import { nodeDefinitions } from "../nodes/client";

interface Props {
  readonly className?: string;
  readonly onRequestClose: () => void;
  /** Without it, the modal adds a new node */
  readonly initialData?: {
    id: string;
    type: FlowNodeType;
    [key: string]: unknown;
  };
}

export const CreateOrUpdateNodeModal = ({
  className,
  onRequestClose,
  initialData,
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
      /**
       * In edit mode, React Flow deletes the selected node on Backspace,
       * unless the focus is in an element with the `nokey` class
       */
      className={clsx("nokey w-120", className)}
      heading={<h2>Element {initialData ? "bearbeiten" : "hinzufügen"}</h2>}
    >
      {/* An edit keeps the type, because the data of one type does not fit a different type */}
      {!initialData && (
        <>
          <p>Typ</p>
          <RadioGroup
            label="Typ"
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
        </>
      )}

      {matchingNodeDefinition && (
        <matchingNodeDefinition.CreateOrUpdateForm
          // @ts-expect-error The career node definitions are too heterogeneous for TypeScript to unify
          initialData={initialData}
          onDone={onRequestClose}
        />
      )}
    </Modal>
  );
};

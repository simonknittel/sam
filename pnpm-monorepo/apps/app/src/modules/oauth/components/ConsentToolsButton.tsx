"use client";

import Button from "@/modules/common/components/Button";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import Modal from "@/modules/common/components/Modal";
import { McpToolList } from "@/modules/mcp-settings/components/McpToolList";
import type { McpToolGroup } from "@/modules/mcp-settings/utils/getMcpToolGroups";
import { useState } from "react";
import { FaTools } from "react-icons/fa";

interface Props {
  readonly toolGroups: readonly McpToolGroup[];
  readonly disabledToolNames: ReadonlySet<string>;
  readonly onChange: (disabledToolNames: ReadonlySet<string>) => void;
}

/** Selects the tools of the new grant. Only the approval saves them. */
export const ConsentToolsButton = ({
  toolGroups,
  disabledToolNames,
  onChange,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = (toolName: string, isEnabled: boolean) => {
    const next = new Set(disabledToolNames);
    if (isEnabled) {
      next.delete(toolName);
    } else {
      next.add(toolName);
    }
    onChange(next);
  };

  return (
    <>
      <Button type="button" variant="tertiary" onClick={() => setIsOpen(true)}>
        <FaTools /> Auswählen
      </Button>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-200"
        heading={<h2>Tools auswählen</h2>}
      >
        <p className="mb-4 text-sm text-neutral-500">
          Der Client kann nur die aktiven Tools nutzen. Du kannst die Auswahl
          später in der MCP-App ändern.
        </p>

        <McpToolList
          groups={toolGroups}
          renderSwitch={(tool) => (
            <YesNoCheckbox
              hideLabel
              aria-label={tool.title}
              checked={!disabledToolNames.has(tool.name)}
              onChange={(event) => toggle(tool.name, event.target.checked)}
            />
          )}
        />
      </Modal>
    </>
  );
};

"use client";

import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import { McpToolList } from "@/modules/mcp-settings/components/McpToolList";
import { McpToolsModalButton } from "@/modules/mcp-settings/components/McpToolsModalButton";
import type { ToolCatalogGroup } from "@sam-monorepo/mcp";

interface Props {
  readonly toolGroups: readonly ToolCatalogGroup[];
  readonly disabledToolNames: ReadonlySet<string>;
  readonly onChange: (disabledToolNames: ReadonlySet<string>) => void;
}

/** Only the approval saves the selection */
export const ConsentToolsButton = ({
  toolGroups,
  disabledToolNames,
  onChange,
}: Props) => {
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
    <McpToolsModalButton
      label="Auswählen"
      ariaLabel="Tools auswählen"
      heading="Tools auswählen"
      description="Der Client kann nur die aktiven Tools nutzen. Du kannst die Auswahl später in der App KI-Agenten ändern."
    >
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
    </McpToolsModalButton>
  );
};

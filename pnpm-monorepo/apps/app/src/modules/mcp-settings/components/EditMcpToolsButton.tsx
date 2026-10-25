"use client";

import type { ToolCatalogGroup } from "@sam-monorepo/mcp";
import { McpToolList } from "./McpToolList";
import { McpToolsModalButton } from "./McpToolsModalButton";
import { McpToolSwitch } from "./McpToolSwitch";

interface Props {
  readonly className?: string;
  readonly grantId: string;
  readonly displayName: string;
  readonly clientHost: string;
  /**
   * The tools that the client can see. The rows share one object for each
   * admin mode, thus the page sends each list once.
   */
  readonly toolGroups: readonly ToolCatalogGroup[];
  readonly disabledToolNames: readonly string[];
}

/** The tools of a connected client. Each change saves at once. */
export const EditMcpToolsButton = ({
  className,
  grantId,
  displayName,
  clientHost,
  toolGroups,
  disabledToolNames,
}: Props) => {
  const disabledToolNameSet = new Set(disabledToolNames);

  return (
    <McpToolsModalButton
      className={className}
      label="Tools bearbeiten"
      ariaLabel={`Tools von ${displayName} bearbeiten`}
      heading="Tools bearbeiten"
      description={
        <>
          Jede Änderung gilt sofort für{" "}
          <span className="font-bold wrap-break-word text-neutral-50">
            {displayName}
          </span>{" "}
          <span className="break-all">({clientHost})</span>.
        </>
      }
    >
      <McpToolList
        groups={toolGroups}
        renderSwitch={(tool) => (
          <McpToolSwitch
            grantId={grantId}
            toolName={tool.name}
            toolTitle={tool.title}
            isEnabled={!disabledToolNameSet.has(tool.name)}
          />
        )}
      />
    </McpToolsModalButton>
  );
};

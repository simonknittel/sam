import type { ToolCatalogEntry, ToolCatalogGroup } from "@sam-monorepo/mcp";
import type { ReactNode } from "react";

interface Props {
  readonly groups: readonly ToolCatalogGroup[];
  readonly renderSwitch: (tool: ToolCatalogEntry) => ReactNode;
}

export const McpToolList = ({ groups, renderSwitch }: Props) => {
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <McpToolGroupSection
          key={group.group}
          group={group}
          renderSwitch={renderSwitch}
        />
      ))}
    </div>
  );
};

interface McpToolGroupSectionProps {
  readonly group: ToolCatalogGroup;
  readonly renderSwitch: Props["renderSwitch"];
}

const McpToolGroupSection = ({
  group,
  renderSwitch,
}: McpToolGroupSectionProps) => {
  return (
    <section>
      <h3 className="border-b border-white/5 pb-2 font-mono font-bold uppercase">
        {group.title}
      </h3>

      <ul className="flex flex-col divide-y divide-white/5">
        {group.tools.map((tool) => (
          <McpToolRow key={tool.name} tool={tool}>
            {renderSwitch(tool)}
          </McpToolRow>
        ))}
      </ul>
    </section>
  );
};

interface McpToolRowProps {
  readonly tool: ToolCatalogEntry;
  readonly children: ReactNode;
}

const McpToolRow = ({ tool, children }: McpToolRowProps) => {
  return (
    <li className="flex items-center gap-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h4 className="font-bold">{tool.title}</h4>
          <code className="font-mono text-xs break-all text-neutral-500">
            {tool.name}
          </code>
        </div>

        <p className="mt-1 max-w-prose text-sm text-neutral-500">
          {tool.description}
        </p>
      </div>

      <div className="flex-none">{children}</div>
    </li>
  );
};

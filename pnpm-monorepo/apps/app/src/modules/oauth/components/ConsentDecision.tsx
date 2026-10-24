"use client";

import { Button2Variant } from "@/modules/common/components/Button2";
import type { McpToolGroup } from "@/modules/mcp-settings/utils/getMcpToolGroups";
import { useState } from "react";
import { FaCheck, FaTimes } from "react-icons/fa";
import { approveAuthorization } from "../actions/approveAuthorization";
import { denyAuthorization } from "../actions/denyAuthorization";
import { ConsentCustomNameButton } from "./ConsentCustomNameButton";
import { ConsentDecisionForm } from "./ConsentDecisionForm";
import { ConsentToolsButton } from "./ConsentToolsButton";

interface Props {
  /** The validated parameters of the authorization request */
  readonly parameters: Readonly<Record<string, string>>;
  /** The name that the client gives itself */
  readonly clientName: string;
  readonly toolGroups: readonly McpToolGroup[];
}

/**
 * The settings of the new grant and the two decisions. The approval saves
 * the settings with the grant.
 */
export const ConsentDecision = ({
  parameters,
  clientName,
  toolGroups,
}: Props) => {
  const [customName, setCustomName] = useState("");
  const [disabledToolNames, setDisabledToolNames] = useState<
    ReadonlySet<string>
  >(new Set());

  const toolCount = toolGroups.reduce(
    (count, group) => count + group.tools.length,
    0,
  );

  return (
    <>
      <dl className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2 rounded-secondary bg-neutral-800/50 p-3 text-sm">
        <dt className="text-neutral-500">Name</dt>
        <dd className="min-w-0 truncate" title={customName || clientName}>
          {customName || clientName}
        </dd>
        <dd className="justify-self-end">
          <ConsentCustomNameButton
            customName={customName}
            clientName={clientName}
            onChange={setCustomName}
          />
        </dd>

        <dt className="text-neutral-500">Tools</dt>
        <dd>
          {toolCount - disabledToolNames.size} von {toolCount} aktiv
        </dd>
        <dd className="justify-self-end">
          <ConsentToolsButton
            toolGroups={toolGroups}
            disabledToolNames={disabledToolNames}
            onChange={setDisabledToolNames}
          />
        </dd>
      </dl>

      <div className="flex flex-wrap justify-end gap-2">
        <ConsentDecisionForm
          action={denyAuthorization}
          fields={parameters}
          variant={Button2Variant.Secondary}
          icon={<FaTimes />}
        >
          Ablehnen
        </ConsentDecisionForm>

        <ConsentDecisionForm
          action={approveAuthorization}
          fields={{
            ...parameters,
            custom_name: customName,
            disabled_tool_names: [...disabledToolNames],
          }}
          icon={<FaCheck />}
        >
          Erlauben
        </ConsentDecisionForm>
      </div>
    </>
  );
};

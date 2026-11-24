"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import { startTransition, useOptimistic, type ChangeEvent } from "react";
import { updateMcpToolSetting } from "../actions/updateMcpToolSetting";

interface Props {
  readonly className?: string;
  readonly grantId: string;
  readonly toolName: string;
  readonly toolTitle: string;
  readonly isEnabled: boolean;
}

export const McpToolSwitch = ({
  className,
  grantId,
  toolName,
  toolTitle,
  isEnabled,
}: Props) => {
  const [optimisticIsEnabled, setOptimisticIsEnabled] =
    useOptimistic(isEnabled);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;

    const formData = new FormData();
    formData.set("grantId", grantId);
    formData.set("toolName", toolName);
    formData.set("enabled", String(enabled));

    startTransition(async () => {
      setOptimisticIsEnabled(enabled);
      await runAction(updateMcpToolSetting, formData);
    });
  };

  return (
    <YesNoCheckbox
      className={className}
      hideLabel
      aria-label={toolTitle}
      checked={optimisticIsEnabled}
      onChange={handleChange}
    />
  );
};

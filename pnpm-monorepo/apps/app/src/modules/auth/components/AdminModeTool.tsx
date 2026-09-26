"use client";

import { runActionAndReload } from "@/modules/actions/utils/runActionAndReload";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { useTransition } from "react";
import { setAdminMode } from "../actions/setAdminMode";

interface Props {
  readonly enabled: boolean;
}

export const AdminModeTool = ({ enabled }: Props) => {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    const formData = new FormData();
    formData.set("enabled", String(!enabled));

    startTransition(() => runActionAndReload(setAdminMode, formData));
  };

  return (
    <Button2
      type="button"
      variant={enabled ? Button2Variant.Secondary : Button2Variant.Primary}
      onClick={handleClick}
      disabled={isPending}
    >
      {enabled ? "Disable" : "Enable"} admin
    </Button2>
  );
};

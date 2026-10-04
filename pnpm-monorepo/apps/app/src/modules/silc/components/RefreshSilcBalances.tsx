"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import clsx from "clsx";
import { TbRestore } from "react-icons/tb";
import { refreshSilcBalances } from "../actions/refreshSilcBalances";

interface Props {
  readonly className?: string;
}

export const RefreshSilcBalances = ({ className }: Props) => {
  const { state, formAction } = useAction(refreshSilcBalances, {
    errorToast: false,
  });

  return (
    <form action={formAction} className={clsx(className)}>
      <SubmitButton icon={<TbRestore />}>Refresh SILC balances</SubmitButton>

      <ActionErrorNote className="mt-4" state={state} />
    </form>
  );
};

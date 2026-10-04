"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import clsx from "clsx";
import { TbRestore } from "react-icons/tb";
import { expireAllSilc } from "../actions/expireAllSilc";

interface Props {
  readonly className?: string;
}

export const ExpireAllSilc = ({ className }: Props) => {
  const { state, formAction } = useAction(expireAllSilc, {
    errorToast: false,
  });

  return (
    <form action={formAction} className={clsx(className)}>
      <SubmitButton icon={<TbRestore />}>Expire all SILC</SubmitButton>

      <ActionErrorNote className="mt-4" state={state} />
    </form>
  );
};

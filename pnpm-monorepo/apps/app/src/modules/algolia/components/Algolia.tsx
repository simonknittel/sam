"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { updateIndices } from "@/modules/algolia/actions/updateIndices";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import clsx from "clsx";
import { TbRestore } from "react-icons/tb";

interface Props {
  readonly className?: string;
}

export const Algolia = ({ className }: Props) => {
  const { state, formAction, isPending } = useAction(updateIndices, {
    errorToast: false,
  });

  return (
    <form action={formAction} className={clsx(className)}>
      <Button2 type="submit" disabled={isPending}>
        {isPending ? <AsciiSpinner /> : <TbRestore />}
        Update Algolia indices
      </Button2>

      <ActionErrorNote className="mt-4" state={state} />
    </form>
  );
};

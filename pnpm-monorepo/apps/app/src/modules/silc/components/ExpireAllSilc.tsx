"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import clsx from "clsx";
import { useActionState } from "react";
import { TbRestore } from "react-icons/tb";
import { expireAllSilc } from "../actions/expireAllSilc";

interface Props {
  readonly className?: string;
}

export const ExpireAllSilc = ({ className }: Props) => {
  const [state, formAction, isPending] = useActionState(expireAllSilc, null);

  return (
    <form action={formAction} className={clsx(className)}>
      <Button2 type="submit">
        {isPending ? <AsciiSpinner /> : <TbRestore />}
        Expire all SILC
      </Button2>

      {state?.success && (
        <Note
          type="success"
          message={state.success}
          className={clsx("mt-4", {
            "animate-pulse": isPending,
          })}
        />
      )}

      {state?.error && (
        <Note
          type="error"
          message={state.error}
          className={clsx("mt-4", {
            "animate-pulse": isPending,
          })}
        />
      )}
    </form>
  );
};

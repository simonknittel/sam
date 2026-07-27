"use client";

import { Button2 } from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import clsx from "clsx";
import { useActionState } from "react";
import { FaSpinner } from "react-icons/fa";
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
        {isPending ? <FaSpinner className="animate-spin" /> : <TbRestore />}
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

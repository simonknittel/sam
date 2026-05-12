"use client";

import { SilcSettingKey, type SilcSetting } from "@/generated/prisma/browser";
import { Button2 } from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import clsx from "clsx";
import { useActionState, useId, useState } from "react";
import { FaSave, FaSpinner } from "react-icons/fa";
import { updateSilcSetting } from "../actions/updateSilcSetting";

interface Props {
  readonly className?: string;
  readonly conversionRate?: SilcSetting | null;
  readonly totalSilc: number;
}

export const AuecConversionRateSettingClient = ({
  className,
  conversionRate,
  totalSilc,
}: Props) => {
  const [state, formAction, isPending] = useActionState(
    updateSilcSetting,
    null,
  );
  const inputId = useId();
  const [value, setValue] = useState(conversionRate?.value || "");

  return (
    <form action={formAction} className={clsx(className)}>
      <input
        type="hidden"
        name="key"
        value={SilcSettingKey.AUEC_CONVERSION_RATE}
      />

      <label className="block" htmlFor={inputId}>
        Wie viel aUEC entspricht ein SILC?
      </label>
      <input
        className="p-2 rounded-secondary bg-neutral-900 border border-neutral-800 w-full mt-2 disabled:opacity-50"
        name="value"
        required
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        id={inputId}
        disabled={isPending}
        min={1}
      />

      <div className="flex items-center gap-4 mt-2">
        <div className="flex flex-col gap-1">
          <div className="text-sm text-gray-500">aUEC</div>
          {Number.parseInt(value).toLocaleString("de-de")}
        </div>

        <div className="text-sm text-gray-500">x</div>

        <div className="flex flex-col gap-1">
          <div className="text-sm text-gray-500">SILC</div>
          {totalSilc}
        </div>

        <div className="text-sm text-gray-500">=</div>

        <div className="flex flex-col gap-1">
          <div className="text-sm text-gray-500">Gesamt</div>
          <div className="font-bold">
            {(totalSilc * Number.parseInt(value || "1")).toLocaleString(
              "de-de",
            )}{" "}
            aUEC
          </div>
        </div>
      </div>

      <Button2 type="submit" className="mt-4 ml-auto">
        {isPending ? <FaSpinner className="animate-spin" /> : <FaSave />}
        Speichern
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

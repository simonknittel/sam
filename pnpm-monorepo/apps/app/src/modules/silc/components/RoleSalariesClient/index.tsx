"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import { api } from "@/trpc/react";
import { createId } from "@paralleldrive/cuid2";
import { type SilcRoleSalary } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useState } from "react";
import { FaPlus, FaSave, FaTrash } from "react-icons/fa";
import { updateRoleSalaries } from "../../actions/updateRoleSalaries";
import { RoleSelector } from "./RoleSelector";

interface Props {
  readonly className?: string;
  readonly initialSalaries: SilcRoleSalary[];
  readonly auecConversionRate: number;
}

export const RoleSalariesClient = ({
  className,
  initialSalaries,
  auecConversionRate,
}: Props) => {
  const { state, formAction, isPending } = useAction(updateRoleSalaries);

  const [salaries, setSalaries] =
    useState<
      { id: string; roleId: string | null; value: number; dayOfMonth: number }[]
    >(initialSalaries);

  const { isPending: isPendingRolesForSalaries, data } =
    api.silc.getRolesForSalaries.useQuery(undefined);

  const handleCreate = () => {
    setSalaries((prev) => [
      ...prev,
      {
        id: createId(),
        roleId: null,
        value: 1,
        dayOfMonth: 1,
      },
    ]);
  };

  const handleDelete = (id: string) => {
    setSalaries((prev) => prev.filter((salary) => salary.id !== id));
  };

  return (
    <form action={formAction} className={clsx(className)}>
      <div className="hidden grid-cols-[300px_1fr_1fr_44px] gap-2 border-b border-white/5 pb-2 font-bold md:grid">
        <div>Rolle</div>
        <div>SILC</div>
        <div>Tag im Monat</div>
      </div>

      {!isPendingRolesForSalaries && data ? (
        <>
          <div className="mt-4 flex flex-col gap-6">
            {salaries.map((salary) => (
              <div
                key={salary.id}
                className="grid grid-cols-[1fr_1fr_44px] grid-rows-3 gap-2 md:grid-cols-[300px_1fr_1fr_44px] md:grid-rows-2"
              >
                <RoleSelector
                  defaultValue={salary.roleId}
                  onChange={(roleId) => {
                    setSalaries((prev) =>
                      prev.map((s) =>
                        s.id === salary.id ? { ...s, roleId } : s,
                      ),
                    );
                  }}
                  className="col-span-3 md:col-span-1"
                />

                <input
                  name="value[]"
                  aria-label="SILC"
                  value={salary.value}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    setSalaries((prev) =>
                      prev.map((s) =>
                        s.id === salary.id ? { ...s, value: newValue } : s,
                      ),
                    );
                  }}
                  required
                  className="w-full rounded-secondary border border-neutral-800 bg-neutral-900 p-2"
                />

                <input
                  name="dayOfMonth[]"
                  aria-label="Tag im Monat"
                  value={salary.dayOfMonth}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    setSalaries((prev) =>
                      prev.map((s) =>
                        s.id === salary.id ? { ...s, dayOfMonth: newValue } : s,
                      ),
                    );
                  }}
                  required
                  className="w-full rounded-secondary border border-neutral-800 bg-neutral-900 p-2"
                />

                <Button
                  type="button"
                  onClick={() => handleDelete(salary.id)}
                  variant="secondary"
                  iconOnly
                  className="flex-none"
                >
                  <FaTrash />
                </Button>

                <div className="col-span-full flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="text-sm text-gray-500">Citizen</div>
                    {data.find((role) => role.role.id === salary.roleId)
                      ?.citizenCount || 0}
                  </div>

                  <div className="text-sm text-gray-500">x</div>

                  <div className="flex flex-col gap-1">
                    <div className="text-sm text-gray-500">SILC</div>
                    {salary.value || 0}
                  </div>

                  <div className="text-sm text-gray-500">=</div>

                  <div className="flex flex-col gap-1">
                    <div className="text-sm text-gray-500">Gesamt</div>
                    <div className="font-bold">
                      {(data.find((role) => role.role.id === salary.roleId)
                        ?.citizenCount || 0) * (salary.value || 0)}{" "}
                      SILC /{" "}
                      {(
                        auecConversionRate *
                        (data.find((role) => role.role.id === salary.roleId)
                          ?.citizenCount || 0) *
                        (salary.value || 0)
                      ).toLocaleString("de-de")}{" "}
                      aUEC
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button2
            type="button"
            variant={Button2Variant.Secondary}
            onClick={handleCreate}
            className="mx-auto mt-2"
          >
            <FaPlus />
            Neu
          </Button2>
        </>
      ) : (
        <div className="mt-2 flex items-center justify-center gap-2 text-brand-red-500">
          <AsciiSpinner />
          Lädt...
        </div>
      )}

      <Button2 type="submit" className="mt-4 ml-auto">
        {isPending ? <AsciiSpinner /> : <FaSave />}
        Speichern
      </Button2>

      {state && "success" in state && (
        <Note
          type="success"
          message={state.success}
          className={clsx("mt-4", {
            "animate-pulse": isPending,
          })}
        />
      )}

      {state && "error" in state && (
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

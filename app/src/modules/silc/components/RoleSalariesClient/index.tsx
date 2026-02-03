"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import Button from "@/modules/common/components/Button";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import { api } from "@/trpc/react";
import { createId } from "@paralleldrive/cuid2";
import { type SilcRoleSalary } from "@prisma/client";
import clsx from "clsx";
import { useState } from "react";
import { FaPlus, FaSave, FaSpinner, FaTrash } from "react-icons/fa";
import { updateRoleSalaries } from "../../actions/updateRoleSalaries";
import { RoleSelector } from "./RoleSelector";
import styles from "./index.module.css";

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
    api.silc.getRolesForSalaries.useQuery(undefined, {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });

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
      <div className="grid-cols-[300px_1fr_1fr_44px] gap-2 border-b border-white/5 font-bold pb-2 hidden md:grid">
        <div>Rolle</div>
        <div>SILC</div>
        <div>Tag im Monat</div>
      </div>

      {!isPendingRolesForSalaries && data ? (
        <>
          <div className="flex flex-col gap-6 mt-4">
            {salaries.map((salary) => (
              <div key={salary.id} className={clsx("grid gap-2", styles.grid)}>
                <RoleSelector
                  defaultValue={salary.roleId}
                  onChange={(roleId) => {
                    setSalaries((prev) =>
                      prev.map((s) =>
                        s.id === salary.id ? { ...s, roleId } : s,
                      ),
                    );
                  }}
                  style={{ gridArea: "role" }}
                />

                <input
                  name="value[]"
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
                  className="p-2 rounded-secondary bg-neutral-900 border border-neutral-800 w-full"
                  style={{
                    gridArea: "value",
                  }}
                />

                <input
                  name="dayOfMonth[]"
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
                  className="p-2 rounded-secondary bg-neutral-900 border border-neutral-800 w-full"
                  style={{
                    gridArea: "dayOfMonth",
                  }}
                />

                <Button
                  type="button"
                  onClick={() => handleDelete(salary.id)}
                  variant="secondary"
                  iconOnly
                  className="flex-none"
                  style={{
                    gridArea: "delete",
                  }}
                >
                  <FaTrash />
                </Button>

                <div
                  className="flex items-center gap-4"
                  style={{ gridArea: "summary" }}
                >
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
        <div className="flex items-center gap-2 justify-center text-brand-red-500 mt-2">
          <FaSpinner className="animate-spin" />
          Lädt...
        </div>
      )}

      <Button2 type="submit" className="mt-4 ml-auto">
        {isPending ? <FaSpinner className="animate-spin" /> : <FaSave />}
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

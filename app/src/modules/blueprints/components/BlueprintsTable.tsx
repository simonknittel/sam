"use client";

import { Link } from "@/modules/common/components/Link";
import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
import { FaPlus, FaRegCheckCircle, FaTimes } from "react-icons/fa";
import { FaRegCircleXmark } from "react-icons/fa6";
import { toggleBlueprintUnlockAction } from "../actions/toggleBlueprintUnlock";
import type { BlueprintRow } from "../queries/getBlueprints";

const TABLE_MIN_WIDTH = "min-w-140";
const GRID_COLS = "grid-cols-[minmax(256px,1fr)_150px_150px_150px]";

interface Props {
  readonly className?: string;
  readonly blueprints: BlueprintRow[];
}

export const BlueprintsTable = ({ className, blueprints }: Props) => {
  return (
    <Table className={className} tableClassName={TABLE_MIN_WIDTH}>
      <THead className={GRID_COLS}>
        <th>Name</th>
        <th>Freischaltungen</th>
        <th className="text-center">Mein Status</th>
        <th className="sr-only">Aktionen</th>
      </THead>

      <TBody>
        {blueprints.map((blueprint) => (
          <TRow key={blueprint.id} className={GRID_COLS}>
            <td>
              <Link
                href={`/app/blueprints/${blueprint.id}`}
                className="text-interaction-500 hover:bg-white/10 focus-visible:bg-white/10 rounded-secondary block p-2"
              >
                {blueprint.itemName}
              </Link>
            </td>

            <td>{blueprint.unlockCount || null}</td>

            <td className="text-center">
              {blueprint.isUnlocked ? (
                <FaRegCheckCircle
                  title="Freigeschaltet"
                  className="inline-block text-green-500"
                />
              ) : (
                <FaRegCircleXmark
                  title="Nicht freigeschaltet"
                  className="inline-block text-brand-red-500"
                />
              )}
            </td>

            <td>
              <form action={toggleBlueprintUnlockAction}>
                <input type="hidden" name="blueprintId" value={blueprint.id} />
                <button
                  type="submit"
                  className={`inline-flex items-center gap-1 rounded px-2 py-1 text-sm transition-colors ${
                    blueprint.isUnlocked
                      ? "bg-brand-red-500/20 text-brand-red-500 hover:bg-brand-red-500/30"
                      : "bg-green-500/20 text-green-500 hover:bg-green-500/30"
                  }`}
                  aria-label={
                    blueprint.isUnlocked
                      ? `Blaupause "${blueprint.itemName}" sperren`
                      : `Blaupause "${blueprint.itemName}" freischalten`
                  }
                >
                  {blueprint.isUnlocked ? (
                    <>
                      <FaTimes /> Sperren
                    </>
                  ) : (
                    <>
                      <FaPlus /> Freischalten
                    </>
                  )}
                </button>
              </form>
            </td>
          </TRow>
        ))}
      </TBody>
    </Table>
  );
};

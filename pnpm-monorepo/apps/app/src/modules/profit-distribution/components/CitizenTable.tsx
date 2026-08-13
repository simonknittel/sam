"use client";

import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import { SortableTable } from "@/modules/common/components/SortableTable";
import { formatDate } from "@/modules/common/utils/formatDate";
import type { Entity } from "@sam-monorepo/database/browser";
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import clsx from "clsx";
import { useMemo, useState } from "react";
import type { getProfitDistributionCycleById } from "../queries/getProfitDistributionCycleById";
import { CyclePhase } from "../utils/getCurrentPhase";
import { getPayoutState, PayoutState } from "../utils/getMyPayoutStatus";
import { CitizenTableForm } from "./CitizenTableForm";

interface Row {
  readonly id: string;
  readonly citizen: Pick<Entity, "id" | "handle">;
  readonly handle: string;
  readonly silc: number;
  readonly auec: number | null;
  readonly payoutState: PayoutState;
  readonly cededAt: Date | null;
  readonly acceptedAt: Date | null;
  readonly disbursedAt: Date | null;
}

const columnHelper = createColumnHelper<Row>();

const TABLE_MIN_WIDTH = "min-w-[320px]";
const GRID_COLS = "grid-cols-[256px_56px_128px_256px_128px_128px_128px]";

interface Props {
  readonly className?: string;
  readonly cycleData: NonNullable<
    Awaited<ReturnType<typeof getProfitDistributionCycleById>>
  >;
}

export const CitizenTable = ({ className, cycleData }: Props) => {
  const rows: Row[] = useMemo(() => {
    const rtn = new Map<string, Row>();

    if (cycleData.currentPhase === CyclePhase.Collection) {
      for (const citizen of cycleData.allSilcBalances) {
        const silc = citizen.silcBalance;

        const participant = cycleData.cycle.participants.find(
          (participant) => participant.citizenId === citizen.id,
        );
        let cededAt = null;
        let acceptedAt = null;
        let disbursedAt = null;
        if (participant) {
          cededAt = participant.cededAt;
          acceptedAt = participant.acceptedAt;
          disbursedAt = participant.disbursedAt;
        }

        rtn.set(citizen.id, {
          id: citizen.id,
          citizen,
          handle: citizen.handle!,
          silc,
          auec: null,
          payoutState: PayoutState.PAYOUT_NOT_YET_STARTED,
          cededAt,
          acceptedAt,
          disbursedAt,
        });
      }
    }

    for (const participant of cycleData.cycle.participants) {
      const silc =
        (cycleData.currentPhase === CyclePhase.Collection
          ? participant.citizen.silcBalance
          : participant.silcBalanceSnapshot) || 0;

      const auec =
        silc && cycleData.auecPerSilc ? silc * cycleData.auecPerSilc : null;

      const payoutState = getPayoutState(cycleData.cycle, participant);

      if (rtn.has(participant.citizen.id)) {
        rtn.set(participant.citizen.id, {
          ...rtn.get(participant.citizen.id)!,
          silc,
          auec,
          payoutState,
          cededAt: participant.cededAt,
          acceptedAt: participant.acceptedAt,
          disbursedAt: participant.disbursedAt,
        });
        continue;
      }

      rtn.set(participant.citizen.id, {
        id: participant.citizen.id,
        citizen: participant.citizen,
        handle: participant.citizen.handle!,
        silc,
        auec,
        payoutState,
        cededAt: participant.cededAt,
        acceptedAt: participant.acceptedAt,
        disbursedAt: participant.disbursedAt,
      });
    }

    return Array.from(rtn.values());
  }, [
    cycleData.currentPhase,
    cycleData.auecPerSilc,
    cycleData.cycle,
    cycleData.allSilcBalances,
  ]);

  const [sorting, setSorting] = useState<SortingState>([
    { id: "handle", desc: false },
  ]);

  const columns = useMemo(() => {
    return [
      columnHelper.accessor("handle", {
        header: "Member",
        id: "handle",
        cell: (row) => {
          return <CitizenLink citizen={row.row.original.citizen} />;
        },
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor("silc", {
        header: "SILC",
        cell: (row) => {
          return row.getValue().toLocaleString("de");
        },
      }),
      columnHelper.accessor("auec", {
        header: "aUEC",
        cell: (row) => {
          if (!row.getValue()) return "-";
          return row.getValue()!.toLocaleString("de");
        },
      }),
      columnHelper.accessor("payoutState", {
        header: "Status",
        cell: (row) => {
          const payoutState = row.getValue();

          switch (payoutState) {
            case PayoutState.NOT_PARTICIPATING:
              return <span>-</span>;

            case PayoutState.CEDED:
              return <span>Abgetreten</span>;

            case PayoutState.PAYOUT_NOT_YET_STARTED:
              return <span>Auszahlung noch nicht gestartet</span>;

            case PayoutState.AWAITING_ACCEPTANCE:
              return (
                <span className="text-red-500">Zustimmung ausstehend</span>
              );

            case PayoutState.AWAITING_PAYOUT:
              return (
                <span className="flex flex-col">
                  <span className="text-blue-500">Auszahlung ausstehend</span>{" "}
                  <span className="text-neutral-500 text-xs">
                    (zugestimmt am {formatDate(row.row.original.acceptedAt)})
                  </span>
                </span>
              );

            case PayoutState.DISBURSED:
              return <span className="text-green-500">Ausgezahlt</span>;

            case PayoutState.EXPIRED:
              return <span className="text-blue-500">Verfallen</span>;

            case PayoutState.PAYOUT_OVERDUE:
              return <span className="text-red-500">Überfällig</span>;

            case PayoutState.UNKNOWN:
              return <span className="text-red-500">Unbekannt</span>;

            default:
              throw new Error(
                `Unknown payoutState: ${payoutState satisfies never}`,
              );
          }
        },
      }),
      columnHelper.accessor("cededAt", {
        header: () => {
          return <div className="flex-1 text-center">Abgetreten</div>;
        },
        cell: (row) => {
          return (
            <div className="flex justify-center">
              <YesNoCheckbox
                key={`ceded_${cycleData.cycle.id}_${row.row.original.citizen.id}`}
                name={`ceded_${cycleData.cycle.id}_${row.row.original.citizen.id}`}
                defaultChecked={Boolean(row.getValue())}
                disabled={
                  ![
                    CyclePhase.Collection,
                    CyclePhase.PayoutPreparation,
                  ].includes(cycleData.currentPhase)
                }
                hideLabel
              />
            </div>
          );
        },
      }),
      columnHelper.accessor("acceptedAt", {
        header: () => {
          return <div className="flex-1 text-center">Zugestimmt</div>;
        },
        cell: (row) => {
          return (
            <div className="flex justify-center">
              <YesNoCheckbox
                key={`accepted_${cycleData.cycle.id}_${row.row.original.citizen.id}`}
                name={`accepted_${cycleData.cycle.id}_${row.row.original.citizen.id}`}
                defaultChecked={Boolean(row.getValue())}
                disabled={cycleData.currentPhase !== CyclePhase.Payout}
                hideLabel
              />
            </div>
          );
        },
      }),
      columnHelper.accessor("disbursedAt", {
        header: () => {
          return <div className="flex-1 text-center">Ausgezahlt</div>;
        },
        cell: (row) => {
          return (
            <div className="flex justify-center">
              <YesNoCheckbox
                key={`disbursed_${cycleData.cycle.id}_${row.row.original.citizen.id}`}
                name={`disbursed_${cycleData.cycle.id}_${row.row.original.citizen.id}`}
                defaultChecked={Boolean(row.getValue())}
                disabled={cycleData.currentPhase !== CyclePhase.Payout}
                hideLabel
              />
            </div>
          );
        },
      }),
    ];
  }, [cycleData.currentPhase, cycleData.cycle.id]);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table's API is not React-Compiler-safe; the component simply opts out of compilation.
  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <CitizenTableForm cycleId={cycleData.cycle.id} className="overflow-x-auto">
      <SortableTable
        table={table}
        className={clsx(TABLE_MIN_WIDTH, className)}
        gridColsClassName={GRID_COLS}
        rowClassName="py-px"
      />
    </CitizenTableForm>
  );
};

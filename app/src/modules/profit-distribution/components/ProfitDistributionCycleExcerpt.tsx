import { AccordeonLink } from "@/modules/common/components/Accordeon";
import { Badge } from "@/modules/common/components/Badge";
import { Link } from "@/modules/common/components/Link";
import { formatDate } from "@/modules/common/utils/formatDate";
import clsx from "clsx";
import type { getProfitDistributionCycles } from "../queries";
import { CyclePhase } from "../utils/getCurrentPhase";
import { PayoutState } from "../utils/getMyPayoutStatus";

interface Props {
  readonly className?: string;
  readonly cycleData: Awaited<
    ReturnType<typeof getProfitDistributionCycles>
  >[number];
}

export const ProfitDistributionCycleExcerpt = ({
  className,
  cycleData,
}: Props) => {
  let myPayoutStateBadge;
  switch (cycleData.myPayoutState) {
    case PayoutState.NOT_PARTICIPATING:
      myPayoutStateBadge = (
        <Badge label="Status deiner Auszahlung" showLabel value="-" />
      );
      break;

    case PayoutState.CEDED:
      myPayoutStateBadge = (
        <Badge label="Status deiner Auszahlung" showLabel value="Abgetreten" />
      );
      break;

    case PayoutState.AWAITING_ACCEPTANCE:
      myPayoutStateBadge = (
        <Badge
          label="Status deiner Auszahlung"
          showLabel
          value="Zustimmung ausstehend"
        />
      );
      break;

    case PayoutState.AWAITING_PAYOUT:
      myPayoutStateBadge = (
        <Badge
          label="Status deiner Auszahlung"
          showLabel
          value="Auszahlung ausstehend"
        />
      );
      break;

    case PayoutState.DISBURSED:
      myPayoutStateBadge = (
        <Badge label="Status deiner Auszahlung" showLabel value="Ausgezahlt" />
      );
      break;

    case PayoutState.EXPIRED:
      myPayoutStateBadge = (
        <Badge label="Status deiner Auszahlung" showLabel value="Verfallen" />
      );
      break;

    case PayoutState.PAYOUT_OVERDUE:
      myPayoutStateBadge = (
        <Badge label="Status deiner Auszahlung" showLabel value="Überfällig" />
      );
      break;

    case PayoutState.UNKNOWN:
      myPayoutStateBadge = (
        <Badge label="Status deiner Auszahlung" showLabel value="Unbekannt" />
      );
      break;

    case PayoutState.PAYOUT_NOT_YET_STARTED:
      myPayoutStateBadge = (
        <Badge
          label="Status deiner Auszahlung"
          showLabel
          value="Auszahlung noch nicht gestartet"
        />
      );
      break;

    default:
      throw new Error(
        `Unknown cycleData.myPayoutState: ${cycleData.myPayoutState satisfies never}`,
      );
  }

  return (
    <Link
      href={`/app/sincome/${cycleData.cycle.id}`}
      className={clsx(
        "background-secondary hover:bg-neutral-800 active:bg-neutral-900 rounded-secondary flex beveled-br",
        className,
      )}
      style={{ "--bevel-size": "16px" }}
    >
      <div className="flex-1 p-2 flex flex-col gap-1">
        <h2 className="font-bold">{cycleData.cycle.title}</h2>

        <div className="flex flex-wrap gap-[2px] text-sm">
          {cycleData.currentPhase === CyclePhase.Collection && (
            <>
              <Badge label="Aktuelle Phase" showLabel value="Sammelphase" />
              <Badge
                label="Bisher von dir verdiente SILC"
                showLabel
                value={cycleData.mySilcBalance.toLocaleString("de") ?? "-"}
              />
              <Badge
                label="Endet am"
                showLabel
                value={
                  formatDate(cycleData.cycle.collectionEndedAt, "short") ?? "-"
                }
              />
            </>
          )}

          {cycleData.currentPhase === CyclePhase.PayoutPreparation && (
            <>
              <Badge
                label="Aktuelle Phase"
                showLabel
                value="Auszahlung wird vorbereitet"
              />
              <Badge
                label="Von dir verdiente SILC"
                showLabel
                value={cycleData.mySilcBalance.toLocaleString("de") ?? "-"}
              />
            </>
          )}

          {cycleData.currentPhase === CyclePhase.Payout && (
            <>
              <Badge label="Aktuelle Phase" showLabel value="Auszahlung" />
              <Badge
                label="Dein aUEC-Anteil"
                showLabel
                value={cycleData.myShare?.toLocaleString("de") ?? "-"}
              />
              {myPayoutStateBadge}
              <Badge
                label="Endet am"
                showLabel
                value={
                  formatDate(cycleData.cycle.payoutEndedAt, "short") ?? "-"
                }
              />
            </>
          )}

          {cycleData.currentPhase === CyclePhase.Completed && (
            <>
              <Badge
                label="Aktuelle Phase"
                showLabel
                value="Auszahlung abgeschlossen"
              />
              <Badge
                label="Dein aUEC-Anteil"
                showLabel
                value={cycleData.myShare?.toLocaleString("de") ?? "-"}
              />
              {myPayoutStateBadge}
              <Badge
                label="Endet am"
                showLabel
                value={
                  formatDate(cycleData.cycle.payoutEndedAt, "short") ?? "-"
                }
              />
            </>
          )}
        </div>
      </div>

      <AccordeonLink title="Details öffnen" className="flex-none" />
    </Link>
  );
};

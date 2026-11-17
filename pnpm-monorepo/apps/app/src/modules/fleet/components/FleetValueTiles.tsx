import { ScrambleIn } from "@/modules/common/components/ScrambleIn";
import { StatisticTile } from "@/modules/common/components/StatisticTile";
import { ShipAcquisitionSource } from "@sam-monorepo/database/browser";
import {
  ACQUISITION_SOURCE_LABEL,
  UNKNOWN_ACQUISITION_SOURCE_LABEL,
} from "../utils/acquisitionSourceLabel";
import type { FleetValue, SourceValue } from "../utils/fleetListMapping";
import { formatAuec, formatUsdCents } from "../utils/formatPrice";

interface ValueTileProps {
  readonly acquisitionSourceLabel: string;
  readonly value: SourceValue;
}

const ValueTile = ({ acquisitionSourceLabel, value }: ValueTileProps) => (
  <StatisticTile
    label={`Wert (Herkunft: ${acquisitionSourceLabel})`}
    secondaryValue={formatAuec(value.auec)}
  >
    <ScrambleIn
      text={formatUsdCents(value.usdCents)}
      characters="1234567890."
    />
  </StatisticTile>
);

interface Props {
  readonly value: FleetValue;
}

/**
 * The value of the filtered ships for each acquisition source, in USD and in
 * aUEC. The ships without an acquisition source get a tile only when they
 * have a value.
 */
export const FleetValueTiles = ({ value }: Props) => (
  <>
    <ValueTile
      acquisitionSourceLabel={
        ACQUISITION_SOURCE_LABEL[ShipAcquisitionSource.STORE]
      }
      value={value.store}
    />
    <ValueTile
      acquisitionSourceLabel={
        ACQUISITION_SOURCE_LABEL[ShipAcquisitionSource.IN_GAME]
      }
      value={value.inGame}
    />
    {(value.unknown.usdCents > 0 || value.unknown.auec > 0) && (
      <ValueTile
        acquisitionSourceLabel={UNKNOWN_ACQUISITION_SOURCE_LABEL}
        value={value.unknown}
      />
    )}
  </>
);

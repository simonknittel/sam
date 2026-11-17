import { Actions } from "@/modules/common/components/Actions";
import { TRow } from "@/modules/common/components/Table";
import type { SeriesVariantRow } from "@sam-monorepo/application";
import { VariantStatus } from "@sam-monorepo/database/client";
import { FaRegCheckCircle } from "react-icons/fa";
import { FaRegCircleXmark } from "react-icons/fa6";
import { formatAuec, formatUsdPrice } from "../utils/formatPrice";
import { DeleteVariantButton } from "./DeleteVariantButton";
import { UpdateVariantButton } from "./UpdateVariantButton";
import { VariantTagBadge } from "./VariantTagBadge";

interface Props {
  readonly variant: SeriesVariantRow;
}

export const VariantRow = ({ variant }: Props) => {
  return (
    <TRow>
      <td className="truncate" title={variant.name}>
        {variant.name}
      </td>

      <td className="flex min-w-0 flex-wrap gap-1">
        {variant.tags
          .toSorted((first, second) => first.key.localeCompare(second.key))
          .map((tag) => (
            <VariantTagBadge key={tag.id} tag={tag} />
          ))}
      </td>

      <td className="text-right">
        {variant.storePriceUsdCents === null
          ? "-"
          : formatUsdPrice(variant.storePriceUsdCents)}
      </td>

      <td className="text-right">
        {variant.inGamePriceAuec === null
          ? "-"
          : formatAuec(variant.inGamePriceAuec)}
      </td>

      <td className="flex justify-center">
        {variant.status === VariantStatus.FLIGHT_READY && (
          <FaRegCheckCircle title="Flight ready" />
        )}
        {variant.status === VariantStatus.NOT_FLIGHT_READY && (
          <FaRegCircleXmark
            title="Nicht flight ready"
            className="text-brand-red-500"
          />
        )}
      </td>

      <td>
        <Actions>
          <UpdateVariantButton variant={variant} />
          <DeleteVariantButton
            variant={{ id: variant.id, name: variant.name }}
            shipCount={variant._count.ships}
          />
        </Actions>
      </td>
    </TRow>
  );
};

import { Badge } from "@/modules/common/components/Badge";
import type { VariantTagBadgeItem } from "../queries/shipQuery";

interface Props {
  readonly className?: string;
  readonly tag: Pick<VariantTagBadgeItem, "key" | "value">;
}

export const VariantTagBadge = ({ className, tag }: Props) => {
  return (
    <Badge
      label={tag.key}
      value={tag.value}
      showLabel={true}
      className={className}
    />
  );
};

import type { VariantTag } from "@/generated/prisma/client";
import { Badge } from "@/modules/common/components/Badge";

interface Props {
  readonly className?: string;
  readonly tag: VariantTag;
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

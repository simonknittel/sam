import { SpynetSearchHitContent } from "@/modules/spynet/components/SpynetSearchHitContent";
import {
  getSpynetSearchHitHref,
  type SpynetSearchHit,
} from "@/modules/spynet/utils/spynetSearch";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";

interface Props {
  readonly hit: SpynetSearchHit;
  readonly onSelect?: () => void;
}

export const SpynetSearchResultEntry = ({ hit, onSelect }: Props) => {
  const router = useRouter();

  return (
    <Command.Item
      // The id keeps the value unique: two hits can show the same text
      value={hit.id}
      onSelect={() => {
        router.push(getSpynetSearchHitHref(hit));
        onSelect?.();
      }}
      className="flex flex-col gap-0!"
    >
      <SpynetSearchHitContent hit={hit} />
    </Command.Item>
  );
};

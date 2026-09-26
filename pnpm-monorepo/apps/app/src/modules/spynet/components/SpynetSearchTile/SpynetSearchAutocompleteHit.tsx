import { Link } from "@/modules/common/components/Link";
import {
  getSpynetSearchHitHref,
  type SpynetSearchHit,
} from "@/modules/spynet/utils/spynetSearch";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { SpynetSearchHitContent } from "../SpynetSearchHitContent";

interface Props {
  readonly hit: SpynetSearchHit;
}

/**
 * A real link, thus a middle click opens the hit in a new tab. Base UI clicks
 * the highlighted item on Enter, thus the link also navigates with the
 * keyboard.
 */
export const SpynetSearchAutocompleteHit = ({ hit }: Props) => {
  return (
    <Autocomplete.Item
      value={hit}
      render={<Link href={getSpynetSearchHitHref(hit)} />}
      className="flex p-2 text-white cursor-pointer hover:bg-neutral-700 data-highlighted:bg-neutral-700 active:bg-neutral-600"
    >
      <SpynetSearchHitContent hit={hit} />
    </Autocomplete.Item>
  );
};

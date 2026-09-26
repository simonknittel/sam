import {
  SpynetSearchStatus,
  useSpynetSearch,
} from "@/modules/spynet/hooks/useSpynetSearch";
import {
  SPYNET_SEARCH_QUERY_MINIMUM_LENGTH,
  type SpynetSearchHit,
} from "@/modules/spynet/utils/spynetSearch";
import { Command } from "cmdk";
import { SpynetSearchResultEntry } from "./SpynetSearchResultEntry";

/** Fewer hits than in the tile, because the dialog has less space */
const RESULT_LIMIT = 5;

interface Props {
  readonly search: string;
  readonly onSelect: () => void;
}

export const SpynetSearchPage = ({ search, onSelect }: Props) => {
  const { status, hits } = useSpynetSearch(search, RESULT_LIMIT);

  return (
    <Command.Group
      heading={
        <div className="flex items-baseline gap-2">
          Profil suchen
          <span className="text-neutral-700 text-xs">Spynet</span>
        </div>
      }
    >
      <SearchResults status={status} hits={hits} onSelect={onSelect} />
    </Command.Group>
  );
};

interface SearchResultsProps {
  readonly status: SpynetSearchStatus;
  readonly hits: readonly SpynetSearchHit[];
  readonly onSelect: () => void;
}

const SearchResults = ({ status, hits, onSelect }: SearchResultsProps) => {
  switch (status) {
    case SpynetSearchStatus.Idle:
      return (
        <Command.Item disabled>
          Mindestens {SPYNET_SEARCH_QUERY_MINIMUM_LENGTH} Zeichen eingeben
        </Command.Item>
      );

    case SpynetSearchStatus.Loading:
      return (
        <div className="motion-safe:animate-pulse rounded-secondary bg-neutral-800 h-24 mx-2" />
      );

    case SpynetSearchStatus.Error:
      return (
        <Command.Item disabled>Die Suche ist fehlgeschlagen.</Command.Item>
      );

    case SpynetSearchStatus.Success:
      if (hits.length === 0)
        return <Command.Item disabled>Keine Ergebnisse</Command.Item>;

      return hits.map((hit) => (
        <SpynetSearchResultEntry key={hit.id} hit={hit} onSelect={onSelect} />
      ));

    default:
      throw new Error(`Unknown status: ${status satisfies never}`);
  }
};

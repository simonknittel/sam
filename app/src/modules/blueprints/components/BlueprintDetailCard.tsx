import { Link } from "@/modules/common/components/Link";
import { FaCheck, FaExternalLinkAlt, FaPlus, FaTimes } from "react-icons/fa";
import { toggleBlueprintUnlockAction } from "../actions/toggleBlueprintUnlock";
import type { BlueprintDetail } from "../queries/getBlueprintDetail";

interface Props {
  readonly blueprint: BlueprintDetail;
}

export const BlueprintDetailCard = ({ blueprint }: Props) => {
  return (
    <div className="flex flex-col md:flex-row gap-0.5">
      <div className="bg-secondary rounded-primary p-4 flex flex-col md:flex-row gap-8 flex-1">
        <div>
          <h2 className="text-2xl font-bold">{blueprint.itemName}</h2>
        </div>

        <div className="border-l border-white/10 pl-8 flex flex-col gap-2">
          <div className="flex items-center gap-1 text-sm">
            {blueprint.isUnlocked ? (
              <span className="flex items-center gap-1 text-green-500">
                <FaCheck /> Freigeschaltet
              </span>
            ) : (
              <span className="flex items-center gap-1 text-white/40">
                <FaTimes /> Nicht freigeschaltet
              </span>
            )}
          </div>

          <Link
            href={`https://scmdb.net/?page=fab&fab=${blueprint.originalKey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300 flex items-center gap-1 text-sm"
          >
            SCMDB
            <FaExternalLinkAlt className="size-3" />
          </Link>

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
        </div>
      </div>

      {blueprint.itemDescription && (
        <div className="bg-secondary rounded-primary p-4 flex-1 mt-2 md:mt-0">
          <p className="whitespace-pre-wrap text-sm text-white/80">
            {blueprint.itemDescription}
          </p>
        </div>
      )}
    </div>
  );
};

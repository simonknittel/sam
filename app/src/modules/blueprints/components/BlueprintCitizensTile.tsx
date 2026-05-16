import { requireAuthentication } from "@/modules/auth/server";
import { Link } from "@/modules/common/components/Link";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import type { BlueprintDetail } from "../queries/getBlueprintDetail";
import { getBlueprintDetail } from "../queries/getBlueprintDetail";

const CITIZENS_PAGE_SIZE = 100;

interface Props {
  readonly blueprintId: string;
  readonly className?: string;
}

export const BlueprintCitizensTile = async ({
  blueprintId,
  className,
}: Props) => {
  const authentication = await requireAuthentication();
  const hasOtherBlueprintRead = await authentication.authorize(
    "otherBlueprint",
    "read",
  );

  if (!hasOtherBlueprintRead) return null;

  const blueprint = await getBlueprintDetail(blueprintId);
  if (!blueprint) return null;

  return (
    <SuspenseWithErrorBoundaryTile className={className}>
      <BlueprintCitizensTable unlocks={blueprint.unlocks} />
    </SuspenseWithErrorBoundaryTile>
  );
};

interface TableProps {
  readonly unlocks: BlueprintDetail["unlocks"];
}

const BlueprintCitizensTable = ({ unlocks }: TableProps) => {
  if (unlocks.length === 0) {
    return (
      <div className="rounded-primary bg-neutral-800/50 p-4">
        <p className="text-white/90 text-sm">
          Noch kein Citizen hat diese Blaupause freigeschaltet.
        </p>
      </div>
    );
  }

  const sortedUnlocks = [...unlocks].sort((a, b) =>
    (b.citizenHandle ?? "").localeCompare(a.citizenHandle ?? ""),
  );

  return (
    <div className="rounded-primary bg-neutral-800/50 p-4 overflow-x-auto">
      <h3 className="text-lg font-bold mb-2">
        Freigeschaltet von ({unlocks.length})
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-white/60">
            <th className="pb-2 pr-4 font-normal">Handle</th>
            <th className="pb-2 font-normal">Freigeschaltet am</th>
          </tr>
        </thead>
        <tbody>
          {sortedUnlocks.map((unlock) => (
            <tr
              key={unlock.citizenId}
              className="border-b border-white/5 hover:bg-white/5"
            >
              <td className="py-2 pr-4">
                <Link
                  href={`/app/spynet/citizen/${unlock.citizenId}`}
                  className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
                >
                  {unlock.citizenHandle ?? "Unbekannt"}
                </Link>
              </td>
              <td className="py-2">
                {unlock.createdAt.toLocaleDateString("de-DE", {
                  timeZone: "Europe/Berlin",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

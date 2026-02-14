import { Actions } from "@/modules/common/components/Actions";
import { Link } from "@/modules/common/components/Link";
import { Tile } from "@/modules/common/components/Tile";
import { type Manufacturer } from "@prisma/client";
import clsx from "clsx";
import { getSeriesByManufacturerId } from "../queries";
import { CreateSeriesButton } from "./CreateSeriesButton";
import { DeleteSeriesButton } from "./DeleteSeriesButton";

interface Props {
  readonly className?: string;
  readonly manufacturerId: Manufacturer["id"];
}

const GRID_COLS = "grid-cols-[128px_1fr_44px]";

export const SeriesTile = async ({ className, manufacturerId }: Props) => {
  const series = await getSeriesByManufacturerId(manufacturerId);

  return (
    <Tile
      heading="Serien"
      cta={<CreateSeriesButton manufacturerId={manufacturerId} />}
      className={clsx(className)}
      childrenClassName="overflow-auto"
    >
      <table className="w-full min-w-[320px]">
        <thead>
          <tr
            className={clsx(
              "grid items-center gap-4 text-left text-neutral-500",
              GRID_COLS,
            )}
          >
            <th>Name</th>

            <th>Varianten</th>
          </tr>
        </thead>

        <tbody>
          {series.map((row) => {
            return (
              <tr
                key={row.id}
                className={clsx(
                  "grid items-center gap-4 px-2 h-14 rounded-secondary -mx-2 first:mt-2",
                  GRID_COLS,
                )}
              >
                <td className="truncate" title={row.name}>
                  <Link
                    href={`/app/fleet/settings/manufacturer/${manufacturerId}/series/${row.id}`}
                    className="text-brand-red-500 hover:text-brand-red-300"
                    prefetch={false}
                  >
                    {row.name}
                  </Link>
                </td>

                <td className="line-clamp-2">
                  {row.variants.map((variant) => variant.name).join(", ")}
                </td>

                <td>
                  <Actions>
                    <DeleteSeriesButton series={row} />
                  </Actions>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Tile>
  );
};

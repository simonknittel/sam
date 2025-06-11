import { Link } from "@/common/components/Link";
import { env } from "@/env";
import clsx from "clsx";
import Image from "next/image";
import { getRoles } from "../queries";

const GRID_COLS = "grid-cols-[1fr_128px]";

interface Props {
  readonly className?: string;
}

export const RolesTile = async ({ className }: Props) => {
  const roles = await getRoles(true);

  return (
    <section
      className={clsx(
        "p-4 lg:p-8 rounded-primary bg-neutral-800/50 overflow-hidden",
        className,
      )}
    >
      <table className="w-full">
        <thead>
          <tr
            className={clsx(
              "grid items-center gap-4 text-left text-neutral-500 -mx-2",
              GRID_COLS,
            )}
          >
            <th className="px-2">Rolle</th>
            <th className="px-2">Vererbungen</th>
          </tr>
        </thead>

        <tbody>
          {roles.map((role) => (
            <tr
              key={role.id}
              className={clsx("grid items-center gap-4 -mx-2", GRID_COLS)}
            >
              <td className="h-14 overflow-hidden">
                <Link
                  href={`/app/roles/${role.id}`}
                  className="flex items-center gap-2 hover:bg-neutral-800 px-2 rounded-secondary h-full"
                  prefetch={false}
                >
                  {role.icon ? (
                    <div className="aspect-square size-8 flex items-center justify-center rounded-secondary overflow-hidden flex-none">
                      <Image
                        src={`https://${env.NEXT_PUBLIC_R2_PUBLIC_URL}/${role.icon.id}`}
                        alt=""
                        width={32}
                        height={32}
                        className="max-w-full max-h-full"
                        unoptimized={["image/svg+xml", "image/gif"].includes(
                          role.icon.mimeType,
                        )}
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="size-8 flex-none" />
                  )}

                  <p className="font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                    {role.name}
                  </p>
                </Link>
              </td>

              <td className="h-14">
                <Link
                  href={`/app/roles/${role.id}/inheritance`}
                  className="flex items-center gap-2 hover:bg-neutral-800 px-2 rounded-secondary h-full"
                  prefetch={false}
                >
                  {role.inherits.length > 0 ? role.inherits.length : "-"}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {roles.length <= 0 && (
        <p className="text-neutral-500 italic">Keine Rollen vorhanden</p>
      )}
    </section>
  );
};

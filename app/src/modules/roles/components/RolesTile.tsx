import { env } from "@/env";
import { Link } from "@/modules/common/components/Link";
import clsx from "clsx";
import Image from "next/image";
import { getRoles } from "../queries";

// const GRID_COLS = "grid-cols-[1fr_128px_128px_128px_72px_80px]";
const GRID_COLS = "grid-cols-[1fr_128px_128px_80px]";

interface Props {
  readonly className?: string;
}

export const RolesTile = async ({ className }: Props) => {
  const roles = await getRoles(true);

  return (
    <section
      className={clsx(
        "p-4 background-secondary rounded-primary overflow-auto",
        className,
      )}
    >
      <table className="w-full min-w-[850px]">
        <thead>
          <tr
            className={clsx(
              "grid items-center gap-4 text-left text-neutral-500 -mx-2",
              GRID_COLS,
            )}
          >
            <th className="px-2">Rolle</th>
            <th className="px-2 text-center">Vererbungen</th>
            <th className="px-2 text-center">Entfernt nach</th>
            {/* <th className="px-2 text-center">Inaktiv nach</th>
            <th className="px-2 text-center">Level</th> */}
            <th className="px-2 text-center">Citizen</th>
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

                  <p className="font-bold truncate">{role.name}</p>
                </Link>
              </td>

              <td className="h-14">
                <Link
                  href={`/app/roles/${role.id}/inheritance`}
                  className="flex items-center justify-center gap-2 hover:bg-neutral-800 px-2 rounded-secondary h-full"
                  prefetch={false}
                >
                  {role.inherits.length > 0 ? role.inherits.length : null}
                </Link>
              </td>

              <td className="flex items-center justify-center h-14">
                {role.maxAgeDays}
              </td>

              {/* <td className="flex items-center justify-center h-14">
                {role.inactivityThreshold}
              </td>

              <td className="flex items-center justify-center h-14">
                {role.maxLevel}
              </td> */}

              <td className="h-14">
                <Link
                  href={`/app/spynet/citizen?filters=role-${role.id}`}
                  className="flex items-center justify-center gap-2 hover:bg-neutral-800 px-2 rounded-secondary h-full"
                  prefetch={false}
                >
                  {role.assignments.length > 0 ? role.assignments.length : null}
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

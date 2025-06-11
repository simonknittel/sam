import { authenticatePage } from "@/auth/server";
import { Hero } from "@/common/components/Hero";
import { getLeaderboard } from "@/leaderboards/queries";
import clsx from "clsx";
import { type Metadata } from "next";

const GRID_COLS = "grid-cols-[68px_1fr]";

export const metadata: Metadata = {
  title: "Leaderboards | S.A.M. - Sinister Incorporated",
};

export default async function Page() {
  const authentication = await authenticatePage("/app/leaderboards");
  await authentication.authorizePage("leaderboards", "read");

  const leaderboard = await getLeaderboard("SB", "47", 15);

  return (
    <main className="p-4 pb-20 lg:p-8">
      <div className="flex justify-center">
        <Hero text="Leaderboards" withGlitch />
      </div>

      <section className="bg-neutral-800/50 rounded-primary p-4 lg:p-8 mt-8 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr
              className={clsx(
                "grid items-center gap-4 text-left text-neutral-500",
                GRID_COLS,
              )}
            >
              <th className="text-center">Rank</th>
              <th className="px-2">Citizen</th>
            </tr>
          </thead>

          <tbody>
            {leaderboard.map((citizen) => (
              <tr
                key={citizen.nickname}
                className={clsx("grid items-center gap-4", GRID_COLS)}
              >
                <td className="h-14 flex items-center justify-center">
                  {citizen.rank}
                </td>

                <td className="h-14 flex items-center px-2 overflow-hidden text-ellipsis whitespace-nowrap">
                  {/* <Link
                    href={`/app/spynet/citizen/${}`}
                    prefetch={false}
                    className="flex items-center gap-2 text-sinister-red-500 hover:bg-neutral-800 px-2 rounded-secondary h-full overflow-hidden text-ellipsis whitespace-nowrap"
                  > */}
                  {citizen.displayname}
                  {/* </Link> */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

import { requireAuthenticationPage } from "@/modules/auth/server";
import { Hero } from "@/modules/common/components/Hero";
import { MainContent } from "@/modules/common/components/layouts/MainContent";
import { getLeaderboard } from "@/modules/leaderboards/queries/getLeaderboard";
import clsx from "clsx";
import { type Metadata } from "next";

const GRID_COLS = "grid-cols-[68px_1fr]";

export const metadata: Metadata = {
  title: "Leaderboards",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage("/app/leaderboards");
  await authentication.authorizePage("leaderboards", "read");

  const leaderboard = await getLeaderboard("SB", "47", 15);

  return (
    <MainContent className="p-4 pb-20 lg:p-6">
      <div className="flex justify-center">
        <Hero text="Leaderboards" withGlitch size="md" />
      </div>

      <section className="mt-6 overflow-hidden rounded-primary bg-neutral-800/50 p-4 lg:p-6">
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
                <td className="flex h-14 items-center justify-center">
                  {citizen.rank}
                </td>

                <td className="flex h-14 items-center truncate px-2">
                  {citizen.displayname}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </MainContent>
  );
}

import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import { GameLoader } from "@/modules/dogfight-trainer/components/GameLoader";
import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Dogfight Trainer",
};

export default async function Page() {
  if (!(await getUnleashFlag(UNLEASH_FLAG.EnableCareBearShooter)))
    redirect("/");

  return (
    <main className="min-h-dvh background-primary flex items-center justify-center relative">
      <Suspense fallback={<>Loading ...</>}>
        <GameLoader />
      </Suspense>
    </main>
  );
}
